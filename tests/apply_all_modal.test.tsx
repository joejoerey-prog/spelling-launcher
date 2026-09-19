import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApplyAllModal } from '../src/components/modals/ApplyAllModal';
import { editorStore } from '../src/core/state/editorStore';
import { DeterministicIssue } from '../src/types/suggestions';

describe('ApplyAllModal & Batch Safe Fixes Integration', () => {
  beforeEach(() => {
    const testDoc = `This is a test document with recieved typo and in their was an issue. In order to make a decision, we waited.`;
    editorStore.loadDocument(testDoc, 'test.md', 'test.md');
  });

  it('renders eligible safe fixes with categories and replacements, omitting wordiness', () => {
    // Manually inject a set of issues into allDocumentIssues representing native + rules
    const issues: DeterministicIssue[] = [
      {
        id: 'issue-1',
        sentenceId: 'p0-s0',
        category: 'spelling',
        title: 'Spelling error: recieved',
        description: 'Possible spelling error',
        severity: 'warning',
        originalText: 'This is a test document with recieved typo and in their was an issue.',
        suggestedText: 'This is a test document with received typo and in their was an issue.',
        matchStart: 29,
        matchEnd: 37,
        applyAllEligible: true,
        ruleId: 'native.spelling',
        rawStartOffset: 29,
        rawEndOffset: 37,
        replacement: 'received',
      },
      {
        id: 'issue-2',
        sentenceId: 'p0-s0',
        category: 'confusion',
        title: 'Homophone confusion: in their -> in there',
        description: 'Possible confused word',
        severity: 'warning',
        originalText: 'This is a test document with recieved typo and in their was an issue.',
        suggestedText: 'This is a test document with recieved typo and in there was an issue.',
        matchStart: 47,
        matchEnd: 55,
        applyAllEligible: true,
        ruleId: 'confusion.in_their_there',
        rawStartOffset: 47,
        rawEndOffset: 55,
        replacement: 'in there',
      },
      {
        id: 'issue-3',
        sentenceId: 'p0-s1',
        category: 'wordiness',
        title: 'Wordiness: In order to',
        description: 'Consider simplifying',
        severity: 'suggestion',
        originalText: 'In order to make a decision, we waited.',
        suggestedText: 'To make a decision, we waited.',
        matchStart: 0,
        matchEnd: 11,
        applyAllEligible: false, // Explicitly false per accuracy gate
        ruleId: 'wordiness.in_order_to',
        rawStartOffset: 70,
        rawEndOffset: 81,
        replacement: 'To',
      },
    ];

    const map = new Map<string, DeterministicIssue[]>();
    map.set('p0-s0', [issues[0], issues[1]]);
    map.set('p0-s1', [issues[2]]);
    editorStore.getState.allDocumentIssues = map;

    const handleClose = vi.fn();
    render(<ApplyAllModal isOpen={true} onClose={handleClose} />);

    // Check modal title and badge count (should be 2, because wordiness is applyAllEligible: false)
    expect(screen.getByText('Apply All Safe Fixes')).toBeInTheDocument();
    expect(screen.getByText('2 fixes')).toBeInTheDocument();

    // Check categories
    expect(screen.getByText(/Typos & Spelling: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Homophone Confusion: 1/i)).toBeInTheDocument();

    // Check replacement tokens
    expect(screen.getByText('received')).toBeInTheDocument();
    expect(screen.getByText('in there')).toBeInTheDocument();

    // Wordiness should NOT be in the safe fixes list
    expect(screen.queryByText(/Wordiness: In order to/i)).not.toBeInTheDocument();

    // Click Apply
    const applyButton = screen.getByRole('button', { name: /Apply 2 Safe Fixes/i });
    fireEvent.click(applyButton);

    expect(handleClose).toHaveBeenCalledTimes(1);

    // Verify rawContent updated with replacements in a single transaction
    const updatedContent = editorStore.getState.document.rawContent;
    expect(updatedContent).toContain('received');
    expect(updatedContent).toContain('in there');
    expect(updatedContent).toContain('In order to'); // Wordiness left untouched!

    // Verify history index incremented by 1 (single atomic undo transaction)
    expect(editorStore.getState.historyIndex).toBe(1);

    // Undo should cleanly revert both replacements in one step
    editorStore.undo();
    expect(editorStore.getState.historyIndex).toBe(0);
    expect(editorStore.getState.document.rawContent).toContain('recieved');
    expect(editorStore.getState.document.rawContent).toContain('in their');
  });
});
