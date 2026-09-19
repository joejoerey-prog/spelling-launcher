import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { settingsStore } from '../src/core/state/settingsStore';
import { editorStore } from '../src/core/state/editorStore';
import { TauriBridge } from '../src/core/bridge/tauriBridge';

describe('Dialect & Language Settings Specification', () => {
  let checkDocSpy: any;
  let getSettingSpy: any;
  let setSettingSpy: any;

  beforeEach(() => {
    checkDocSpy = vi.spyOn(TauriBridge, 'checkDocument').mockResolvedValue([]);
    getSettingSpy = vi.spyOn(TauriBridge, 'getAppSetting');
    setSettingSpy = vi.spyOn(TauriBridge, 'setAppSetting').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to British English (en_GB) on fresh initial state', () => {
    expect(settingsStore.state.language).toBe('en_GB');
  });

  it('persists en_GB when loaded from empty stored settings', async () => {
    getSettingSpy.mockResolvedValueOnce(null);
    await settingsStore.load();
    expect(settingsStore.state.language).toBe('en_GB');
  });

  it('validates persisted language and falls back to en_GB if stored value is invalid or corrupted', async () => {
    // Simulate corrupted/unrecognised language stored in sqlite
    getSettingSpy.mockResolvedValueOnce(
      JSON.stringify({
        provider: 'local',
        language: 'fr_FR',
      })
    );

    await settingsStore.load();
    expect(settingsStore.state.language).toBe('en_GB');
  });

  it('allows selecting American English (en_US) and updates store', async () => {
    await settingsStore.update({ language: 'en_US' });
    expect(settingsStore.state.language).toBe('en_US');
    expect(setSettingSpy).toHaveBeenCalledWith(
      'user_settings',
      expect.stringContaining('"language":"en_US"')
    );
  });

  it('sanitizes update to en_GB if an invalid language is supplied', async () => {
    await settingsStore.update({ language: 'invalid_lang' as any });
    expect(settingsStore.state.language).toBe('en_GB');
  });

  it('passes en_GB by default to TauriBridge.checkDocument', async () => {
    await settingsStore.update({ language: 'en_GB' });
    const sample = 'This is a favourable test with organised colour schemes at the centre.';
    editorStore.loadDocument(sample, 'test.md', 'test.md');
    await editorStore.refreshAllIssues();

    expect(checkDocSpy).toHaveBeenCalledWith(sample, 'en_GB');
  });

  it('dynamically switches language passed to TauriBridge.checkDocument when en_US is selected', async () => {
    await settingsStore.update({ language: 'en_US' });
    const sample = 'This is a favorable test with organized color schemes at the center.';
    editorStore.loadDocument(sample, 'test.md', 'test.md');
    await editorStore.refreshAllIssues();

    expect(checkDocSpy).toHaveBeenCalledWith(sample, 'en_US');
  });
});
