import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { editorStore } from '../src/core/state/editorStore';
import { settingsStore } from '../src/core/state/settingsStore';
import { styleStore } from '../src/core/state/styleStore';
import { rulesStore } from '../src/core/state/rulesStore';
import { TauriBridge } from '../src/core/bridge/tauriBridge';

const content = () => editorStore.getState.document.rawContent;
const session = () => editorStore.getState.selectionEdit;
const rangeOf = (raw: string, sub: string, pad = 0) => ({ start: raw.indexOf(sub) - pad, end: raw.indexOf(sub) + sub.length + pad });

async function load(raw: string, issues: any[] = []) {
  vi.spyOn(TauriBridge, 'checkDocument').mockResolvedValue(issues);
  editorStore.loadDocument(raw, 't.md', 't.md');
  await editorStore.refreshAllIssues();
}

const native = (raw: string, matched: string, rep: string) => {
  const idx = raw.indexOf(matched);
  return {
    id: `n-${idx}`, rule_id: 'native.spelling', category: 'spelling', severity: 'error', message: 'Spelling',
    start_offset: idx, end_offset: idx + matched.length, matched_text: matched, replacement: rep, suggestions: [rep], apply_all_eligible: true,
  };
};

beforeEach(async () => {
  await settingsStore.update({ provider: 'local', language: 'en_GB' });
});
afterEach(async () => {
  vi.restoreAllMocks();
  styleStore.state.learnedWords.splice(0);
  rulesStore.state.ignoredTerms.clear();
  await settingsStore.update({ provider: 'local', language: 'en_GB' });
});

const DOC = 'Intro line.\n\nWe need to figure out how to get rid of this bug.  Next sentence stays.\n\nOutro.';

describe('Suggest: accepting an option', () => {
  it('replaces exactly the highlighted range and leaves every other byte alone', async () => {
    await load(DOC);
    const bridge = vi.spyOn(TauriBridge, 'rewritePassage');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { start, end } = rangeOf(DOC, 'figure out how to get rid of');
    await editorStore.startSelectionEdit('suggest', { start, end });

    expect(session()).toMatchObject({ kind: 'suggest', status: 'ready', text: 'figure out how to get rid of', start, end, isAi: false });
    const options = session()!.options;
    expect(options.length).toBeGreaterThan(0);
    expect(options.length).toBeLessThanOrEqual(5);

    editorStore.acceptSelectionOption(options[0].id);
    expect(content()).toBe(DOC.slice(0, start) + options[0].rewrittenText + DOC.slice(end));
    expect(content().startsWith(DOC.slice(0, start))).toBe(true);
    expect(content().endsWith(DOC.slice(end))).toBe(true);
    expect(options[0].rewrittenText).not.toBe('figure out how to get rid of');
    expect(editorStore.getState.document.isDirty).toBe(true);
    expect(editorStore.getState.historyIndex).toBe(1);
    expect(session()).toBeNull();
    expect(editorStore.getState.sessionDiffs.size).toBe(1);
    expect(bridge).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('ignores whitespace at the edges of the highlight and keeps it as it was', async () => {
    await load(DOC);
    const { start, end } = rangeOf(DOC, 'figure out', 1);
    expect(DOC.slice(start, end)).toBe(' figure out ');
    await editorStore.startSelectionEdit('suggest', { start, end });
    const [first] = session()!.options;
    editorStore.acceptSelectionOption(first.id);
    expect(content()).toBe(DOC.replace('figure out', first.rewrittenText));
    expect(content()).toContain('need to ' + first.rewrittenText + ' how');
  });

  it('is undone in one step and the original comes back exactly', async () => {
    await load(DOC);
    const { start, end } = rangeOf(DOC, 'figure out how to get rid of');
    await editorStore.startSelectionEdit('suggest', { start, end });
    editorStore.acceptSelectionOption(session()!.options[0].id);
    expect(content()).not.toBe(DOC);
    editorStore.undo();
    expect(content()).toBe(DOC);
    expect(editorStore.getState.sessionDiffs.size).toBe(0);
    editorStore.redo();
    expect(content()).not.toBe(DOC);
  });

  it('clears stale sentence rewrite cards when an option is accepted', async () => {
    await load(DOC);
    editorStore.getState.rewriteOptions = [{ id: 'r1', sentenceId: 'x', rewrittenText: 'old' } as any];
    await editorStore.startSelectionEdit('suggest', rangeOf(DOC, 'figure out'));
    editorStore.acceptSelectionOption(session()!.options[0].id);
    expect(editorStore.getState.rewriteOptions).toEqual([]);
  });

  it('works in a fragment that does not start a sentence: no stray capital or full stop', async () => {
    await load(DOC);
    await editorStore.startSelectionEdit('suggest', rangeOf(DOC, 'figure out how to get rid of'));
    for (const o of session()!.options) {
      expect(o.rewrittenText[0]).toBe(o.rewrittenText[0].toLowerCase());
      expect(o.rewrittenText).not.toMatch(/[.!?]$/);
    }
  });
});

describe('Polish: one conservative edit with per-change choices', () => {
  const POLISH = 'Before.\n\nWe met due to the fact that it rained, in order to plan.\n\nAfter.';

  it('shows each change separately; applying a subset is one edit and one undo', async () => {
    await load(POLISH);
    const r = rangeOf(POLISH, 'We met due to the fact that it rained, in order to plan.');
    await editorStore.startSelectionEdit('polish', r);
    const changes = session()!.pieces.filter((p) => p.kind === 'change');
    expect(changes).toHaveLength(2);

    editorStore.applyPolish([0]);
    expect(content()).toBe(POLISH.replace('due to the fact that', 'because'));
    expect(editorStore.getState.historyIndex).toBe(1);
    editorStore.undo();
    expect(content()).toBe(POLISH);
  });

  it('applies every change in a single history entry', async () => {
    await load(POLISH);
    await editorStore.startSelectionEdit('polish', rangeOf(POLISH, 'We met due to the fact that it rained, in order to plan.'));
    editorStore.applyPolish([0, 1]);
    expect(content()).toBe(POLISH.replace('due to the fact that', 'because').replace('in order to', 'to'));
    expect(editorStore.getState.historyIndex).toBe(1);
  });

  it('rejecting every change edits nothing and adds no history', async () => {
    await load(POLISH);
    await editorStore.startSelectionEdit('polish', rangeOf(POLISH, 'We met due to the fact that it rained, in order to plan.'));
    editorStore.applyPolish([]);
    expect(content()).toBe(POLISH);
    expect(editorStore.getState.historyIndex).toBe(0);
    expect(session()).toBeNull();
  });

  it('reports no changes when the text is already good', async () => {
    await load(POLISH);
    await editorStore.startSelectionEdit('polish', rangeOf(POLISH, 'Before.'));
    expect(session()).toMatchObject({ kind: 'polish', status: 'ready', pieces: [] });
    expect(content()).toBe(POLISH);
  });

  it('includes spelling fixes the checker found inside the selection, and ignores ones outside it', async () => {
    const raw = 'Teh start.\n\nWe recieved the note due to the fact that it came.\n\nTeh end.';
    await load(raw, [native(raw, 'Teh', 'The'), native(raw, 'recieved', 'received')]);
    await editorStore.startSelectionEdit('polish', rangeOf(raw, 'We recieved the note due to the fact that it came.'));
    editorStore.applyPolish(session()!.pieces.filter((p) => p.kind === 'change').map((p: any) => p.id));
    expect(content()).toBe('Teh start.\n\nWe received the note because it came.\n\nTeh end.');
  });
});

describe('protected text and dialect survive', () => {
  it('never changes quoted text, inline code or a learned word, in any option', async () => {
    styleStore.state.learnedWords.push('figure out');
    const raw = 'He said "in order to win" and we must figure out how to get rid of `a_b` fast.';
    await load(raw);
    await editorStore.startSelectionEdit('suggest', { start: 0, end: raw.length });
    const options = session()!.options;
    expect(options.length).toBeGreaterThan(0);
    for (const o of options) {
      expect(o.rewrittenText).toContain('"in order to win"');
      expect(o.rewrittenText).toContain('`a_b`');
      expect(o.rewrittenText).toContain('figure out');
    }
    expect(options.some((o) => o.rewrittenText.includes('eliminate'))).toBe(true);
  });

  it('protects an ignored term too', async () => {
    rulesStore.state.ignoredTerms.add('get rid of');
    const raw = 'We need to figure out how to get rid of it.';
    await load(raw);
    await editorStore.startSelectionEdit('suggest', { start: 0, end: raw.length });
    expect(session()!.options.every((o) => o.rewrittenText.includes('get rid of'))).toBe(true);
  });

  it('keeps British spelling for en_GB: introduced US spellings are converted, written ones are kept', async () => {
    const raw = 'We perform an analysis of the colour data.';
    await load(raw);
    await editorStore.startSelectionEdit('suggest', { start: 0, end: raw.length });
    const texts = session()!.options.map((o) => o.rewrittenText).join('\n');
    expect(texts).toContain('analyse');
    expect(texts).not.toMatch(/analyz|color/);
    expect(texts).toContain('colour');
  });

  it('keeps American spelling for en_US without touching a British word the user wrote', async () => {
    await settingsStore.update({ language: 'en_US' });
    const raw = 'We perform an analysis of the colour data.';
    await load(raw);
    await editorStore.startSelectionEdit('suggest', { start: 0, end: raw.length });
    const texts = session()!.options.map((o) => o.rewrittenText).join('\n');
    expect(texts).toContain('analyze');
    expect(texts).toContain('colour');
  });
});

describe('stale selections are refused', () => {
  it('refuses to accept after the document changed, reports it, and edits nothing', async () => {
    await load(DOC);
    await editorStore.startSelectionEdit('suggest', rangeOf(DOC, 'figure out how to get rid of'));
    const id = session()!.options[0].id;
    editorStore.updateRawContentDirectly('Oh. ' + DOC);
    editorStore.acceptSelectionOption(id);
    expect(content()).toBe('Oh. ' + DOC);
    expect(editorStore.getState.error).toMatch(/nothing was edited/i);
    expect(session()).toBeNull();
  });

  it('refuses a Polish apply the same way', async () => {
    const raw = 'We met due to the fact that it rained.';
    await load(raw);
    await editorStore.startSelectionEdit('polish', { start: 0, end: raw.length });
    editorStore.updateRawContentDirectly(raw + ' More.');
    editorStore.applyPolish([0]);
    expect(content()).toBe(raw + ' More.');
    expect(editorStore.getState.error).toMatch(/nothing was edited/i);
  });

  it('drops a provider result that arrives after the document changed', async () => {
    await settingsStore.update({ provider: 'ollama' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ models: [{ name: 'llama3.2:3b' }] })));
    let resolve!: (v: any) => void;
    vi.spyOn(TauriBridge, 'rewritePassage').mockReturnValue(new Promise((r) => (resolve = r)));
    await load(DOC);
    const pending = editorStore.startSelectionEdit('suggest', rangeOf(DOC, 'figure out how to get rid of'));
    expect(session()?.status).toBe('loading');
    editorStore.updateRawContentDirectly(DOC + ' Later.');
    resolve({ variations: ['work out how to remove'], latency_ms: 1, provider: 'Ollama (x)' });
    await pending;
    expect(session()).toBeNull();
    expect(content()).toBe(DOC + ' Later.');
    expect(editorStore.getState.error).toMatch(/nothing was edited/i);
  });

  it('drops a result when the user dismissed the card while it was loading', async () => {
    await settingsStore.update({ provider: 'ollama' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ models: [{ name: 'llama3.2:3b' }] })));
    let resolve!: (v: any) => void;
    vi.spyOn(TauriBridge, 'rewritePassage').mockReturnValue(new Promise((r) => (resolve = r)));
    await load(DOC);
    const pending = editorStore.startSelectionEdit('suggest', rangeOf(DOC, 'figure out'));
    editorStore.dismissSelectionEdit();
    resolve({ variations: ['work out'], latency_ms: 1, provider: 'Ollama (x)' });
    await pending;
    expect(session()).toBeNull();
    expect(editorStore.getState.error).toBeNull();
  });

  it('closes the card when another edit, undo or a new document replaces the text', async () => {
    await load(DOC);
    await editorStore.startSelectionEdit('suggest', rangeOf(DOC, 'figure out'));
    editorStore.loadDocument('Something else.', 'b.md', 'b.md');
    expect(session()).toBeNull();

    await load(DOC);
    editorStore.updateRawContentDirectly(DOC + ' x');
    await editorStore.startSelectionEdit('suggest', rangeOf(content(), 'figure out'));
    editorStore.undo();
    expect(session()).toBeNull();
  });
});

describe('AI results', () => {
  it('uses ranked model options when Ollama on this Mac answers, and still protects quoted text', async () => {
    await settingsStore.update({ provider: 'ollama' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ models: [{ name: 'llama3.2:3b' }] })));
    const bridge = vi.spyOn(TauriBridge, 'rewritePassage').mockResolvedValue({
      variations: ['We have to work out how to remove "that bug".', 'We must determine how to remove "this bug".'],
      latency_ms: 1,
      provider: 'Ollama (llama3.2:3b)',
    });
    const raw = 'We need to figure out how to get rid of "this bug".';
    await load(raw);
    await editorStore.startSelectionEdit('suggest', { start: 0, end: raw.length });
    expect(bridge.mock.calls[0][0]).toMatchObject({ mode: 'suggest', dialect: 'en_GB', context: raw });
    expect(session()!.isAi).toBe(true);
    expect(session()!.options.map((o) => o.label)).toEqual(['Option 1', 'Option 2']);
    // The first model option altered the quote; that change is reverted, the rest is kept.
    expect(session()!.options.every((o) => o.rewrittenText.includes('"this bug"'))).toBe(true);
  });

  const mockOllama = async (variations: string[]) => {
    await settingsStore.update({ provider: 'ollama' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ models: [{ name: 'llama3.2:3b' }] })));
    return vi.spyOn(TauriBridge, 'rewritePassage').mockResolvedValue({ variations, latency_ms: 1, provider: 'Ollama (llama3.2:3b)' });
  };

  it('Polish: shows the model edit as separate changes when it is usable', async () => {
    const bridge = await mockOllama(['We met because it rained.']);
    const raw = 'We met due to the fact that it rained.';
    await load(raw);
    await editorStore.startSelectionEdit('polish', { start: 0, end: raw.length });
    expect(bridge.mock.calls[0][0]).toMatchObject({ mode: 'polish', dialect: 'en_GB', context: raw });
    expect(session()).toMatchObject({ isAi: true, notice: undefined });
    expect(session()!.pieces.filter((p) => p.kind === 'change')).toHaveLength(1);
    editorStore.applyPolish([0]);
    expect(content()).toBe('We met because it rained.');
  });

  it('Polish: a model answer that breaks protected text falls back to the built-in checks, not "no changes"', async () => {
    await mockOllama(['We met because it rained "really".']);
    const raw = 'We met due to the fact that it rained.';
    await load(raw);
    await editorStore.startSelectionEdit('polish', { start: 0, end: raw.length });
    expect(session()).toMatchObject({ status: 'ready', isAi: false, notice: expect.stringMatching(/could not be used/) });
    expect(session()!.pieces.filter((p) => p.kind === 'change')).toHaveLength(1);
    editorStore.applyPolish([0]);
    expect(content()).toBe('We met because it rained.');
  });

  it('Suggest: when every model option breaks protected text, the built-in options are offered with a notice', async () => {
    await mockOllama(['We need to work out how to remove "this bug" and "that bug".']);
    const raw = 'We need to figure out how to get rid of "this bug".';
    await load(raw);
    await editorStore.startSelectionEdit('suggest', { start: 0, end: raw.length });
    expect(session()).toMatchObject({ status: 'ready', isAi: false, notice: expect.stringMatching(/could not be used/) });
    expect(session()!.options.length).toBeGreaterThan(0);
    expect(session()!.options.every((o) => o.rewrittenText.includes('"this bug"') && !o.rewrittenText.includes('that bug'))).toBe(true);
  });

  it('falls back to the built-in suggestions and says why when Ollama is unavailable', async () => {
    await settingsStore.update({ provider: 'ollama' });
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const raw = 'We need to figure out how to get rid of it.';
    await load(raw);
    await editorStore.startSelectionEdit('suggest', { start: 0, end: raw.length });
    expect(session()).toMatchObject({ status: 'ready', isAi: false, notice: expect.stringMatching(/Cannot reach local Ollama/) });
    expect(session()!.options.length).toBeGreaterThan(0);
  });
});

describe('refusals', () => {
  it('explains, in plain language, why nothing was started', async () => {
    const raw = 'One.\n\nTwo words here.\n\n```js\nconst a = 1;\n```';
    await load(raw);
    await editorStore.startSelectionEdit('suggest', null);
    expect(editorStore.getState.error).toMatch(/Highlight some text/);
    await editorStore.startSelectionEdit('suggest', { start: 0, end: raw.indexOf('```') - 1 });
    expect(editorStore.getState.error).toMatch(/one paragraph/);
    await editorStore.startSelectionEdit('polish', rangeOf(raw, 'const a'));
    expect(editorStore.getState.error).toMatch(/code/);
    expect(session()).toBeNull();
    expect(content()).toBe(raw);
  });
});
