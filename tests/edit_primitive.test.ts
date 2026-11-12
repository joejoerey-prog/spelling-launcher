import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseDocument, reassembleDocument } from '../src/core/engine/segmenter';
import { editorStore } from '../src/core/state/editorStore';
import { TauriBridge } from '../src/core/bridge/tauriBridge';

const native = (raw: string, matched: string, nth = 0, rep = 'X', extra: any = {}) => {
  let idx = -1;
  for (let i = 0; i <= nth; i++) idx = raw.indexOf(matched, idx + 1);
  return {
    id: `n-${idx}`,
    rule_id: 'native.spelling',
    category: 'spelling',
    severity: 'error',
    message: 'Spelling',
    start_offset: idx,
    end_offset: idx + matched.length,
    matched_text: matched,
    replacement: rep,
    suggestions: [rep],
    apply_all_eligible: true,
    ...extra,
  };
};

async function load(raw: string, issues: any[] = []) {
  vi.spyOn(TauriBridge, 'checkDocument').mockResolvedValue(issues);
  editorStore.loadDocument(raw, 't.md', 't.md');
  await editorStore.refreshAllIssues();
}

const allIssues = () => [...editorStore.getState.allDocumentIssues.values()].flat();
const content = () => editorStore.getState.document.rawContent;

afterEach(() => vi.restoreAllMocks());

describe('reassembleDocument round trip', () => {
  const cases: Record<string, string> = {
    'one blank line': 'A.\n\nB.',
    'two blank lines': 'A.\n\n\nB.',
    'double spaces': 'One  two.  Three.',
    'fenced code': '# T\n\nText here.\n\n```ts\nconst x = 1;\n\nconst y = 2;\n```\n\nAfter code.',
    'list': '- one. two.\n- three',
    'trailing newline': 'A.\n',
  };
  for (const [name, text] of Object.entries(cases)) {
    it(`is lossless: ${name}`, () => {
      expect(reassembleDocument(parseDocument(text))).toBe(text);
    });
  }
});

describe('edit primitive', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('applySentenceRevision keeps blank lines and spacing, and works for a non-selected sentence', async () => {
    await load('A.\n\nB  b.  C.');
    editorStore.selectSentence(null);
    const target = editorStore.getState.document.paragraphs.flatMap((p) => p.sentences).find((s) => s.trimmedText === 'C.')!;
    editorStore.applySentenceRevision(target.id, 'C changed.');
    expect(content()).toBe('A.\n\nB  b.  C changed.');
    expect(editorStore.getState.document.isDirty).toBe(true);
    expect(editorStore.getState.historyIndex).toBe(1);
  });

  it('maps match offsets relative to the trimmed sentence and fixes the right text', async () => {
    const raw = '  Hello wrld.';
    await load(raw, [native(raw, 'wrld', 0, 'world')]);
    const [issue] = allIssues();
    expect(issue.originalText).toBe('Hello wrld.');
    expect(issue.originalText.slice(issue.matchStart, issue.matchEnd)).toBe('wrld');
    expect(issue.suggestedText).toBe('Hello world.');
    expect(issue.description).not.toContain('native.spelling');
    editorStore.applyIssueFix(issue);
    expect(content()).toBe('  Hello world.');
  });

  it('applies a fix to the issue occurrence, not the first match', async () => {
    const raw = 'teh cat. The teh dog.';
    await load(raw, [native(raw, 'teh', 1, 'the')]);
    editorStore.applyIssueFix(allIssues()[0]);
    expect(content()).toBe('teh cat. The the dog.');
  });

  it('refuses to edit when the offsets no longer match, and reports an error', async () => {
    const raw = 'teh cat.';
    await load(raw, [native(raw, 'teh', 0, 'the')]);
    const issue = allIssues()[0];
    editorStore.updateRawContentDirectly('Oh, teh cat.');
    editorStore.applyIssueFix(issue);
    expect(content()).toBe('Oh, teh cat.');
    expect(editorStore.getState.error).toMatch(/nothing was edited/i);
  });

  it('applyAllSafeFixes applies in descending order and skips overlapping fixes', async () => {
    const raw = 'aa bb cc.';
    const a = native(raw, 'aa', 0, 'AA');
    const bb = native(raw, 'bb', 0, 'BB');
    const overlap = { ...native(raw, 'aa bb', 0, 'ZZ'), id: 'overlap' };
    await load(raw, [a, bb, overlap]);
    await editorStore.applyAllSafeFixes();
    // 'aa bb' (start 0, end 5) overlaps the already applied 'bb' (3..5), so it is skipped.
    expect(content()).toBe('AA BB cc.');
    expect(editorStore.getState.historyIndex).toBe(1);
  });

  it('discards a check result that arrives after the document changed', async () => {
    await load('Hello world.');
    let resolve!: (v: any[]) => void;
    vi.spyOn(TauriBridge, 'checkDocument').mockReturnValue(new Promise((r) => (resolve = r)));
    const pending = editorStore.refreshAllIssues();
    editorStore.updateRawContentDirectly('Different text now.');
    resolve([native('Hello world.', 'Hello', 0, 'Hi')]);
    await pending;
    expect(allIssues()).toHaveLength(0);
  });
});

describe('history', () => {
  it('coalesces manual edits within a second and caps history at 200', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    await load('Start.');
    editorStore.updateRawContentDirectly('Start. a');
    editorStore.updateRawContentDirectly('Start. ab');
    expect(editorStore.getState.history).toHaveLength(2);
    vi.setSystemTime(new Date('2026-01-01T00:00:05Z'));
    editorStore.updateRawContentDirectly('Start. abc');
    expect(editorStore.getState.history).toHaveLength(3);
    for (let i = 0; i < 300; i++) {
      vi.setSystemTime(new Date(Date.UTC(2026, 0, 1, 1, 0, i * 2)));
      editorStore.updateRawContentDirectly(`Text ${i}.`);
    }
    expect(editorStore.getState.history).toHaveLength(200);
    expect(editorStore.getState.historyIndex).toBe(199);
    vi.useRealTimers();
  });

  it('undo clears rewrite options and drops a selection that no longer exists', async () => {
    await load('One.\n\nTwo.');
    editorStore.updateRawContentDirectly('One.\n\nTwo.\n\nThree.');
    const three = editorStore.getState.document.paragraphs.flatMap((p) => p.sentences).find((s) => s.trimmedText === 'Three.')!;
    editorStore.selectSentence(three.id);
    editorStore.getState.rewriteOptions = [{ id: 'x' } as any];
    editorStore.undo();
    expect(editorStore.getState.rewriteOptions).toEqual([]);
    expect(editorStore.getState.selectedSentenceId).toBeNull();
  });

  it('selecting another sentence clears the previous rewrite options', async () => {
    await load('One.\n\nTwo.');
    const [one, two] = editorStore.getState.document.paragraphs.flatMap((p) => p.sentences);
    editorStore.selectSentence(one.id);
    editorStore.getState.rewriteOptions = [{ id: 'x' } as any];
    editorStore.selectSentence(two.id);
    expect(editorStore.getState.rewriteOptions).toEqual([]);
  });
});

describe('saveCurrentDocument', () => {
  it('asks for a destination for non-text files and updates path, name and dirty flag', async () => {
    await load('Body.');
    editorStore.loadDocument('Body.', '/tmp/report.pdf', 'report.pdf');
    editorStore.updateRawContentDirectly('Body edited.');
    const choose = vi.spyOn(TauriBridge, 'chooseSavePath').mockResolvedValue('/tmp/report.md');
    const save = vi.spyOn(TauriBridge, 'saveDocument').mockResolvedValue({ success: true, path: '/tmp/report.md', message: 'ok' } as any);
    await editorStore.saveCurrentDocument();
    expect(choose).toHaveBeenCalledWith('report.md');
    expect(save).toHaveBeenCalledWith('/tmp/report.md', 'Body edited.', true);
    const doc = editorStore.getState.document;
    expect(doc.filePath).toBe('/tmp/report.md');
    expect(doc.fileName).toBe('report.md');
    expect(doc.isDirty).toBe(false);
  });

  it('does nothing when the dialog is cancelled, saves directly to a text path, and toasts failures', async () => {
    editorStore.loadDocument('Body.', null, 'Untitled.md');
    const choose = vi.spyOn(TauriBridge, 'chooseSavePath').mockResolvedValue(null);
    const save = vi.spyOn(TauriBridge, 'saveDocument');
    await editorStore.saveCurrentDocument();
    expect(save).not.toHaveBeenCalled();

    editorStore.loadDocument('Body.', '/tmp/a.md', 'a.md');
    save.mockRejectedValue(new Error('disk full'));
    await editorStore.saveCurrentDocument();
    expect(choose).toHaveBeenCalledTimes(1);
    expect(editorStore.getState.error).toContain('disk full');
  });
});

describe('CRLF documents', () => {
  it('normalises line endings on load so sentence offsets and fixes line up', async () => {
    const crlf = 'First line\r\nwraps here. Teh end.\r\n\r\nSecond para.';
    await load(crlf);
    expect(content()).toBe('First line\nwraps here. Teh end.\n\nSecond para.');
    for (const p of editorStore.getState.document.paragraphs) {
      for (const s of p.sentences) {
        const start = s.documentStartOffset! + (s.text.length - s.text.trimStart().length);
        expect(content().slice(start, start + s.trimmedText.length)).toBe(s.trimmedText);
      }
    }
    await load(crlf, [native(content(), 'Teh', 0, 'The')]);
    editorStore.applyIssueFix(allIssues()[0]);
    expect(content()).toBe('First line\nwraps here. The end.\n\nSecond para.');
  });
});

describe('undo and session revisions', () => {
  it('drops the revision record when undo restores the original sentence', async () => {
    await load('One sentence here.\n\nAnother one.');
    const id = editorStore.getState.document.paragraphs[0].sentences[0].id;
    editorStore.applySentenceRevision(id, 'One better sentence.');
    expect(editorStore.getState.sessionDiffs.size).toBe(1);
    editorStore.undo();
    expect(content()).toBe('One sentence here.\n\nAnother one.');
    expect(editorStore.getState.sessionDiffs.size).toBe(0);
  });
});
