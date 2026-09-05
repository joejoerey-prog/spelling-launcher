import { describe, it, expect } from 'vitest';
import {
  checkRepeatedWords,
  checkSentenceLength,
  checkPassiveVoice,
  checkTypography,
  checkCustomRules,
  checkConfusionPairs,
  checkWordinessAndRedundancy,
  checkPunctuationAndSpacing,
  analyzeSentenceIssues,
} from '../src/core/engine/deterministicRules';
import { SentenceNode } from '../src/types/document';
import { UserRule } from '../src/types/database';

function createMockSentence(text: string, id: string = 's1', isHeading: boolean = false): SentenceNode {
  return {
    id,
    paragraphIndex: 0,
    sentenceIndex: 0,
    text,
    trimmedText: text.trim(),
    startOffset: 0,
    endOffset: text.length,
    isHeading,
  };
}

describe('Deterministic Linguistic Checker', () => {
  it('detects repeated consecutive words and suggests fix', () => {
    const sentence = createMockSentence('This is the the user approach.');
    const issues = checkRepeatedWords(sentence, new Set());

    expect(issues).toHaveLength(1);
    expect(issues[0].category).toBe('repetition');
    expect(issues[0].suggestedText).toBe('This is the user approach.');
  });

  it('respects ignored terms for repetition check', () => {
    const sentence = createMockSentence('We visited Pago Pago in Samoa.');
    const ignored = new Set(['pago']);
    const issues = checkRepeatedWords(sentence, ignored);

    expect(issues).toHaveLength(0);
  });

  it('flags overly long sentences beyond threshold', () => {
    const longText = 'This is an excessively long sentence designed to test the sentence length threshold checker in WordCraft because sentences with too many clauses can be difficult for readers to process easily without getting fatigued.';
    const sentence = createMockSentence(longText);

    const issues = checkSentenceLength(sentence, 20);
    expect(issues).toHaveLength(1);
    expect(issues[0].category).toBe('length');
    expect(issues[0].description).toContain('33 words long');
  });

  it('detects passive voice constructions', () => {
    const sentence = createMockSentence('The report was submitted by the team yesterday.');
    const issues = checkPassiveVoice(sentence);

    expect(issues).toHaveLength(1);
    expect(issues[0].category).toBe('passive');
    expect(issues[0].description).toContain('was submitted');
  });

  it('enhances typography with curly quotes, em-dashes, and clean spacing', () => {
    const sentence = createMockSentence('The user said "hello"--it was exciting...  really.');
    const issues = checkTypography(sentence);

    expect(issues).toHaveLength(1);
    expect(issues[0].suggestedText).toBe('The user said “hello”—it was exciting… really.');
  });

  it('detects LanguageTool confusion pairs and homophones', () => {
    const s1 = createMockSentence('In their was a big meeting yesterday.');
    const issues1 = checkConfusionPairs(s1);
    expect(issues1.some((i) => i.suggestedText?.includes('there was'))).toBe(true);

    const s2 = createMockSentence('This medication has no negative side affect.');
    const issues2 = checkConfusionPairs(s2);
    expect(issues2.some((i) => i.suggestedText?.includes('side effect'))).toBe(true);

    const s3 = createMockSentence('We should of visited them earlier.');
    const issues3 = checkConfusionPairs(s3);
    expect(issues3.some((i) => i.suggestedText?.includes('should have'))).toBe(true);

    const s4 = createMockSentence('I like this alot.');
    const issues4 = checkConfusionPairs(s4);
    expect(issues4.some((i) => i.suggestedText?.includes('a lot'))).toBe(true);
  });

  it('detects LanguageTool wordiness and redundancies', () => {
    const s1 = createMockSentence('The building is in close proximity to the train station.');
    const issues1 = checkWordinessAndRedundancy(s1);
    expect(issues1.some((i) => i.suggestedText?.includes('in proximity to'))).toBe(true);

    const s2 = createMockSentence('Due to the fact that we were late, we missed it.');
    const issues2 = checkWordinessAndRedundancy(s2);
    expect(issues2.some((i) => i.suggestedText?.includes('because we were late'))).toBe(true);

    const s3 = createMockSentence('We need to discuss our future plans for the end result.');
    const issues3 = checkWordinessAndRedundancy(s3);
    expect(issues3.length).toBeGreaterThanOrEqual(2);
    expect(issues3.some((i) => i.suggestedText?.includes('our plans'))).toBe(true);
    expect(issues3.some((i) => i.suggestedText?.includes('the result'))).toBe(true);
  });

  it('detects spacing and punctuation mistakes', () => {
    const s1 = createMockSentence('We visited London , Paris,and Rome.');
    const issues = checkPunctuationAndSpacing(s1);
    expect(issues.length).toBeGreaterThanOrEqual(2);
    expect(issues.some((i) => i.title.includes('Space Before Punctuation'))).toBe(true);
    expect(issues.some((i) => i.title.includes('Missing Space After Punctuation'))).toBe(true);
  });

  it('applies user custom rules from SQLite', () => {
    const sentence = createMockSentence('At the end of the day, we must utilize better tools.');
    const customRules: UserRule[] = [
      {
        id: 1,
        name: 'Cliché check',
        pattern: '\\bAt the end of the day\\b',
        replacement: 'Ultimately',
        category: 'style',
        description: 'Simplify cliché',
        is_active: true,
      },
      {
        id: 2,
        name: 'Simplify utilize',
        pattern: '\\butilize\\b',
        replacement: 'use',
        category: 'clarity',
        description: 'Use simpler word',
        is_active: true,
      },
    ];

    const issues = checkCustomRules(sentence, customRules);
    expect(issues).toHaveLength(2);
    expect(issues[0].suggestedText).toContain('Ultimately, we must utilize better tools.');
    expect(issues[1].suggestedText).toContain('At the end of the day, we must use better tools.');
  });

  it('combines all deterministic rules in analyzeSentenceIssues', () => {
    const sentence = createMockSentence('The report was submitted in close proximity to the deadline due to the fact that their was a delay.');
    const issues = analyzeSentenceIssues(sentence);

    expect(issues.length).toBeGreaterThanOrEqual(3);
    const categories = issues.map((i) => i.category);
    expect(categories).toContain('passive');
    expect(categories).toContain('wordiness');
    expect(categories).toContain('grammar');
  });
});
