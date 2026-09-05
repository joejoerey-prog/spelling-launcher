import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../src/App';
import { editorStore } from '../src/core/state/editorStore';

describe('E2E Happy Path: Import -> Inspect -> Rewrite -> Diff -> Undo/Redo -> Export', () => {
  beforeEach(() => {
    const testDoc = `# Test Document

In order to make a decision, the report was submitted by the team.

This is a very unique approach for the the user.`;
    editorStore.loadDocument(testDoc, 'test.md', 'test.md');
  });

  it('renders three panes and executes sentence rewrite with diff and undo', async () => {
    render(<App />);

    // 1. Verify 3 panes are present
    expect(screen.getByText('Source Document')).toBeInTheDocument();
    expect(screen.getByText('Suggestions & Rewrites')).toBeInTheDocument();
    expect(screen.getByText('Accepted Result Preview')).toBeInTheDocument();

    // 2. Select the sentence with passive voice and filler in the source editor pane
    const targetSentences = screen.getAllByText(/In order to make a decision/i);
    expect(targetSentences.length).toBeGreaterThan(0);
    fireEvent.click(targetSentences[0]);

    // 3. Verify Suggestion Pane activates and displays rewrite choices
    await waitFor(() => {
      expect(screen.getByText('Active Sentence')).toBeInTheDocument();
      expect(screen.getByText(/Rewrite Options/i)).toBeInTheDocument();
    });

    // 4. Accept the Concise / Active rewrite option
    const acceptButtons = screen.getAllByRole('button', { name: /accept/i });
    expect(acceptButtons.length).toBeGreaterThan(0);
    fireEvent.click(acceptButtons[0]);

    // 5. Verify the source document and preview updated with the revision
    await waitFor(() => {
      expect(editorStore.getState.document.isDirty).toBe(true);
      expect(editorStore.getState.historyIndex).toBeGreaterThan(0);
    });

    // 6. Test Undo action
    const undoButton = screen.getByTitle(/Undo/i);
    fireEvent.click(undoButton);

    await waitFor(() => {
      expect(editorStore.getState.historyIndex).toBe(0);
    });

    // 7. Test Redo action
    const redoButton = screen.getByTitle(/Redo/i);
    fireEvent.click(redoButton);

    await waitFor(() => {
      expect(editorStore.getState.historyIndex).toBe(1);
    });

    // 8. Open Export modal
    const exportButton = screen.getByTitle('Export Document');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Export Document/i })).toBeInTheDocument();
      expect(screen.getByText('Markdown (.md)')).toBeInTheDocument();
      expect(screen.getByText('Plain Text (.txt)')).toBeInTheDocument();
    });

    // 9. Close Export modal
    const cancelExport = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelExport);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Export Document/i })).not.toBeInTheDocument();
    });
  });
});
