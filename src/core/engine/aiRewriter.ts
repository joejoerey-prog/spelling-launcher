import { RewriteOption, RewriteRequestOptions } from '../../types/suggestions';
import { computeWordDiff } from './diff';
import { generateLocalRewrites } from './localRewriter';
import { TauriBridge } from '../bridge/tauriBridge';

export interface ApiSettings {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  provider?: 'ollama' | 'local' | 'openai' | 'anthropic';
}

/**
 * Rewrites ONLY the selected sentence.
 * Sends strictly the single sentence to the local Ollama instance or API proxy without full document context.
 * Falls back immediately to the local heuristic rewrite engine if Ollama is unreachable.
 */
export async function rewriteSelectedPassage(
  sentenceId: string,
  options: RewriteRequestOptions,
  settings: ApiSettings = {}
): Promise<{ options: RewriteOption[]; error?: string; isAi: boolean }> {
  const sentenceText = options.sentenceText.trim();
  if (!sentenceText) {
    return { options: [], isAi: false };
  }

  const provider = settings.provider || 'ollama';

  if (provider === 'local') {
    const localVariations = generateLocalRewrites(
      sentenceId,
      sentenceText,
      options.tone,
      options.length
    );
    return { options: localVariations, isAi: false };
  }

  // Determine base URL and model based on provider
  let baseUrl = 'http://localhost:11434/v1';
  let model = 'llama3.2:3b';
  let apiKey = '';

  if (provider === 'ollama') {
    baseUrl = settings.baseUrl || 'http://localhost:11434/v1';
    model = settings.model || 'llama3.2:3b';
  } else {
    baseUrl = settings.baseUrl || (import.meta.env.VITE_OPENAI_BASE_URL as string) || 'https://api.openai.com/v1';
    model = settings.model || (import.meta.env.VITE_OPENAI_MODEL as string) || 'gpt-4o-mini';
    apiKey = settings.apiKey || (import.meta.env.VITE_OPENAI_API_KEY as string) || '';
  }

  try {
    const res = await TauriBridge.rewritePassage({
      text: sentenceText,
      tone: options.tone,
      length: options.length,
      goal: options.goal,
      api_key: apiKey || undefined,
      base_url: baseUrl,
      model: model,
    });

    const rewriteOptions: RewriteOption[] = res.variations
      .filter((v) => v.trim().length > 0 && v.trim().toLowerCase() !== sentenceText.toLowerCase())
      .map((text, idx) => {
        const clean = text.trim();
        const diff = computeWordDiff(sentenceText, clean);
        return {
          id: `${sentenceId}-ollama-${idx}`,
          sentenceId,
          category: options.goal,
          tone: options.tone,
          length: options.length,
          label: `Variation ${idx + 1}`,
          description: `${res.provider} (${options.tone} tone)`,
          originalText: sentenceText,
          rewrittenText: clean,
          diff: diff.changes,
          isAiGenerated: true,
        };
      });

    if (rewriteOptions.length === 0) {
      const localVariations = generateLocalRewrites(sentenceId, sentenceText, options.tone, options.length);
      return { options: localVariations, isAi: false };
    }

    return {
      options: rewriteOptions,
      isAi: true,
    };
  } catch (err: any) {
    // Gracefully fallback to local heuristics with clear recoverable notice
    const localVariations = generateLocalRewrites(sentenceId, sentenceText, options.tone, options.length);
    return {
      options: localVariations,
      error: `Ollama Notice: ${err?.message || err}. Used local heuristic rewrite.`,
      isAi: false,
    };
  }
}
