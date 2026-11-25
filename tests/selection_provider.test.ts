import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TauriBridge } from '../src/core/bridge/tauriBridge';
import { rewriteSelectedPassage } from '../src/core/engine/aiRewriter';
import { isLoopbackUrl, selectionCandidates, SelectionRequest } from '../src/core/engine/selectionProvider';
import { AppSettings } from '../src/types/database';

const settings = (over: Partial<AppSettings> = {}): AppSettings => ({
  provider: 'local',
  ollamaBaseUrl: 'http://localhost:11434/v1',
  ollamaModel: 'llama3.2:3b',
  openaiApiKey: 'sk-test',
  openaiBaseUrl: 'https://api.example.test/v1',
  openaiModel: 'test-model',
  autoCheckTypography: true,
  autoCheckRepetition: true,
  theme: 'dark',
  language: 'en_GB',
  ...over,
});

const request = (over: Partial<SelectionRequest> = {}): SelectionRequest => ({
  kind: 'suggest',
  text: 'We need to figure out how to get rid of this bug.',
  paragraph: 'Context before. We need to figure out how to get rid of this bug. Context after.',
  tone: 'natural',
  length: 'same',
  goal: 'clarity',
  dialect: 'en_GB',
  terms: ['Acme'],
  issueEdits: [],
  ...over,
});

let fetchSpy: any;
let bridgeSpy: any;

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ models: [{ name: 'llama3.2:3b' }] })));
  bridgeSpy = vi.spyOn(TauriBridge, 'rewritePassage').mockResolvedValue({
    variations: ['We must determine how to remove this bug.', 'We need to work out how to drop this bug.'],
    latency_ms: 1,
    provider: 'Ollama (llama3.2:3b)',
  });
});
afterEach(() => vi.restoreAllMocks());

describe('no text leaves the Mac unless Cloud API is chosen', () => {
  it('local provider makes no network or bridge call, for Suggest or Polish', async () => {
    const s = await selectionCandidates(request(), settings());
    const p = await selectionCandidates(request({ kind: 'polish', text: 'We met due to the fact that it rained.' }), settings());
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(bridgeSpy).not.toHaveBeenCalled();
    expect(s.isAi).toBe(false);
    expect(s.candidates.length).toBeGreaterThan(0);
    expect(p.candidates[0].text).toContain('because');
  });

  it('an Ollama address that is not on this Mac is treated as local, with a notice', async () => {
    const r = await selectionCandidates(request(), settings({ provider: 'ollama', ollamaBaseUrl: 'http://192.168.1.20:11434/v1' }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(bridgeSpy).not.toHaveBeenCalled();
    expect(r.notice).toMatch(/not on this Mac/);
    expect(r.isAi).toBe(false);
  });

  it('recognises loopback addresses', () => {
    expect(['http://localhost:11434/v1', 'http://127.0.0.1:11434', 'http://[::1]:11434/v1'].every(isLoopbackUrl)).toBe(true);
    expect(['http://10.0.0.2:11434', 'https://ollama.example.com', 'not a url'].some(isLoopbackUrl)).toBe(false);
  });

  it('local Ollama is called with the selection, its paragraph, dialect and protected terms', async () => {
    const r = await selectionCandidates(request(), settings({ provider: 'ollama' }));
    expect(bridgeSpy).toHaveBeenCalledTimes(1);
    expect(bridgeSpy.mock.calls[0][0]).toMatchObject({
      text: 'We need to figure out how to get rid of this bug.',
      mode: 'suggest',
      context: 'Context before. We need to figure out how to get rid of this bug. Context after.',
      dialect: 'en_GB',
      protected_terms: ['Acme'],
      base_url: 'http://localhost:11434/v1',
    });
    expect(r.isAi).toBe(true);
    expect(r.candidates.map((c) => c.label)).toEqual(['Option 1', 'Option 2']);
  });

  it('Cloud API is only used when chosen, with the saved key and address', async () => {
    await selectionCandidates(request({ kind: 'polish' }), settings({ provider: 'openai' }));
    expect(bridgeSpy.mock.calls[0][0]).toMatchObject({
      mode: 'polish',
      api_key: 'sk-test',
      base_url: 'https://api.example.test/v1',
      model: 'test-model',
    });
  });

  it('falls back to the built-in suggestions, with the reason, when the provider fails', async () => {
    bridgeSpy.mockRejectedValue(new Error('connection refused'));
    const r = await selectionCandidates(request(), settings({ provider: 'ollama' }));
    expect(r.isAi).toBe(false);
    expect(r.notice).toMatch(/connection refused/);
    expect(r.candidates.length).toBeGreaterThan(0);
  });
});

describe('built-in candidates for a fragment', () => {
  it('leave out the padding options that only make sense for a whole sentence', async () => {
    const r = await selectionCandidates(request({ text: 'a quick note' }), settings());
    const labels = r.candidates.map((c) => c.label);
    expect(labels).not.toContain('Expanded & Nuanced');
    expect(labels).not.toContain('Formal Transition');
    expect(labels).not.toContain('Clear & Fluid');
  });

  it('Polish applies native fixes inside the selection first, then trims wordiness', async () => {
    const r = await selectionCandidates(
      request({ kind: 'polish', text: 'We recieved it due to the fact that it rained.', issueEdits: [{ start: 3, end: 11, text: 'received' }] }),
      settings()
    );
    expect(r.candidates[0].text).toBe('We received it because it rained.');
  });
});

describe('the plain sentence rewrite is unchanged', () => {
  it('sends no selection fields when no mode is given', async () => {
    await rewriteSelectedPassage(
      's1',
      { sentenceText: 'One sentence here.', tone: 'natural', length: 'same', goal: 'clarity' },
      { provider: 'ollama', baseUrl: 'http://localhost:11434/v1', model: 'llama3.2:3b' }
    );
    const sent = bridgeSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(sent).sort()).toEqual(['api_key', 'base_url', 'goal', 'length', 'model', 'text', 'tone']);
  });
});
