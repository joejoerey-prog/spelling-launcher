import { RewriteOption, RewriteTone, RewriteLength, RewriteGoal } from '../../types/suggestions';
import { computeWordDiff } from './diff';

interface HeuristicReplacement {
  pattern: RegExp;
  replacement: string;
}

const CONCISE_REPLACEMENTS: HeuristicReplacement[] = [
  { pattern: /\bin order to\b/gi, replacement: 'to' },
  { pattern: /\bdue to the fact that\b/gi, replacement: 'because' },
  { pattern: /\bat this point in time\b/gi, replacement: 'currently' },
  { pattern: /\bat the present moment\b/gi, replacement: 'now' },
  { pattern: /\bfor the purpose of\b/gi, replacement: 'for' },
  { pattern: /\bin the event that\b/gi, replacement: 'if' },
  { pattern: /\ba large number of\b/gi, replacement: 'many' },
  { pattern: /\ba majority of\b/gi, replacement: 'most' },
  { pattern: /\bmake a decision\b/gi, replacement: 'decide' },
  { pattern: /\bconduct an investigation\b/gi, replacement: 'investigate' },
  { pattern: /\bperform an analysis of\b/gi, replacement: 'analyze' },
  { pattern: /\bhas the ability to\b/gi, replacement: 'can' },
  { pattern: /\bis able to\b/gi, replacement: 'can' },
  { pattern: /\bwith regard to\b/gi, replacement: 'regarding' },
  { pattern: /\bin spite of the fact that\b/gi, replacement: 'although' },
  { pattern: /\bit is important to note that\b/gi, replacement: 'notably,' },
  { pattern: /\bneedless to say,\s*/gi, replacement: '' },
  { pattern: /\bas a matter of fact,\s*/gi, replacement: 'in fact, ' },
];

const PROFESSIONAL_REPLACEMENTS: HeuristicReplacement[] = [
  { pattern: /\blook into\b/gi, replacement: 'examine' },
  { pattern: /\bfigure out\b/gi, replacement: 'determine' },
  { pattern: /\bget rid of\b/gi, replacement: 'eliminate' },
  { pattern: /\bset up\b/gi, replacement: 'establish' },
  { pattern: /\bdeal with\b/gi, replacement: 'address' },
  { pattern: /\bfind out\b/gi, replacement: 'ascertain' },
  { pattern: /\bput off\b/gi, replacement: 'defer' },
  { pattern: /\bgive up\b/gi, replacement: 'relinquish' },
  { pattern: /\bbig\b/gi, replacement: 'substantial' },
  { pattern: /\bgood\b/gi, replacement: 'effective' },
  { pattern: /\bbad\b/gi, replacement: 'adverse' },
  { pattern: /\ba lot of\b/gi, replacement: 'considerable' },
  { pattern: /\bkind of\b/gi, replacement: 'somewhat' },
];

const CASUAL_REPLACEMENTS: HeuristicReplacement[] = [
  { pattern: /\butilize\b/gi, replacement: 'use' },
  { pattern: /\bterminate\b/gi, replacement: 'end' },
  { pattern: /\bcommence\b/gi, replacement: 'start' },
  { pattern: /\bfacilitate\b/gi, replacement: 'help' },
  { pattern: /\bdemonstrate\b/gi, replacement: 'show' },
  { pattern: /\bsubsequently\b/gi, replacement: 'then' },
  { pattern: /\bnevertheless\b/gi, replacement: 'still' },
  { pattern: /\bdo not\b/gi, replacement: "don't" },
  { pattern: /\bcannot\b/gi, replacement: "can't" },
  { pattern: /\bit is\b/gi, replacement: "it's" },
  { pattern: /\bthat is\b/gi, replacement: "that's" },
  { pattern: /\bwe are\b/gi, replacement: "we're" },
  { pattern: /\bthey are\b/gi, replacement: "they're" },
];

const CONFIDENT_REPLACEMENTS: HeuristicReplacement[] = [
  { pattern: /\bI think (that\s*)?/gi, replacement: '' },
  { pattern: /\bI believe (that\s*)?/gi, replacement: '' },
  { pattern: /\bin my opinion,?\s*/gi, replacement: '' },
  { pattern: /\bperhaps\b/gi, replacement: 'clearly' },
  { pattern: /\bmaybe\b/gi, replacement: 'readily' },
  { pattern: /\bsomewhat\b/gi, replacement: '' },
  { pattern: /\bto some extent\b/gi, replacement: '' },
  { pattern: /\bit seems to me that\b/gi, replacement: '' },
  { pattern: /\bwe could possibly\b/gi, replacement: 'we will' },
];

/**
 * Applies a list of heuristic replacements to text.
 */
function applyReplacements(text: string, replacements: HeuristicReplacement[]): string {
  let result = text;
  for (const { pattern, replacement } of replacements) {
    result = result.replace(pattern, replacement);
  }
  result = result.replace(/\s{2,}/g, ' ').trim();
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }
  return result;
}

/**
 * Attempts to convert a passive voice sentence to active voice.
 */
function convertPassiveToActive(text: string): string | null {
  const byMatch = text.match(/^(The|A|An)\s+([a-zA-Z\s]+?)\s+(was|were|is|are)\s+([a-zA-Z]+(?:ed|en|t))\s+by\s+([a-zA-Z\s]+?)([.,!?]?)$/i);
  if (byMatch) {
    const origDet = byMatch[1].toLowerCase();
    const object = byMatch[2].trim();
    const verb = byMatch[4];
    const subject = byMatch[5].trim();
    const punct = byMatch[6] || '.';

    const subjectCap = subject.charAt(0).toUpperCase() + subject.slice(1);
    return `${subjectCap} ${verb} ${origDet} ${object}${punct}`;
  }

  return null;
}

/**
 * Generates rich, side-by-side local rewrite options for any sentence without needing an API key.
 */
export function generateLocalRewrites(
  sentenceId: string,
  originalText: string,
  preferredTone?: RewriteTone,
  preferredLength?: RewriteLength
): RewriteOption[] {
  const trimmed = originalText.trim();
  const options: RewriteOption[] = [];
  const seenTexts = new Set<string>([trimmed.toLowerCase()]);

  const addOption = (
    label: string,
    category: RewriteGoal,
    rewrittenText: string,
    description: string,
    tone: RewriteTone = 'natural',
    length: RewriteLength = 'same'
  ) => {
    const clean = rewrittenText.trim();
    if (!clean || seenTexts.has(clean.toLowerCase())) return;
    seenTexts.add(clean.toLowerCase());

    const diff = computeWordDiff(trimmed, clean);
    options.push({
      id: `${sentenceId}-local-${options.length}`,
      sentenceId,
      category,
      tone,
      length,
      label,
      description,
      originalText: trimmed,
      rewrittenText: clean,
      diff: diff.changes,
      confidence: 0.9,
      isAiGenerated: false,
    });
  };

  // 1. Clarity / Concise (Shorten)
  const concise = applyReplacements(trimmed, CONCISE_REPLACEMENTS);
  if (concise !== trimmed) {
    addOption(
      'Concise & Direct',
      'concise',
      concise,
      'Cuts redundant filler words and tightens phrasing.',
      'direct',
      'shorten'
    );
  }

  // 2. Active Voice
  const active = convertPassiveToActive(trimmed);
  if (active && active !== trimmed) {
    addOption(
      'Active Voice',
      'active_voice',
      active,
      'Puts the subject first for a stronger, more engaging statement.',
      'direct',
      'same'
    );
  }

  // 3. Professional Tone
  const professional = applyReplacements(trimmed, PROFESSIONAL_REPLACEMENTS);
  if (professional !== trimmed) {
    addOption(
      'Professional Polish',
      'tone',
      professional,
      'Replaces informal phrasing with articulate business vocabulary.',
      'professional',
      'same'
    );
  }

  // 4. Confident & Assertive
  const confident = applyReplacements(trimmed, CONFIDENT_REPLACEMENTS);
  if (confident !== trimmed) {
    addOption(
      'Confident & Assertive',
      'tone',
      confident,
      'Eliminates weak qualifiers and hedges for stronger conviction.',
      'confident',
      'same'
    );
  }

  // 5. Casual & Approachable
  const casual = applyReplacements(trimmed, CASUAL_REPLACEMENTS);
  if (casual !== trimmed) {
    addOption(
      'Casual & Conversational',
      'tone',
      casual,
      'Uses friendly contractions and accessible phrasing.',
      'casual',
      'same'
    );
  }

  // 6. Expand / Elaborate (Nuanced)
  if (preferredLength === 'expand' || trimmed.split(/\s+/).length < 8) {
    const withoutPunct = trimmed.replace(/[.!?]$/, '');
    const expanded = `${withoutPunct}, ensuring greater clarity and comprehensive execution.`;
    addOption(
      'Expanded & Nuanced',
      'length',
      expanded,
      'Elaborates with additional context and descriptive depth.',
      preferredTone || 'academic',
      'expand'
    );
  }

  // If no heuristic triggered significant change, provide standard fluency rephrasings
  if (options.length === 0) {
    addOption(
      'Clear & Fluid',
      'clarity',
      trimmed.replace(/\s+/g, ' '),
      'Polished for natural reading flow and clarity.',
      'natural',
      'same'
    );

    const formalPrefix = trimmed.startsWith('However') ? trimmed : `Indeed, ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
    addOption(
      'Formal Transition',
      'tone',
      formalPrefix,
      'Adds a natural transition marker for academic or formal essays.',
      'professional',
      'same'
    );
  }

  return options;
}
