import { describe, it, expect } from 'vitest';
import {
  countSyllablesInWord,
  countSyllablesInText,
  computeReadability,
  findLongSentences,
} from '../src/core/utils/readability';
import { parseDocument, calculateDocumentStats } from '../src/core/engine/segmenter';

describe('Readability Telemetry Utility', () => {
  it('accurately counts syllables in standard English words', () => {
    expect(countSyllablesInWord('the')).toBe(1);
    expect(countSyllablesInWord('dog')).toBe(1);
    expect(countSyllablesInWord('make')).toBe(1);
    expect(countSyllablesInWord('writing')).toBe(2);
    expect(countSyllablesInWord('assistant')).toBe(3);
    expect(countSyllablesInWord('readability')).toBe(5);
  });

  it('counts syllables across a full passage', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const totalSyllables = countSyllablesInText(text);
    expect(totalSyllables).toBeGreaterThanOrEqual(10);
    expect(totalSyllables).toBeLessThanOrEqual(15);
  });

  it('computes Flesch Reading Ease and Kincaid Grade Level for plain English', () => {
    const plainText = 'The cat sat on the mat. The dog lay on the rug. They were happy.';
    const metrics = computeReadability(plainText, 16, 3);

    // Short words and short sentences should score high ease
    expect(metrics.score).toBeGreaterThanOrEqual(80);
    expect(['Easy', 'Very Easy']).toContain(metrics.label);
    expect(metrics.gradeLevel).toBeLessThanOrEqual(6);
  });

  it('computes lower reading ease for dense complex text', () => {
    const complexText =
      'Notwithstanding subterranean geochemical stratification, thermodynamic phenomenologies dictate equilibrium.';
    const metrics = computeReadability(complexText, 8, 1);

    expect(metrics.score).toBeLessThan(50);
    expect(['Fairly Difficult', 'Difficult', 'Very Confusing']).toContain(metrics.label);
    expect(metrics.gradeLevel).toBeGreaterThanOrEqual(10);
  });

  it('handles empty input gracefully without NaN or infinity', () => {
    const metrics = computeReadability('', 0, 0);
    expect(metrics.score).toBe(100);
    expect(metrics.gradeLevel).toBe(1);
    expect(metrics.label).toBe('Standard');
  });

  it('identifies sentences exceeding the length threshold', () => {
    const sentences = [
      { id: 's1', text: 'This is a brief, concise sentence.' },
      {
        id: 's2',
        text: 'This is an exceedingly prolonged, overly drawn-out sentence designed explicitly to surpass the twenty-five word threshold by concatenating multiple qualifying clauses without adequate punctuation or full stops in order to trigger the telemetry warning.',
      },
    ];

    const longOnes = findLongSentences(sentences, 20);
    expect(longOnes).toHaveLength(1);
    expect(longOnes[0].id).toBe('s2');
    expect(longOnes[0].wordCount).toBeGreaterThan(20);
  });

  it('integrates readability into calculateDocumentStats', () => {
    const markdown = '# Readability Assessment\n\nClear communication is essential for effective engineering.';
    const doc = parseDocument(markdown);
    const stats = calculateDocumentStats(markdown, doc.paragraphs);

    expect(stats.readabilityScore).toBeDefined();
    expect(stats.readabilityGrade).toBeDefined();
    expect(stats.readabilityLabel).toBeDefined();
    expect(typeof stats.readabilityScore).toBe('number');
    expect(typeof stats.readabilityLabel).toBe('string');
  });
});
