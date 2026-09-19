/**
 * Readability utility implementing Flesch Reading Ease and Flesch-Kincaid Grade Level.
 * Formulated to provide real-time feedback on writing complexity.
 */

export interface ReadabilityMetrics {
  score: number;       // Flesch Reading Ease (0–100)
  gradeLevel: number;  // Flesch-Kincaid Grade Level
  label: string;       // Human-readable descriptor
}

export function countSyllablesInWord(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 0;
  if (clean.length <= 3) return 1;

  // Remove common suffixes that don't add syllables
  let processed = clean
    .replace(/(?:[^laeiouy]|ed|es|e)$/, '')
    .replace(/^y/, '');

  if (!processed) return 1;

  const matches = processed.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

export function countSyllablesInText(text: string): number {
  const words = text.match(/\b[A-Za-z]+(?:'[A-Za-z]+)?\b/g);
  if (!words) return 0;

  return words.reduce((acc, word) => acc + countSyllablesInWord(word), 0);
}

export function computeReadability(
  text: string,
  wordCount: number,
  sentenceCount: number
): ReadabilityMetrics {
  if (wordCount === 0 || sentenceCount === 0) {
    return {
      score: 100,
      gradeLevel: 1,
      label: 'Standard',
    };
  }

  const syllables = countSyllablesInText(text);
  const wordsPerSentence = wordCount / sentenceCount;
  const syllablesPerWord = syllables / wordCount;

  // Flesch Reading Ease
  const rawScore = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  const score = Math.max(0, Math.min(100, Math.round(rawScore * 10) / 10));

  // Flesch-Kincaid Grade Level
  const rawGrade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;
  const gradeLevel = Math.max(1, Math.round(rawGrade * 10) / 10);

  let label = 'Standard';
  if (score >= 90) label = 'Very Easy';
  else if (score >= 80) label = 'Easy';
  else if (score >= 70) label = 'Fairly Easy';
  else if (score >= 60) label = 'Standard';
  else if (score >= 50) label = 'Fairly Difficult';
  else if (score >= 30) label = 'Difficult';
  else label = 'Very Confusing';

  return { score, gradeLevel, label };
}

export function findLongSentences(
  sentences: { text: string; id: string }[],
  threshold = 25
): { id: string; wordCount: number }[] {
  return sentences
    .map((s) => {
      const words = (s.text.match(/\b\w+\b/g) || []).length;
      return { id: s.id, wordCount: words };
    })
    .filter((s) => s.wordCount > threshold);
}
