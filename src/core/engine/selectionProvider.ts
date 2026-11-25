// Where Suggest and Polish candidates come from. Text only leaves the Mac when the user has
// chosen Cloud API; "local" never calls out, and Ollama is only used on this machine.
import { AppSettings } from '../../types/database';
import { RewriteGoal, RewriteLength, RewriteTone } from '../../types/suggestions';
import { rewriteSelectedPassage } from './aiRewriter';
import { FILLER_REWRITE_LABELS, generateLocalRewrites } from './localRewriter';
import { applyRelativeEdits, Candidate, Dialect, Edit } from './selectionEdit';

export interface SelectionRequest {
  kind: 'suggest' | 'polish';
  text: string;
  paragraph: string;
  tone: RewriteTone;
  length: RewriteLength;
  goal: RewriteGoal;
  dialect: Dialect;
  /** Learned and ignored words that appear in the text. */
  terms: string[];
  /** Native-checker fixes inside the selection, with offsets relative to `text`. */
  issueEdits: Edit[];
}

export interface SelectionCandidates {
  candidates: Candidate[];
  isAi: boolean;
  notice?: string;
}

export function isLoopbackUrl(url: string | undefined): boolean {
  try {
    return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(new URL(url || 'http://localhost').hostname);
  } catch {
    return false;
  }
}

/** Built-in candidates: Suggest uses the rewrite heuristics, Polish only fixes and wordiness cuts. */
function localCandidates(req: SelectionRequest): Candidate[] {
  if (req.kind === 'suggest') {
    return generateLocalRewrites('selection', req.text, req.tone, req.length)
      .filter((o) => !FILLER_REWRITE_LABELS.has(o.label))
      .map((o) => ({ label: o.label, description: o.description, text: o.rewrittenText }));
  }
  const fixed = applyRelativeEdits(req.text, req.issueEdits);
  const concise = generateLocalRewrites('selection', fixed).find((o) => o.category === 'concise');
  return [{ label: 'Polished', description: 'Built-in fixes', text: concise ? concise.rewrittenText : fixed }];
}

export async function selectionCandidates(req: SelectionRequest, settings: AppSettings): Promise<SelectionCandidates> {
  let provider = settings.provider;
  let notice: string | undefined;
  if (provider === 'ollama' && !isLoopbackUrl(settings.ollamaBaseUrl)) {
    provider = 'local';
    notice = 'Ollama is set to a server that is not on this Mac, so the built-in suggestions were used.';
  }
  if (provider === 'local') return { candidates: localCandidates(req), isAi: false, notice };

  const isOllama = provider === 'ollama';
  const res = await rewriteSelectedPassage(
    'selection',
    {
      sentenceText: req.text,
      tone: req.tone,
      length: req.length,
      goal: req.goal,
      mode: req.kind,
      context: req.paragraph,
      dialect: req.dialect,
      protectedTerms: req.terms,
    },
    {
      apiKey: isOllama ? '' : settings.openaiApiKey,
      baseUrl: isOllama ? settings.ollamaBaseUrl : settings.openaiBaseUrl,
      model: isOllama ? settings.ollamaModel : settings.openaiModel,
      provider,
    }
  );

  if (res.isAi) {
    const picked = req.kind === 'polish' ? res.options.slice(0, 1) : res.options;
    return {
      isAi: true,
      candidates: picked.map((o, i) => ({
        label: req.kind === 'polish' ? 'Polished' : `Option ${i + 1}`,
        description: o.description,
        text: o.rewrittenText,
      })),
    };
  }
  // rewriteSelectedPassage already fell back to its sentence heuristics; use selection-aware ones instead.
  return { candidates: localCandidates(req), isAi: false, notice: res.error ?? notice };
}
