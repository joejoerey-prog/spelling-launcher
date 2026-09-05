import { DeterministicIssue } from '../../types/suggestions';
import { SentenceNode } from '../../types/document';
import { UserRule } from '../../types/database';

// Common past participles for passive voice detection
const PAST_PARTICIPLES = new Set([
  'written', 'created', 'built', 'developed', 'conducted', 'performed', 'analyzed',
  'observed', 'determined', 'implemented', 'designed', 'tested', 'executed', 'evaluated',
  'established', 'found', 'seen', 'given', 'taken', 'made', 'done', 'shown', 'known',
  'considered', 'proven', 'introduced', 'completed', 'published', 'discovered',
  'produced', 'achieved', 'selected', 'maintained', 'identified', 'calculated', 'reported'
]);

const BE_VERBS = new Set([
  'is', 'am', 'are', 'was', 'were', 'be', 'being', 'been'
]);

interface ConfusionRule {
  pattern: RegExp;
  replacement: string;
  title: string;
  explanation: string;
}

export const LANGUAGE_TOOL_CONFUSION_RULES: ConfusionRule[] = [
  {
    pattern: /\b(have|has|had|an|the|no|any|major|significant|direct|positive|negative|side)\s+affect\b/gi,
    replacement: '$1 effect',
    title: 'Confusion: Affect vs. Effect',
    explanation: 'Did you mean "effect"? "Affect" is typically a verb (to influence), while "effect" is a noun (the result or consequence).',
  },
  {
    pattern: /\btheir\s+(is|are|was|were|has|have|will|can|could|should|would)\b/gi,
    replacement: 'there $1',
    title: 'Confusion: Their vs. There',
    explanation: 'Did you mean "there"? "Their" is possessive (their project), while "there" specifies existence or location (there is/are).',
  },
  {
    pattern: /\bthey're\s+(car|house|dog|opinion|decision|work|report|team|job|friend|family|ideas|plan|project|data|letter)\b/gi,
    replacement: 'their $1',
    title: "Confusion: They're vs. Their",
    explanation: 'Did you mean possessive "their"? "They\'re" is a contraction of "they are".',
  },
  {
    pattern: /\bthere\s+(car|house|dog|opinion|decision|work|report|team|job|friend|family|ideas|plan|project|data|letter)\b/gi,
    replacement: 'their $1',
    title: 'Confusion: There vs. Their',
    explanation: 'Did you mean possessive "their" instead of "there"?',
  },
  {
    pattern: /\bits\s+(a|an|the|not|very|going|been|clear|obvious|time|important|evident)\b/gi,
    replacement: "it's $1",
    title: "Confusion: Its vs. It's",
    explanation: 'Did you mean "it\'s" (short for "it is") instead of the possessive pronoun "its"?',
  },
  {
    pattern: /\bit's\s+(color|tail|name|surface|speed|price|size|purpose|features|quality|location|contents|meaning)\b/gi,
    replacement: 'its $1',
    title: "Confusion: It's vs. Its",
    explanation: 'Did you mean possessive "its" (without apostrophe) instead of "it\'s"?',
  },
  {
    pattern: /\b(to|will|don't|can't|might|did|does|do)\s+loose\b/gi,
    replacement: '$1 lose',
    title: 'Confusion: Loose vs. Lose',
    explanation: 'Did you mean "lose"? "Loose" is an adjective meaning not tight, while "lose" is a verb meaning to misplace or suffer a loss.',
  },
  {
    pattern: /\bloose\s+(weight|money|control|hope|faith|game|match|time)\b/gi,
    replacement: 'lose $1',
    title: 'Confusion: Loose vs. Lose',
    explanation: 'Did you mean the verb "lose"?',
  },
  {
    pattern: /\b(has|have|had|was|were)\s+lead\s+to\b/gi,
    replacement: '$1 led to',
    title: 'Irregular Verb: Lead vs. Led',
    explanation: 'The past tense and past participle of the verb "lead" is "led", not "lead".',
  },
  {
    pattern: /\b(better|worse|more|less|greater|smaller|faster|slower|earlier|later|rather|other)\s+then\b/gi,
    replacement: '$1 than',
    title: 'Comparison: Then vs. Than',
    explanation: 'Did you mean "than"? Use "than" for comparisons, and "then" for chronological sequences.',
  },
  {
    pattern: /\b(should|could|would|must|might)\s+of\b/gi,
    replacement: '$1 have',
    title: 'Grammar: Should Have vs. Should Of',
    explanation: 'Did you mean "$1 have"? "Should of" is a phonetic misspelling of "should\'ve" / "should have".',
  },
  {
    pattern: /\balot\b/gi,
    replacement: 'a lot',
    title: 'Spelling: A Lot',
    explanation: '"A lot" is always spelled as two separate words.',
  },
  {
    pattern: /\b(as a matter of|in)\s+principal\b/gi,
    replacement: '$1 principle',
    title: 'Confusion: Principal vs. Principle',
    explanation: 'Did you mean "principle" (a fundamental rule or doctrine)? "Principal" refers to a school leader or capital sum.',
  },
];

interface RedundancyRule {
  pattern: RegExp;
  replacement: string;
  title: string;
  description: string;
}

export const LANGUAGE_TOOL_REDUNDANCY_RULES: RedundancyRule[] = [
  {
    pattern: /\bclose\s+proximity\b/gi,
    replacement: 'proximity',
    title: 'Redundancy: Close Proximity',
    description: '"Proximity" already means closeness or nearness. Simplify to "proximity".',
  },
  {
    pattern: /\bend\s+result\b/gi,
    replacement: 'result',
    title: 'Redundancy: End Result',
    description: 'A "result" is inherently an outcome. Simplify to "result".',
  },
  {
    pattern: /\bfuture\s+plans\b/gi,
    replacement: 'plans',
    title: 'Redundancy: Future Plans',
    description: 'Plans are by definition intended for the future. Simplify to "plans".',
  },
  {
    pattern: /\bjoin\s+together\b/gi,
    replacement: 'join',
    title: 'Redundancy: Join Together',
    description: '"Together" is redundant when joining. Simplify to "join".',
  },
  {
    pattern: /\bbasic\s+fundamentals\b/gi,
    replacement: 'fundamentals',
    title: 'Redundancy: Basic Fundamentals',
    description: '"Fundamentals" are basic by definition. Simplify to "fundamentals".',
  },
  {
    pattern: /\bpast\s+history\b/gi,
    replacement: 'history',
    title: 'Redundancy: Past History',
    description: 'History is always in the past. Simplify to "history".',
  },
  {
    pattern: /\bcompletely\s+eliminate\b/gi,
    replacement: 'eliminate',
    title: 'Redundant Modifier: Completely Eliminate',
    description: '"Eliminate" is an absolute term. Simplify to "eliminate".',
  },
  {
    pattern: /\bpersonal\s+opinion\b/gi,
    replacement: 'opinion',
    title: 'Redundancy: Personal Opinion',
    description: 'Opinions are personal by nature. Simplify to "opinion".',
  },
  {
    pattern: /\bunexpected\s+surprise\b/gi,
    replacement: 'surprise',
    title: 'Redundant Modifier: Unexpected Surprise',
    description: 'Surprises are inherently unexpected. Simplify to "surprise".',
  },
  {
    pattern: /\bdue\s+to\s+the\s+fact\s+that\b/gi,
    replacement: 'because',
    title: 'Wordiness: Due To The Fact That',
    description: 'Simplify wordy prepositional phrase "due to the fact that" to "because".',
  },
  {
    pattern: /\bat\s+this\s+point\s+in\s+time\b/gi,
    replacement: 'now',
    title: 'Wordiness: At This Point In Time',
    description: 'Simplify wordy cliché "at this point in time" to "now" or "currently".',
  },
  {
    pattern: /\bin\s+order\s+to\b/gi,
    replacement: 'to',
    title: 'Wordiness: In Order To',
    description: '"In order to" can almost always be simplified to "to".',
  },
  {
    pattern: /\bfor\s+the\s+purpose\s+of\b/gi,
    replacement: 'to',
    title: 'Wordiness: For The Purpose Of',
    description: 'Simplify "for the purpose of" to "to" or "for".',
  },
  {
    pattern: /\bin\s+the\s+event\s+that\b/gi,
    replacement: 'if',
    title: 'Wordiness: In The Event That',
    description: 'Simplify "in the event that" to "if".',
  },
  {
    pattern: /\buntil\s+such\s+time\s+as\b/gi,
    replacement: 'until',
    title: 'Wordiness: Until Such Time As',
    description: 'Simplify "until such time as" to "until".',
  },
  {
    pattern: /\bprior\s+to\b/gi,
    replacement: 'before',
    title: 'Plain English: Prior To',
    description: 'Use the simpler, direct word "before" instead of "prior to".',
  },
  {
    pattern: /\bsubsequent\s+to\b/gi,
    replacement: 'after',
    title: 'Plain English: Subsequent To',
    description: 'Use "after" instead of the formalistic "subsequent to".',
  },
];

/**
 * Checks for repeated words within a sentence (e.g. "the the").
 */
export function checkRepeatedWords(
  sentence: SentenceNode,
  ignoredTerms: Set<string>
): DeterministicIssue[] {
  const issues: DeterministicIssue[] = [];
  const text = sentence.trimmedText;

  const duplicateRegex = /\b([a-zA-Z]{2,})\s+\1\b/gi;
  let match: RegExpExecArray | null;

  while ((match = duplicateRegex.exec(text)) !== null) {
    const word = match[1].toLowerCase();
    if (ignoredTerms.has(word)) continue;
    if (word === 'that' || word === 'had') continue;

    const fullMatch = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;
    const suggestedText = text.slice(0, startIndex) + match[1] + text.slice(endIndex);

    issues.push({
      id: `${sentence.id}-repeat-${startIndex}`,
      sentenceId: sentence.id,
      category: 'repetition',
      title: 'Repeated Word',
      description: `The word "${match[1]}" is repeated consecutively.`,
      severity: 'warning',
      originalText: text,
      suggestedText,
      matchStart: startIndex,
      matchEnd: endIndex,
    });
  }

  return issues;
}

/**
 * Checks LanguageTool confusion sets (homophones and common grammatical traps).
 */
export function checkConfusionPairs(sentence: SentenceNode): DeterministicIssue[] {
  if (sentence.isCodeBlock) return [];
  const text = sentence.trimmedText;
  const issues: DeterministicIssue[] = [];

  for (let i = 0; i < LANGUAGE_TOOL_CONFUSION_RULES.length; i++) {
    const rule = LANGUAGE_TOOL_CONFUSION_RULES[i];
    const regex = new RegExp(rule.pattern.source, 'gi');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const startIndex = match.index;
      const fullMatch = match[0];
      const endIndex = startIndex + fullMatch.length;
      const replacedChunk = fullMatch.replace(new RegExp(rule.pattern.source, 'gi'), rule.replacement);
      const suggestedText = text.slice(0, startIndex) + replacedChunk + text.slice(endIndex);

      issues.push({
        id: `${sentence.id}-confusion-${i}-${startIndex}`,
        sentenceId: sentence.id,
        category: rule.title.includes('Spelling') ? 'spelling' : 'grammar',
        title: rule.title,
        description: rule.explanation,
        severity: 'warning',
        originalText: text,
        suggestedText,
        matchStart: startIndex,
        matchEnd: endIndex,
      });
    }
  }

  return issues;
}

/**
 * Checks LanguageTool Plain English wordiness and redundancy rules.
 */
export function checkWordinessAndRedundancy(sentence: SentenceNode): DeterministicIssue[] {
  if (sentence.isCodeBlock) return [];
  const text = sentence.trimmedText;
  const issues: DeterministicIssue[] = [];

  for (let i = 0; i < LANGUAGE_TOOL_REDUNDANCY_RULES.length; i++) {
    const rule = LANGUAGE_TOOL_REDUNDANCY_RULES[i];
    const regex = new RegExp(rule.pattern.source, 'gi');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const startIndex = match.index;
      const fullMatch = match[0];
      const endIndex = startIndex + fullMatch.length;
      const replacedChunk = fullMatch.replace(new RegExp(rule.pattern.source, 'gi'), rule.replacement);
      const suggestedText = text.slice(0, startIndex) + replacedChunk + text.slice(endIndex);

      issues.push({
        id: `${sentence.id}-wordiness-${i}-${startIndex}`,
        sentenceId: sentence.id,
        category: 'wordiness',
        title: rule.title,
        description: rule.description,
        severity: 'suggestion',
        originalText: text,
        suggestedText,
        matchStart: startIndex,
        matchEnd: endIndex,
      });
    }
  }

  return issues;
}

/**
 * Checks spacing and punctuation placement.
 */
export function checkPunctuationAndSpacing(sentence: SentenceNode): DeterministicIssue[] {
  if (sentence.isCodeBlock) return [];
  const text = sentence.trimmedText;
  const issues: DeterministicIssue[] = [];

  // 1. Misplaced space before punctuation: e.g. "word , next"
  const spaceBeforeRegex = /\b\s+([,.:;?!])/g;
  let match: RegExpExecArray | null;
  while ((match = spaceBeforeRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    const suggested = text.slice(0, start) + match[1] + text.slice(end);
    issues.push({
      id: `${sentence.id}-punct-space-${start}`,
      sentenceId: sentence.id,
      category: 'punctuation',
      title: 'Space Before Punctuation',
      description: `Remove unnecessary space before "${match[1]}".`,
      severity: 'warning',
      originalText: text,
      suggestedText: suggested,
      matchStart: start,
      matchEnd: end,
    });
  }

  // 2. Missing space after comma or semicolon: e.g. "apple,banana"
  const missingSpaceRegex = /([,;])([a-zA-Z])/g;
  while ((match = missingSpaceRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    const suggested = text.slice(0, start) + `${match[1]} ${match[2]}` + text.slice(end);
    issues.push({
      id: `${sentence.id}-punct-missingspace-${start}`,
      sentenceId: sentence.id,
      category: 'punctuation',
      title: 'Missing Space After Punctuation',
      description: `Insert a space after "${match[1]}".`,
      severity: 'warning',
      originalText: text,
      suggestedText: suggested,
      matchStart: start,
      matchEnd: end,
    });
  }

  return issues;
}

/**
 * Checks for overly long or run-on sentences.
 */
export function checkSentenceLength(
  sentence: SentenceNode,
  threshold: number = 25
): DeterministicIssue[] {
  if (sentence.isHeading || sentence.isCodeBlock) return [];

  const text = sentence.trimmedText;
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length > threshold) {
    return [
      {
        id: `${sentence.id}-length`,
        sentenceId: sentence.id,
        category: 'length',
        title: 'Long Sentence',
        description: `This sentence is ${words.length} words long (exceeds recommended ${threshold} words). Consider splitting for better clarity.`,
        severity: 'suggestion',
        originalText: text,
      },
    ];
  }

  return [];
}

/**
 * Checks for passive voice constructions.
 */
export function checkPassiveVoice(sentence: SentenceNode): DeterministicIssue[] {
  if (sentence.isHeading || sentence.isCodeBlock) return [];

  const issues: DeterministicIssue[] = [];
  const text = sentence.trimmedText;
  const tokens = text.split(/(\s+|[.,;!?])/).filter((t) => t.trim().length > 0);

  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i].toLowerCase().replace(/[^a-z]/g, '');
    const nextToken = tokens[i + 1].toLowerCase().replace(/[^a-z]/g, '');

    if (BE_VERBS.has(token)) {
      let participle = nextToken;
      let offset = 1;

      if (nextToken.endsWith('ly') && i + 2 < tokens.length) {
        participle = tokens[i + 2].toLowerCase().replace(/[^a-z]/g, '');
        offset = 2;
      }

      if (PAST_PARTICIPLES.has(participle) || (participle.endsWith('ed') && participle.length > 4)) {
        const span = tokens.slice(i, i + offset + 1).join(' ');
        issues.push({
          id: `${sentence.id}-passive-${i}`,
          sentenceId: sentence.id,
          category: 'passive',
          title: 'Passive Voice Detected',
          description: `"${span}" uses passive voice. Rephrasing in active voice makes your writing more direct and engaging.`,
          severity: 'suggestion',
          originalText: text,
        });
        break;
      }
    }
  }

  return issues;
}

/**
 * Checks typography rules: straight quotes, double dashes, multiple spaces, ellipses.
 */
export function checkTypography(sentence: SentenceNode): DeterministicIssue[] {
  if (sentence.isCodeBlock) return [];

  const issues: DeterministicIssue[] = [];
  const text = sentence.trimmedText;
  let fixedText = text;
  let hasChanges = false;

  // 1. Multiple spaces -> single space
  if (/\s{2,}/.test(fixedText)) {
    fixedText = fixedText.replace(/[ \t]{2,}/g, ' ');
    hasChanges = true;
  }

  // 2. Double dash -- to em-dash —
  if (/--/.test(fixedText)) {
    fixedText = fixedText.replace(/--/g, '—');
    hasChanges = true;
  }

  // 3. Three dots ... to ellipsis …
  if (/\.{3}/.test(fixedText)) {
    fixedText = fixedText.replace(/\.{3}/g, '…');
    hasChanges = true;
  }

  // 4. Straight double quotes " " to curly quotes “ ”
  if (/"/.test(fixedText)) {
    fixedText = fixedText.replace(/(^|[\s(\[{<])"([a-zA-Z0-9])/g, '$1“$2');
    fixedText = fixedText.replace(/([a-zA-Z0-9.,!?;:])"/g, '$1”');
    hasChanges = true;
  }

  // 5. Straight single quotes ' ' to curly quotes ‘ ’
  if (/(^|[\s])'([a-zA-Z0-9])/.test(fixedText) || /([a-zA-Z0-9])'([\s.,!?;]|$)/.test(fixedText)) {
    fixedText = fixedText.replace(/(^|[\s(\[{<])'([a-zA-Z0-9])/g, '$1‘$2');
    fixedText = fixedText.replace(/([a-zA-Z0-9])'([a-zA-Z0-9])/g, '$1’$2');
    fixedText = fixedText.replace(/([a-zA-Z0-9.,!?;:])'/g, '$1’');
    hasChanges = true;
  }

  if (hasChanges && fixedText !== text) {
    issues.push({
      id: `${sentence.id}-typography`,
      sentenceId: sentence.id,
      category: 'typography',
      title: 'Smart Typography',
      description: 'Format straight quotes, em-dashes, and clean redundant spacing.',
      severity: 'suggestion',
      originalText: text,
      suggestedText: fixedText,
    });
  }

  return issues;
}

/**
 * Evaluates custom user regex rules from SQLite.
 */
export function checkCustomRules(
  sentence: SentenceNode,
  userRules: UserRule[]
): DeterministicIssue[] {
  const issues: DeterministicIssue[] = [];
  const text = sentence.trimmedText;

  for (const rule of userRules) {
    if (!rule.is_active || !rule.pattern) continue;

    try {
      const regex = new RegExp(rule.pattern, 'gi');
      if (regex.test(text)) {
        const suggestedText = text.replace(new RegExp(rule.pattern, 'gi'), rule.replacement);
        issues.push({
          id: `${sentence.id}-custom-${rule.id || rule.name}`,
          sentenceId: sentence.id,
          category: 'custom',
          title: rule.name,
          description: rule.description || `Custom rule: replace matches with "${rule.replacement}"`,
          severity: 'info',
          originalText: text,
          suggestedText,
        });
      }
    } catch {
      // Ignore invalid user regex gracefully
    }
  }

  return issues;
}

export const COMMON_TYPOS: Record<string, string> = {
  recieved: 'received',
  seperate: 'separate',
  definately: 'definitely',
  occured: 'occurred',
  untill: 'until',
  truely: 'truly',
  goverment: 'government',
  wierd: 'weird',
  calender: 'calendar',
  neccessary: 'necessary',
  tommorrow: 'tomorrow',
  concious: 'conscious',
  enviroment: 'environment',
  grammer: 'grammar',
  suprise: 'surprise',
  recommand: 'recommend',
  existance: 'existence',
  foriegn: 'foreign',
  mispell: 'misspell',
  begining: 'beginning',
  beleive: 'believe',
  acheive: 'achieve',
  priviledge: 'privilege',
};

/**
 * Checks for common high-frequency misspellings and typos.
 */
export function checkCommonTypos(sentence: SentenceNode): DeterministicIssue[] {
  if (sentence.isCodeBlock) return [];
  const text = sentence.trimmedText;
  const issues: DeterministicIssue[] = [];

  for (const [typo, fix] of Object.entries(COMMON_TYPOS)) {
    const regex = new RegExp(`\\b${typo}\\b`, 'gi');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const suggested = text.slice(0, start) + fix + text.slice(end);

      issues.push({
        id: `${sentence.id}-typo-${typo}-${start}`,
        sentenceId: sentence.id,
        category: 'spelling',
        title: `Spelling: "${match[0]}"`,
        description: `Possible misspelling. Did you mean "${fix}"?`,
        severity: 'warning',
        originalText: text,
        suggestedText: suggested,
        matchStart: start,
        matchEnd: end,
      });
    }
  }

  return issues;
}

/**
 * Runs all deterministic linguistic checks on a sentence.
 */
export function analyzeSentenceIssues(
  sentence: SentenceNode,
  options: {
    ignoredTerms?: Set<string>;
    maxSentenceLength?: number;
    userRules?: UserRule[];
    checkPassive?: boolean;
    checkTypography?: boolean;
    checkRepetition?: boolean;
    checkConfusion?: boolean;
    checkWordiness?: boolean;
    checkPunctuation?: boolean;
    checkSpelling?: boolean;
  } = {}
): DeterministicIssue[] {
  const ignored = options.ignoredTerms || new Set<string>();
  const issues: DeterministicIssue[] = [];

  // 0. High-frequency Typos & Spelling
  if (options.checkSpelling !== false) {
    issues.push(...checkCommonTypos(sentence));
  }

  // 1. LanguageTool Confusion Homophones & Grammar
  if (options.checkConfusion !== false) {
    issues.push(...checkConfusionPairs(sentence));
  }

  // 2. LanguageTool Plain English Wordiness & Redundancy
  if (options.checkWordiness !== false) {
    issues.push(...checkWordinessAndRedundancy(sentence));
  }

  // 3. Repeated Words (e.g. "the the")
  if (options.checkRepetition !== false) {
    issues.push(...checkRepeatedWords(sentence, ignored));
  }

  // 4. Punctuation & Spacing Placement
  if (options.checkPunctuation !== false) {
    issues.push(...checkPunctuationAndSpacing(sentence));
  }

  // 5. Sentence Length (Run-on detection)
  issues.push(...checkSentenceLength(sentence, options.maxSentenceLength || 25));

  // 6. Passive Voice
  if (options.checkPassive !== false) {
    issues.push(...checkPassiveVoice(sentence));
  }

  // 7. Typography (Curly quotes, em-dashes, ellipses)
  if (options.checkTypography !== false) {
    issues.push(...checkTypography(sentence));
  }

  // 8. Custom SQLite Rules
  if (options.userRules && options.userRules.length > 0) {
    issues.push(...checkCustomRules(sentence, options.userRules));
  }

  return issues;
}
