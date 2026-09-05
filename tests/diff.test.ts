import { describe, it, expect } from 'vitest';
import { computeWordDiff } from '../src/core/engine/diff';

describe('Word-Level Diff Engine', () => {
  it('correctly identifies unchanged, inserted, and deleted tokens', () => {
    const original = 'The quick brown fox jumps over the lazy dog.';
    const revised = 'The fast brown fox leaps over the sleepy dog.';

    const result = computeWordDiff(original, revised);

    expect(result.changes.length).toBeGreaterThan(0);
    expect(result.addedWordCount).toBeGreaterThan(0);
    expect(result.removedWordCount).toBeGreaterThan(0);

    const insertions = result.changes.filter((c) => c.op === 'insert').map((c) => c.value.trim());
    const deletions = result.changes.filter((c) => c.op === 'delete').map((c) => c.value.trim());

    expect(insertions).toContain('fast');
    expect(insertions).toContain('leaps');
    expect(deletions).toContain('quick');
    expect(deletions).toContain('jumps');
  });

  it('calculates 100% similarity ratio for identical strings', () => {
    const text = 'WordCraft is a local-first writing assistant.';
    const result = computeWordDiff(text, text);

    expect(result.similarityRatio).toBe(1);
    expect(result.addedWordCount).toBe(0);
    expect(result.removedWordCount).toBe(0);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].op).toBe('equal');
  });
});
