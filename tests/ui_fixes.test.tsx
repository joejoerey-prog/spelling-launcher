import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { App } from '../src/App';
import { AppHeader } from '../src/components/layout/AppHeader';
import { ExportModal } from '../src/components/modals/ExportModal';
import { SettingsModal } from '../src/components/modals/SettingsModal';
import { RuleManagerModal } from '../src/components/modals/RuleManagerModal';
import { ApplyAllModal } from '../src/components/modals/ApplyAllModal';
import { editorStore } from '../src/core/state/editorStore';
import { rulesStore } from '../src/core/state/rulesStore';
import { TauriBridge } from '../src/core/bridge/tauriBridge';

const issue = (raw: string, matched: string) => {
  const i = raw.indexOf(matched);
  return {
    id: `i-${i}`,
    rule_id: 'native.spelling',
    category: 'spelling',
    severity: 'error',
    message: 'Spelling',
    start_offset: i,
    end_offset: i + matched.length,
    matched_text: matched,
    replacement: 'world',
    suggestions: ['world'],
    apply_all_eligible: true,
  };
};

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as any).__TAURI_INTERNALS__;
});

describe('source editor sentences', () => {
  it('underlines only the offending word, is keyboard operable and exposes pressed state', async () => {
    const raw = 'Hello wrld today. Second one.';
    vi.spyOn(TauriBridge, 'checkDocument').mockResolvedValue([issue(raw, 'wrld')]);
    editorStore.loadDocument(raw, 't.md', 't.md');
    await editorStore.refreshAllIssues();
    render(<App />);

    const underlined = screen.getByText('wrld');
    expect(underlined.className).toContain('decoration-rose-500');
    const sentence = underlined.closest('[role="button"]') as HTMLElement;
    expect(sentence.className).not.toContain('bg-rose');
    expect(sentence).toHaveAttribute('tabindex', '0');
    expect(sentence).toHaveAttribute('aria-pressed', 'false');

    fireEvent.keyDown(sentence, { key: 'Enter' });
    await waitFor(() => expect(sentence).toHaveAttribute('aria-pressed', 'true'));
    fireEvent.keyDown(sentence, { key: ' ' });
    await waitFor(() => expect(sentence).toHaveAttribute('aria-pressed', 'false'));
  });

  it('does not put select-none on the root, so document text can be copied', () => {
    const { container } = render(<App />);
    expect((container.firstChild as HTMLElement).className).not.toContain('select-none');
  });
});

describe('toasts', () => {
  it('shows success and error together, and Retry only for rewrite errors', () => {
    editorStore.loadDocument('One.', null, 'a.md');
    editorStore.getState.successMessage = 'All good';
    editorStore.showError('Plain failure');
    render(<App />);
    expect(screen.getByText('All good')).toBeInTheDocument();
    expect(screen.getByText('Plain failure')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();

    act(() => editorStore.showError('Rewrite failed', 'rewrite'));
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Dismiss notification' })).toHaveLength(2);
  });
});

describe('keyboard shortcuts', () => {
  it('leaves Cmd+Z to a focused input but undoes elsewhere', () => {
    editorStore.loadDocument('One.', null, 'a.md');
    editorStore.updateRawContentDirectly('One. Two.');
    render(<App />);
    const input = document.createElement('input');
    document.body.appendChild(input);

    fireEvent.keyDown(input, { key: 'z', metaKey: true });
    expect(editorStore.getState.historyIndex).toBe(1);

    fireEvent.keyDown(document.body, { key: 'z', metaKey: true });
    expect(editorStore.getState.historyIndex).toBe(0);
    input.remove();
  });

  it('Cmd+S and the Save button use the same save routine', () => {
    const save = vi.spyOn(editorStore, 'saveCurrentDocument').mockResolvedValue();
    render(<App />);
    fireEvent.keyDown(document.body, { key: 's', metaKey: true });
    fireEvent.click(screen.getByTitle('Save Document (Cmd+S)'));
    expect(save).toHaveBeenCalledTimes(2);
  });
});

describe('open dialog', () => {
  it('does not fall through to the web file input when the native dialog is cancelled', async () => {
    (window as any).__TAURI_INTERNALS__ = { invoke: async () => [] };
    vi.spyOn(TauriBridge, 'openDocumentDialog').mockResolvedValue(null);
    editorStore.loadDocument('Clean.', null, 'a.md');
    const { container } = render(<AppHeader onOpenSettings={() => {}} onOpenRules={() => {}} onOpenExport={() => {}} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clicked = vi.spyOn(fileInput, 'click');
    fireEvent.click(screen.getByTitle(/Open Document/));
    await waitFor(() => expect(TauriBridge.openDocumentDialog).toHaveBeenCalled());
    expect(clicked).not.toHaveBeenCalled();
  });

  it('asks before replacing a dirty document and stops when declined', async () => {
    vi.spyOn(TauriBridge, 'confirm').mockResolvedValue(false);
    const dialog = vi.spyOn(TauriBridge, 'openDocumentDialog');
    editorStore.loadDocument('Clean.', null, 'a.md');
    editorStore.updateRawContentDirectly('Dirty.');
    render(<AppHeader onOpenSettings={() => {}} onOpenRules={() => {}} onOpenExport={() => {}} />);
    fireEvent.click(screen.getByTitle(/Open Document/));
    await waitFor(() => expect(TauriBridge.confirm).toHaveBeenCalled());
    expect(dialog).not.toHaveBeenCalled();
  });
});

describe('modals', () => {
  it('expose dialog semantics labelled by their heading and take focus on open', () => {
    const noop = () => {};
    const { unmount: u1 } = render(<ExportModal isOpen onClose={noop} />);
    expect(screen.getByRole('dialog', { name: 'Export Document' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('dialog')).toHaveFocus();
    u1();
    const { unmount: u2 } = render(<SettingsModal isOpen onClose={noop} />);
    expect(screen.getByRole('dialog', { name: 'Application Settings' })).toBeInTheDocument();
    u2();
    const { unmount: u3 } = render(<RuleManagerModal isOpen onClose={noop} />);
    expect(screen.getByRole('dialog', { name: /Custom Rules/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Rule Name')).toBeInTheDocument();
    u3();
    render(<ApplyAllModal isOpen onClose={noop} />);
    expect(screen.getByRole('dialog', { name: /Apply All Safe Fixes/ })).toBeInTheDocument();
  });

  it('ExportModal resets the filename from the current document each time it opens', () => {
    editorStore.loadDocument('Text.', null, 'first.md');
    const { rerender } = render(<ExportModal isOpen={false} onClose={() => {}} />);
    rerender(<ExportModal isOpen onClose={() => {}} />);
    expect(screen.getByLabelText('File Name')).toHaveValue('first');
    rerender(<ExportModal isOpen={false} onClose={() => {}} />);
    editorStore.loadDocument('Text.', null, 'second.md');
    rerender(<ExportModal isOpen onClose={() => {}} />);
    expect(screen.getByLabelText('File Name')).toHaveValue('second');
  });

  it('ExportModal shows export failures in error styling', async () => {
    vi.spyOn(TauriBridge, 'exportDocument').mockRejectedValue(new Error('no permission'));
    render(<ExportModal isOpen onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Export Now/ }));
    const alert = await screen.findByRole('alert');
    expect(alert.className).toContain('rose');
    expect(alert).toHaveTextContent('no permission');
  });

  it('RuleManagerModal surfaces a backend-rejected rule as a visible error', async () => {
    vi.spyOn(rulesStore, 'addRule').mockRejectedValue("Invalid rule pattern '(': unclosed group");
    render(<RuleManagerModal isOpen onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('Rule Name'), { target: { value: 'r' } });
    fireEvent.change(screen.getByLabelText('Pattern (Regex / Text)'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Rule/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('unclosed group');
  });
});

describe('word learning', () => {
  beforeEach(() => editorStore.loadDocument('One.', null, 'a.md'));

  it('reports bridge failures through the error toast instead of throwing', async () => {
    vi.spyOn(TauriBridge, 'ignoreWord').mockRejectedValue(new Error('db locked'));
    vi.spyOn(TauriBridge, 'learnWord').mockRejectedValue(new Error('db locked'));
    await expect(editorStore.ignoreWord('x')).resolves.toBeUndefined();
    expect(editorStore.getState.error).toContain('db locked');
    editorStore.clearError();
    await expect(editorStore.learnWord('x')).resolves.toBeUndefined();
    expect(editorStore.getState.error).toContain('db locked');
  });

  it('does not claim the macOS system dictionary was changed', async () => {
    vi.spyOn(TauriBridge, 'learnWord').mockResolvedValue();
    await editorStore.learnWord('zzword');
    expect(editorStore.getState.successMessage).not.toMatch(/macOS/);
  });
});
