import { describe, it, expect } from 'vitest';
import { generateLocalRewrites } from '../src/core/engine/localRewriter';

describe('Local Heuristic Rewrite Engine', () => {
  it('generates concise variations cutting redundant phrases', () => {
    const text = 'In order to make a decision, we conducted an investigation due to the fact that issues arose.';
    const options = generateLocalRewrites('s1', text);

    expect(options.length).toBeGreaterThan(0);
    const conciseOpt = options.find((o) => o.category === 'concise');
    expect(conciseOpt).toBeDefined();
    expect(conciseOpt?.rewrittenText).toContain('To decide');
    expect(conciseOpt?.rewrittenText).toContain('because issues arose');
  });

  it('generates active voice conversion for passive sentences', () => {
    const text = 'The proposal was approved by the board.';
    const options = generateLocalRewrites('s2', text);

    const activeOpt = options.find((o) => o.category === 'active_voice');
    expect(activeOpt).toBeDefined();
    expect(activeOpt?.rewrittenText).toBe('The board approved the proposal.');
  });

  it('generates professional and casual tone choices', () => {
    const text = 'We need to figure out how to get rid of this bug.';
    const options = generateLocalRewrites('s3', text);

    const profOpt = options.find((o) => o.tone === 'professional');
    expect(profOpt).toBeDefined();
    expect(profOpt?.rewrittenText).toContain('determine');
    expect(profOpt?.rewrittenText).toContain('eliminate');
  });

  it('generates confident variations stripping hedge phrases', () => {
    const text = 'I think that we could possibly launch next week.';
    const options = generateLocalRewrites('s4', text);

    const confOpt = options.find((o) => o.tone === 'confident');
    expect(confOpt).toBeDefined();
    expect(confOpt?.rewrittenText).not.toContain('I think');
    expect(confOpt?.rewrittenText.toLowerCase()).toContain('we will launch');
  });
});
