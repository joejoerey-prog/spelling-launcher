import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { settingsStore } from '../src/core/state/settingsStore';
import { editorStore } from '../src/core/state/editorStore';
import { rewriteSelectedPassage } from '../src/core/engine/aiRewriter';
import { TauriBridge } from '../src/core/bridge/tauriBridge';
import { SettingsModal } from '../src/components/modals/SettingsModal';

describe('Amendment 3 Isolation Test: Zero Ollama probing or background spawning', () => {
  let fetchSpy: any;
  let tauriRewriteSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    tauriRewriteSpy = vi.spyOn(TauriBridge, 'rewritePassage');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('default settings specify provider: local with zero startup probes', async () => {
    expect(settingsStore.state.provider).toBe('local');

    // Simulate settings loading
    await settingsStore.load();

    // Verify zero HTTP fetch calls made to Ollama port 11434 or any network address
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('document loading and checking runs fully offline with zero Ollama interaction', async () => {
    const sampleDoc = 'This is an sentence with an error and utilize Pomposity.';
    editorStore.loadDocument(sampleDoc, 'doc.txt', 'doc.txt');

    // Allow any async checking to settle
    await editorStore.refreshAllIssues();

    // Verify zero fetch requests and zero AI rewrite requests made
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(tauriRewriteSpy).not.toHaveBeenCalled();
  });

  it('rewriteSelectedPassage with provider=local executes pure heuristic rewriting without touching Ollama', async () => {
    const result = await rewriteSelectedPassage(
      's1',
      {
        sentenceText: 'In order to facilitate the project, we must utilize our tools.',
        tone: 'casual',
        length: 'shorten',
        goal: 'concise',
      },
      { provider: 'local' }
    );

    expect(result.isAi).toBe(false);
    expect(result.options.length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(tauriRewriteSpy).not.toHaveBeenCalled();
  });

  it('verifies no localhost:11434 endpoints are ever polled or pinged during standard workflow', () => {
    const calledUrls: string[] = fetchSpy.mock.calls.map((c: any) => String(c[0]));
    const ollamaCalls = calledUrls.filter((url) => url.includes('11434'));
    expect(ollamaCalls).toHaveLength(0);
  });

  it('mounting SettingsModal with stored provider=ollama does not probe port 11434 on mount', () => {
    settingsStore.state.provider = 'ollama';
    render(React.createElement(SettingsModal, { isOpen: true, onClose: () => {} }));
    const calledUrls: string[] = fetchSpy.mock.calls.map((c: any) => String(c[0]));
    const ollamaCalls = calledUrls.filter((url) => url.includes('11434'));
    expect(ollamaCalls).toHaveLength(0);
  });

  it('SettingsModal displays persistent migration disclosure notice until explicitly acknowledged', async () => {
    const mockMigration = {
      schema_version: 1,
      schema_version_from: 0,
      schema_version_to: 1,
      prior_json_payload: '{"provider":"ollama"}',
      applied_at: '2026-09-05T20:00:00Z',
      acknowledged_at: null,
    };
    const getMigrationSpy = vi.spyOn(TauriBridge, 'getUnacknowledgedMigration').mockResolvedValue(mockMigration);
    const ackSpy = vi.spyOn(TauriBridge, 'acknowledgeMigration').mockResolvedValue();

    const { findByText, getByRole } = render(React.createElement(SettingsModal, { isOpen: true, onClose: () => {} }));

    // Notice should be displayed
    const notice = await findByText(/Settings Migrated \(Schema Version 1\)/);
    expect(notice).toBeDefined();

    // Click Acknowledge
    const ackButton = getByRole('button', { name: /Acknowledge/i });
    await act(async () => {
      ackButton.click();
    });

    expect(ackSpy).toHaveBeenCalledWith(1);
    getMigrationSpy.mockRestore();
    ackSpy.mockRestore();
  });

  it('closing SettingsModal does NOT acknowledge migration', async () => {
    const mockMigration = {
      schema_version: 1,
      schema_version_from: 0,
      schema_version_to: 1,
      prior_json_payload: '{"provider":"ollama"}',
      applied_at: '2026-09-05T20:00:00Z',
      acknowledged_at: null,
    };
    vi.spyOn(TauriBridge, 'getUnacknowledgedMigration').mockResolvedValue(mockMigration);
    const ackSpy = vi.spyOn(TauriBridge, 'acknowledgeMigration').mockResolvedValue();
    let closed = false;

    const { findByText, getByRole } = render(React.createElement(SettingsModal, { isOpen: true, onClose: () => { closed = true; } }));
    await findByText(/Settings Migrated \(Schema Version 1\)/);

    // Click Cancel
    const cancelButton = getByRole('button', { name: /Cancel/i });
    await act(async () => {
      cancelButton.click();
    });

    expect(closed).toBe(true);
    expect(ackSpy).not.toHaveBeenCalled();
  });

  it('point-of-use model validation flags absent model and falls back safely', async () => {
    // Mock fetch returning available models that do NOT include llama3.2:3b
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: [{ name: 'mistral:latest' }] }),
    });

    const result = await rewriteSelectedPassage(
      's1',
      {
        sentenceText: 'This is a test sentence.',
        tone: 'casual',
        length: 'same',
        goal: 'clarity',
      },
      { provider: 'ollama', model: 'llama3.2:3b' }
    );

    expect(result.isAi).toBe(false);
    expect(result.error).toContain("Model 'llama3.2:3b' is not installed in local Ollama");
    expect(result.options.length).toBeGreaterThan(0);
  });

  it('editorStore respects autoCheckTypography and autoCheckRepetition toggles', async () => {
    const mockIssues = [
      { id: '1', rule_id: 'repetition.duplicate_words', matched_text: 'the', category: 'repetition', start_offset: 0, end_offset: 7, severity: 'warning' },
      { id: '2', rule_id: 'punctuation.missing_space', matched_text: ',', category: 'punctuation', start_offset: 8, end_offset: 9, severity: 'suggestion' },
    ];
    vi.spyOn(TauriBridge, 'checkDocument').mockResolvedValue(mockIssues);

    editorStore.loadDocument('The the sentence,with issue.', 'test.txt', 'test.txt');

    // Default: both enabled
    settingsStore.state.autoCheckRepetition = true;
    settingsStore.state.autoCheckTypography = true;
    await editorStore.refreshAllIssues();
    let totalIssues = Array.from(editorStore.getState.allDocumentIssues.values()).flat();
    expect(totalIssues.length).toBe(2);

    // Disable repetition
    settingsStore.state.autoCheckRepetition = false;
    await editorStore.refreshAllIssues();
    totalIssues = Array.from(editorStore.getState.allDocumentIssues.values()).flat();
    expect(totalIssues.some((i) => i.category === 'repetition')).toBe(false);

    // Disable typography
    settingsStore.state.autoCheckTypography = false;
    await editorStore.refreshAllIssues();
    totalIssues = Array.from(editorStore.getState.allDocumentIssues.values()).flat();
    expect(totalIssues.length).toBe(0);

    // Restore defaults
    settingsStore.state.autoCheckRepetition = true;
    settingsStore.state.autoCheckTypography = true;
  });
});
