import { describe, it, expect } from 'vitest';
import {
  applyRelativeEdits,
  buildOptions,
  buildPieces,
  composePieces,
  conformDialect,
  matchShape,
  piecesToDiff,
  protectedSpans,
  resolveSelection,
} from '../src/core/engine/selectionEdit';

const strings = (text: string, terms: string[] = []) => protectedSpans(text, terms).map((s) => text.slice(s.start, s.end));

describe('resolveSelection', () => {
  const raw = 'First para.\n\nWe need  to move fast. Then go.\n\nLast para.';

  it('trims edge whitespace and returns the paragraph as context', () => {
    const a = raw.indexOf('We');
    const r = resolveSelection(raw, a - 2, raw.indexOf('fast.') + 5 + 1);
    expect(r).toMatchObject({ ok: true, text: 'We need  to move fast.', start: a, end: raw.indexOf('fast.') + 5 });
    if (r.ok) expect(r.paragraph).toBe('We need  to move fast. Then go.');
  });

  it('accepts a backwards range', () => {
    const r = resolveSelection(raw, 20, 14);
    expect(r.ok).toBe(true);
  });

  it('refuses empty, multi-paragraph, code and over-long selections with plain-language messages', () => {
    expect(resolveSelection(raw, 3, 3)).toMatchObject({ ok: false, message: expect.stringMatching(/Highlight some text/) });
    expect(resolveSelection(raw, 0, raw.length)).toMatchObject({ ok: false, message: expect.stringMatching(/one paragraph/) });
    const withCode = 'Intro text.\n\n```js\nconst a = 1;\n```\n\nOutro.';
    expect(resolveSelection(withCode, withCode.indexOf('const'), withCode.indexOf('const') + 5)).toMatchObject({
      ok: false,
      message: expect.stringMatching(/code/),
    });
    expect(resolveSelection('word '.repeat(600), 0, 3000)).toMatchObject({ ok: false, message: expect.stringMatching(/shorter/) });
  });

  it('treats an unclosed fence as code to the end', () => {
    const t = 'Text.\n\n```\nlet x';
    expect(resolveSelection(t, t.indexOf('let'), t.length).ok).toBe(false);
  });
});

describe('protectedSpans', () => {
  it('protects code, URLs, emails, identifiers and quoted text', () => {
    const t = 'Call `run()` at https://x.io/a?b=1, mail a.b@c.org, use my_var and fooBar; she said "keep this" and “that too”.';
    // The URL pattern matches the native masker's, so a trailing comma stays inside the span.
    expect(strings(t)).toEqual(['`run()`', 'https://x.io/a?b=1,', 'a.b@c.org', 'my_var', 'fooBar', '"keep this"', '“that too”']);
  });

  it('protects learned and ignored terms as whole words, ignoring case', () => {
    expect(strings('We figure out Acme-Corp and acmecorp here.', ['figure out', 'Acme-Corp'])).toEqual(['figure out', 'Acme-Corp']);
    expect(strings('A catalogue of cat photos.', ['cat'])).toEqual(['cat']);
  });

  it('protects line breaks and list or heading markers inside a selection', () => {
    expect(strings('- one\n- two\n  wrapped')).toEqual(['- ', '\n- ', '\n  ']);
  });
});

describe('buildPieces', () => {
  it('returns null when nothing changes', () => {
    expect(buildPieces('Same text.', 'Same text.')).toBeNull();
  });

  it('round-trips: all rejected is the original, all accepted is the candidate', () => {
    const original = 'We need to figure out how to get rid of this bug.';
    const candidate = 'We need to determine how to eliminate this bug.';
    const pieces = buildPieces(original, candidate)!;
    expect(pieces.filter((p) => p.kind === 'change')).toHaveLength(2);
    expect(composePieces(pieces)).toBe(candidate);
    expect(composePieces(pieces, new Set())).toBe(original);
    expect(composePieces(pieces, new Set([1]))).toBe('We need to figure out how to eliminate this bug.');
    const diff = piecesToDiff(pieces);
    expect(diff.filter((d) => d.op !== 'insert').map((d) => d.value).join('')).toBe(original);
    expect(diff.filter((d) => d.op !== 'delete').map((d) => d.value).join('')).toBe(candidate);
  });

  it('reverts a change that cuts into quoted text but keeps the others', () => {
    const original = 'He said "in order to win" and we need to figure out the plan.';
    const candidate = 'He said "to win" and we need to determine the plan.';
    const pieces = buildPieces(original, candidate)!;
    expect(composePieces(pieces)).toBe('He said "in order to win" and we need to determine the plan.');
  });

  it('keeps a protected learned term even when the candidate rewords it', () => {
    const original = 'We figure out the plan.';
    expect(buildPieces(original, 'We determine the plan.', ['figure out'])).toBeNull();
  });

  it('keeps protected code verbatim, and once only, when the candidate reorders around it', () => {
    const original = 'Run `go test` before you push.';
    const text = composePieces(buildPieces(original, 'Before you push, run `go test`.')!);
    expect(text.split('`go test`')).toHaveLength(2);
  });

  it('rejects a candidate that duplicates or drops protected text', () => {
    const original = 'Run `go test` before you push.';
    expect(buildPieces(original, 'Run `go test` and `go test` before you push.')).toBeNull();
    expect(buildPieces(original, 'Run the tests before you push.')).toBeNull();
  });
});

describe('matchShape', () => {
  it('keeps a lower-case start and a missing full stop', () => {
    expect(matchShape('move fast and break things', 'Move fast and break things.')).toBe('move fast and break things');
  });
  it('keeps the closing punctuation and proper nouns and I', () => {
    expect(matchShape('so we moved fast.', 'Therefore we moved fast')).toBe('therefore we moved fast.');
    expect(matchShape('and I agree', 'And I agree')).toBe('and I agree');
    expect(matchShape('then Paris wins', 'Paris wins')).toBe('Paris wins');
    expect(matchShape('Move fast.', 'Go quickly.')).toBe('Go quickly.');
  });
});

describe('conformDialect', () => {
  it('turns introduced US spellings into British ones, keeping case', () => {
    expect(conformDialect('We analyze the color, organize it and Analyzing helps.', 'We look at it.', 'en_GB')).toBe(
      'We analyse the colour, organise it and Analysing helps.'
    );
  });
  it('turns introduced British spellings into US ones, but never touches the noun "analyses"', () => {
    expect(conformDialect('The colour and the analyses of travelled neighbours', 'The thing', 'en_US')).toBe(
      'The color and the analyses of traveled neighbors'
    );
  });
  it('leaves spellings the user already wrote in the other dialect', () => {
    expect(conformDialect('The color is nice.', 'The color is fine.', 'en_GB')).toBe('The color is nice.');
    expect(conformDialect('The colour is nice.', 'The colour is fine.', 'en_US')).toBe('The colour is nice.');
  });
});

describe('buildOptions', () => {
  it('drops duplicates and protected-text violations, ranks built-in options smallest change first, caps at five', () => {
    const original = 'We need to figure out how to get rid of "this bug" in order to ship.';
    const candidates = [
      { label: 'A', description: '', text: 'We need to determine how to eliminate "this bug" in order to ship.' },
      { label: 'B', description: '', text: 'We need to determine how to get rid of "this bug" in order to ship.' },
      { label: 'dup', description: '', text: 'We need to determine how to get rid of "this bug" in order to ship.' },
      { label: 'bad', description: '', text: 'We need to fix "the bug" in order to ship.' },
      { label: 'same', description: '', text: original },
      ...[1, 2, 3, 4, 5].map((n) => ({ label: `X${n}`, description: '', text: `${original} ${'Extra words here. '.repeat(n + 3)}`.trim() })),
    ];
    const options = buildOptions(original, candidates, { dialect: 'en_GB', terms: [], isAi: false });
    expect(options.map((o) => o.label).slice(0, 3)).toEqual(['B', 'bad', 'A']);
    expect(options.length).toBeLessThanOrEqual(5);
    expect(options.find((o) => o.label === 'bad')?.rewrittenText ?? '').not.toContain('the bug');
    expect(new Set(options.map((o) => o.rewrittenText)).size).toBe(options.length);
    expect(options.every((o) => o.rewrittenText.includes('"this bug"'))).toBe(true);
  });

  it('keeps the model order for AI candidates', () => {
    const o = buildOptions('a big dog', [
      { label: '1', description: '', text: 'a large, friendly dog' },
      { label: '2', description: '', text: 'a huge dog' },
    ], { dialect: 'en_GB', terms: [], isAi: true });
    expect(o.map((x) => x.label)).toEqual(['1', '2']);
    expect(o.every((x) => x.isAiGenerated)).toBe(true);
  });
});

describe('applyRelativeEdits', () => {
  it('applies from the end and skips overlaps', () => {
    expect(applyRelativeEdits('aa bb cc', [
      { start: 0, end: 2, text: 'AA' },
      { start: 3, end: 5, text: 'BB' },
      { start: 0, end: 5, text: 'ZZ' },
    ])).toBe('AA BB cc');
  });
});
