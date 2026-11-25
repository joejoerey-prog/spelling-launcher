import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { App } from '../src/App';
import { editorStore } from '../src/core/state/editorStore';
import { settingsStore } from '../src/core/state/settingsStore';
import { TauriBridge } from '../src/core/bridge/tauriBridge';
import { readDocumentSelection } from '../src/core/selectionRange';

const content = () => editorStore.getState.document.rawContent;
const SUGGEST = { code: 'KeyR', key: 'r', metaKey: true, shiftKey: true };
const POLISH = { code: 'KeyP', key: 'p', metaKey: true, shiftKey: true };

afterEach(async () => {
  window.getSelection()?.removeAllRanges();
  vi.restoreAllMocks();
  await act(() => settingsStore.update({ shortcuts: {}, provider: 'local', language: 'en_GB' }));
});

async function open(raw: string, issues: any[] = []) {
  vi.spyOn(TauriBridge, 'checkDocument').mockResolvedValue(issues);
  editorStore.loadDocument(raw, 't.md', 't.md');
  await editorStore.refreshAllIssues();
  render(<App />);
}

const textNode = (el: Element): Text => {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  return w.nextNode() as Text;
};

/** Highlights `sub` inside the first sentence text element that contains it, like a drag would. */
function highlight(sub: string) {
  const root = Array.from(document.querySelectorAll('[data-sl-text]')).find((el) => el.textContent!.includes(sub))!;
  const range = document.createRange();
  range.selectNodeContents(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let consumed = 0;
  const target = root.textContent!.indexOf(sub);
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    const len = n.data.length;
    if (target >= consumed && target < consumed + len) range.setStart(n, target - consumed);
    if (target + sub.length > consumed && target + sub.length <= consumed + len) range.setEnd(n, target + sub.length - consumed);
    consumed += len;
  }
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
}

const press = async (combo: Partial<KeyboardEvent>) => {
  await act(async () => {
    fireEvent.keyDown(document.body, combo);
  });
};

describe('mapping a highlight to document offsets', () => {
  const RAW = 'Intro.\n\nWe recieved alot of feedback. It was kind.\n\nLast.';
  const issue = (m: string) => {
    const i = RAW.indexOf(m);
    return {
      id: `i${i}`, rule_id: 'native.spelling', category: 'spelling', severity: 'error', message: 'Spelling',
      start_offset: i, end_offset: i + m.length, matched_text: m, replacement: 'x', suggestions: ['x'], apply_all_eligible: true,
    };
  };

  it('is exact inside a sentence that has a marker and underlined words before the highlight', async () => {
    await open(RAW, [issue('recieved'), issue('alot')]);
    expect(document.querySelectorAll('[data-sl-text] span').length).toBeGreaterThan(0); // underlines rendered
    highlight('of feedback');
    const r = readDocumentSelection()!;
    expect(RAW.slice(r.start, r.end)).toBe('of feedback');
  });

  it('is exact when the highlight starts inside an underlined word', async () => {
    await open(RAW, [issue('recieved')]);
    highlight('cieved alot');
    const r = readDocumentSelection()!;
    expect(RAW.slice(r.start, r.end)).toBe('cieved alot');
  });

  it('spans from the first to the last sentence touched', async () => {
    await open(RAW);
    const a = document.querySelectorAll('[data-sl-text]')[1];
    const b = document.querySelectorAll('[data-sl-text]')[2];
    const range = document.createRange();
    range.setStart(textNode(a), 3);
    range.setEnd(textNode(b), 6);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    const r = readDocumentSelection()!;
    expect(RAW.slice(r.start, r.end)).toBe('recieved alot of feedback. It was');
  });

  it('is null when nothing is highlighted', async () => {
    await open(RAW);
    expect(readDocumentSelection()).toBeNull();
  });

  it('reads the textarea range in raw view', async () => {
    await open(RAW);
    await press({ code: 'KeyR', key: '®', metaKey: true, altKey: true });
    const area = document.querySelector('textarea[data-sl-editor]') as HTMLTextAreaElement;
    area.focus();
    area.setSelectionRange(RAW.indexOf('alot'), RAW.indexOf('alot') + 4);
    expect(readDocumentSelection()).toEqual({ start: RAW.indexOf('alot'), end: RAW.indexOf('alot') + 4 });
    area.setSelectionRange(5, 5);
    expect(readDocumentSelection()).toBeNull();
  });
});

describe('Suggest from the keyboard', () => {
  const RAW = 'Start here.\n\nWe need to figure out how to get rid of this bug. Next one.\n\nEnd.';

  it('shows ranked options as diffs with Accept, and accepting edits only the highlight', async () => {
    await open(RAW);
    highlight('figure out how to get rid of');
    await press(SUGGEST);
    const region = await screen.findByRole('region', { name: 'Suggestions for your highlight' });
    expect(within(region).getByText('figure out how to get rid of')).toBeTruthy();
    const accepts = within(region).getAllByRole('button', { name: /^Accept option/ });
    expect(accepts.length).toBeGreaterThan(0);
    expect(region.querySelectorAll('.line-through').length).toBeGreaterThan(0);
    expect(region.querySelectorAll('.underline').length).toBeGreaterThan(0);

    const before = content();
    const start = before.indexOf('figure out');
    const end = start + 'figure out how to get rid of'.length;
    const text = editorStore.getState.selectionEdit!.options[0].rewrittenText;
    await act(async () => fireEvent.click(accepts[0]));
    expect(content()).toBe(before.slice(0, start) + text + before.slice(end));
    expect(screen.queryByRole('region', { name: 'Suggestions for your highlight' })).toBeNull();
  });

  it('says what to do when nothing is highlighted', async () => {
    await open(RAW);
    await press(SUGGEST);
    expect(await screen.findByText(/Highlight some text first/)).toBeTruthy();
    expect(screen.queryByRole('region', { name: /highlight/i })).toBeNull();
  });

  it('is ignored while a dialog has the keyboard', async () => {
    await open(RAW);
    await press({ code: 'Comma', key: ',', metaKey: true });
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    highlight('figure out');
    await act(async () => {
      fireEvent.keyDown(dialog, SUGGEST);
    });
    expect(editorStore.getState.selectionEdit).toBeNull();
    expect(editorStore.getState.error).toBeNull();
  });

  it('closes with Escape or the Close button', async () => {
    await open(RAW);
    highlight('figure out');
    await press(SUGGEST);
    await screen.findByRole('region', { name: 'Suggestions for your highlight' });
    await act(async () => fireEvent.keyDown(window, { key: 'Escape' }));
    expect(screen.queryByRole('region', { name: 'Suggestions for your highlight' })).toBeNull();

    highlight('figure out');
    await press(SUGGEST);
    await act(async () => fireEvent.click(await screen.findByRole('button', { name: 'Close' })));
    expect(screen.queryByRole('region', { name: 'Suggestions for your highlight' })).toBeNull();
  });

  it('a remapped shortcut fires on the new keys and no longer on the old ones', async () => {
    await act(() => settingsStore.update({ shortcuts: { suggestSelection: 'Control+Alt+KeyK' } }));
    await open(RAW);
    highlight('figure out');
    await press(SUGGEST);
    expect(screen.queryByRole('region', { name: 'Suggestions for your highlight' })).toBeNull();
    await press({ code: 'KeyK', key: 'k', ctrlKey: true, altKey: true });
    expect(await screen.findByRole('region', { name: 'Suggestions for your highlight' })).toBeTruthy();
  });

  it('works from raw text view too', async () => {
    await open(RAW);
    await press({ code: 'KeyR', key: '®', metaKey: true, altKey: true });
    const area = document.querySelector('textarea[data-sl-editor]') as HTMLTextAreaElement;
    area.focus();
    area.setSelectionRange(RAW.indexOf('figure out'), RAW.indexOf('figure out') + 'figure out how to get rid of'.length);
    await act(async () => {
      fireEvent.keyDown(area, SUGGEST);
    });
    expect(await screen.findByRole('region', { name: 'Suggestions for your highlight' })).toBeTruthy();
    await act(async () => fireEvent.click(screen.getAllByRole('button', { name: /^Accept option/ })[0]));
    expect(content().startsWith('Start here.\n\nWe need to ')).toBe(true);
    expect(content().endsWith(' this bug. Next one.\n\nEnd.')).toBe(true);
  });

  it('a click that ends a drag-highlight does not also select the sentence', async () => {
    await open(RAW);
    highlight('figure out');
    const sentence = Array.from(document.querySelectorAll('[data-sl-text]'))
      .find((el) => el.textContent!.includes('We need to'))!
      .closest('[role="button"]') as HTMLElement;
    await act(async () => fireEvent.click(sentence));
    expect(editorStore.getState.selectedSentenceId).toBeNull();
    window.getSelection()!.removeAllRanges();
    await act(async () => fireEvent.click(sentence));
    expect(editorStore.getState.selectedSentenceId).not.toBeNull();
  });
});

describe('Polish from the keyboard', () => {
  const RAW = 'Before.\n\nWe met due to the fact that it rained, in order to plan.\n\nAfter.';

  it('lets each change be accepted or rejected, then applies the rest as one edit', async () => {
    await open(RAW);
    highlight('We met due to the fact that it rained, in order to plan.');
    await press(POLISH);
    const region = await screen.findByRole('region', { name: 'Polish your highlight' });
    expect(within(region).getByRole('button', { name: /Apply 2 of 2 changes/ })).toBeTruthy();

    await act(async () => fireEvent.click(within(region).getByRole('button', { name: /Reject change 2/ })));
    const apply = within(region).getByRole('button', { name: /Apply 1 of 2 changes/ });
    expect(within(region).getByRole('button', { name: /Accept change 2/ }).getAttribute('aria-pressed')).toBe('false');

    await act(async () => fireEvent.click(apply));
    expect(content()).toBe(RAW.replace('due to the fact that', 'because'));
    expect(editorStore.getState.historyIndex).toBe(1);
    editorStore.undo();
    expect(content()).toBe(RAW);
  });

  it('says "No changes needed" when the text is already good', async () => {
    await open(RAW);
    highlight('Before.');
    await press(POLISH);
    const region = await screen.findByRole('region', { name: 'Polish your highlight' });
    expect(within(region).getByRole('status').textContent).toMatch(/No changes needed/);
    expect(within(region).queryByRole('button', { name: /Apply/ })).toBeNull();
    expect(content()).toBe(RAW);
  });

  it('turns every control off, with a warning, once the document has changed', async () => {
    await open(RAW);
    highlight('We met due to the fact that it rained, in order to plan.');
    await press(POLISH);
    const region = await screen.findByRole('region', { name: 'Polish your highlight' });
    await act(async () => editorStore.updateRawContentDirectly(RAW + ' More.'));
    expect(within(region).getByRole('alert').textContent).toMatch(/document changed/);
    expect((within(region).getByRole('button', { name: /Apply/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
