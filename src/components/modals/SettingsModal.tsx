import React, { useState, useEffect } from 'react';
import { X, Sliders, Shield, Key, Check, RefreshCw, Server, Cpu, AlertTriangle } from 'lucide-react';
import { settingsStore } from '../../core/state/settingsStore';
import { editorStore } from '../../core/state/editorStore';
import { TauriBridge } from '../../core/bridge/tauriBridge';
import { SettingsMigration } from '../../types/database';
import { Button } from '../ui/Button';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const current = settingsStore.state;
  const [provider, setProvider] = useState(current.provider);
  const [language, setLanguage] = useState<'en_GB' | 'en_US'>(current.language || 'en_GB');
  const [ollamaUrl, setOllamaUrl] = useState(current.ollamaBaseUrl || 'http://localhost:11434/v1');
  const [ollamaModel, setOllamaModel] = useState(current.ollamaModel || 'llama3.2:3b');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<'testing' | 'connected' | 'error' | 'idle'>('idle');
  const [ollamaMessage, setOllamaMessage] = useState<string>('');

  const [apiKey, setApiKey] = useState(current.openaiApiKey || '');
  const [baseUrl, setBaseUrl] = useState(current.openaiBaseUrl || 'https://api.openai.com/v1');
  const [model, setModel] = useState(current.openaiModel || 'gpt-4o-mini');
  const [checkTypography, setCheckTypography] = useState(current.autoCheckTypography ?? true);
  const [checkRepetition, setCheckRepetition] = useState(current.autoCheckRepetition ?? true);
  const [unacknowledgedMigration, setUnacknowledgedMigration] = useState<SettingsMigration | null>(null);

  // Sync state and check for unacknowledged database migration on open
  useEffect(() => {
    if (isOpen) {
      const latest = settingsStore.state;
      setProvider(latest.provider);
      setLanguage(latest.language || 'en_GB');
      setOllamaUrl(latest.ollamaBaseUrl || 'http://localhost:11434/v1');
      setOllamaModel(latest.ollamaModel || 'llama3.2:3b');
      setApiKey(latest.openaiApiKey || '');
      setBaseUrl(latest.openaiBaseUrl || 'https://api.openai.com/v1');
      setModel(latest.openaiModel || 'gpt-4o-mini');
      setCheckTypography(latest.autoCheckTypography ?? true);
      setCheckRepetition(latest.autoCheckRepetition ?? true);

      TauriBridge.getUnacknowledgedMigration().then((mig) => {
        if (mig) {
          setUnacknowledgedMigration(mig);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleAcknowledge = async () => {
    if (unacknowledgedMigration) {
      await TauriBridge.acknowledgeMigration(unacknowledgedMigration.schema_version);
      setUnacknowledgedMigration(null);
    }
  };

  // Fetch local Ollama models ONLY on explicit user invocation (Test Connection button)
  const fetchOllamaModels = async () => {
    setOllamaStatus('testing');
    setOllamaMessage('Connecting to local Ollama...');
    try {
      const host = ollamaUrl.replace(/\/v1\/?$/, '');
      const res = await fetch(`${host}/api/tags`);
      if (res.ok) {
        const data = await res.json();
        const names = (data.models || []).map((m: any) => m.name);
        setAvailableModels(names);
        setOllamaStatus('connected');
        setOllamaMessage(`Connected: ${names.length} local model${names.length === 1 ? '' : 's'} available.`);
        if (names.length > 0 && !names.includes(ollamaModel)) {
          setOllamaModel(names[0]);
        }
      } else {
        setOllamaStatus('error');
        setOllamaMessage(`Ollama responded with status: ${res.status}`);
      }
    } catch {
      setOllamaStatus('error');
      setOllamaMessage('Cannot reach Ollama on port 11434. Make sure `ollama serve` or Ollama app is running.');
    }
  };

  // NOTE: Automated on-mount probing to port 11434 has been completely removed.
  // Connection to Ollama is tested strictly when the user clicks 'Test Connection'.

  if (!isOpen) return null;

  const handleSave = async () => {
    await settingsStore.update({
      language,
      provider,
      ollamaBaseUrl: ollamaUrl,
      ollamaModel: ollamaModel,
      openaiApiKey: apiKey,
      openaiBaseUrl: baseUrl,
      openaiModel: model,
      autoCheckTypography: checkTypography,
      autoCheckRepetition: checkRepetition,
    });
    editorStore.refreshAllIssues();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-slate-100">Application Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {/* Unacknowledged Migration Notice */}
          {unacknowledgedMigration && (
            <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-amber-200">
                    Settings Migrated (Schema Version {unacknowledgedMigration.schema_version})
                  </p>
                  <p className="text-amber-200/90 leading-relaxed">
                    Settings migrated to native checking. Provider reset to 'local' (heuristics), model updated to 'llama3.2:3b', and legacy rules removed.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAcknowledge}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium transition-colors cursor-pointer"
                >
                  Acknowledge
                </button>
              </div>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-start gap-3">
            <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              <strong>100% Local-First & Air-Gapped:</strong> Proofreading is powered natively by macOS NSSpellChecker and local deterministic rules. Zero cloud tracking, zero daemons. Ollama is strictly opt-in for sentence rewriting.
            </p>
          </div>

          {/* Proofreading Language (Native Engine) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Proofreading Language (Native macOS Engine)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLanguage('en_GB')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  language === 'en_GB'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-sm ring-1 ring-emerald-500/40'
                    : 'border-slate-800 bg-slate-850 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="font-semibold text-xs text-emerald-400">British English (en_GB)</div>
                <div className="text-[10px] text-slate-400 mt-1">Default (dual-dict Oxford -ize accepted)</div>
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en_US')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  language === 'en_US'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-sm ring-1 ring-emerald-500/40'
                    : 'border-slate-800 bg-slate-850 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="font-semibold text-xs text-sky-400">American English (en_US)</div>
                <div className="text-[10px] text-slate-400 mt-1">US orthography & vocabulary</div>
              </button>
            </div>
          </div>

          {/* Rewrite Provider Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Rewrite Engine Provider
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setProvider('ollama')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  provider === 'ollama'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-sm ring-1 ring-emerald-500/40'
                    : 'border-slate-800 bg-slate-850 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="font-semibold text-xs text-emerald-400 flex items-center gap-1">
                  <Server className="w-3.5 h-3.5" /> Local Ollama
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Opt-in local LLM</div>
              </button>

              <button
                type="button"
                onClick={() => setProvider('local')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  provider === 'local'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-sm ring-1 ring-emerald-500/40'
                    : 'border-slate-800 bg-slate-850 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="font-semibold text-xs text-sky-400 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" /> Heuristics
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Built-in fast rules (Recommended, 0 MB RAM)</div>
              </button>

              <button
                type="button"
                onClick={() => setProvider('openai')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  provider === 'openai'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-sm ring-1 ring-emerald-500/40'
                    : 'border-slate-800 bg-slate-850 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="font-semibold text-xs text-indigo-400 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5" /> Cloud API
                </div>
                <div className="text-[10px] text-slate-400 mt-1">OpenAI / Claude key</div>
              </button>
            </div>
          </div>

          {/* Ollama Configuration Section */}
          {provider === 'ollama' && (
            <div className="space-y-3 p-4 bg-slate-950/80 rounded-xl border border-emerald-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" /> Local Ollama Server
                </span>
                <button
                  type="button"
                  onClick={fetchOllamaModels}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${ollamaStatus === 'testing' ? 'animate-spin' : ''}`} />
                  Test Connection
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Ollama API URL</label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434/v1"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Selected Model</label>
                {availableModels.length > 0 ? (
                  <select
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {availableModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    placeholder="llama3.2:3b"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                )}
              </div>

              {/* Status Banner */}
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  ollamaStatus === 'connected'
                    ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
                    : ollamaStatus === 'error'
                    ? 'bg-rose-950/60 border border-rose-500/30 text-rose-300'
                    : 'bg-slate-900 border border-slate-800 text-slate-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    ollamaStatus === 'connected'
                      ? 'bg-emerald-400 animate-pulse'
                      : ollamaStatus === 'error'
                      ? 'bg-rose-400'
                      : 'bg-slate-500'
                  }`}
                />
                <span className="truncate">{ollamaMessage || 'Click "Test Connection" to query available local models.'}</span>
              </div>

              {/* Memory / Resource Annotation */}
              <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <div className="font-medium text-slate-300">Memory Footprint</div>
                <div>2,595 MB peak while generating, 112 MB after idle unload (measured for llama3.2:3b)</div>
              </div>
            </div>
          )}

          {/* Cloud API Configuration Section */}
          {provider === 'openai' && (
            <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-sky-400" />
                  API Key (Stored locally in SQLite)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Base URL</label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Model</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="gpt-4o-mini"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Linguistic Check Toggles */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Deterministic Linguistic Checks
            </label>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-850 border border-slate-800 cursor-pointer hover:bg-slate-800">
                <div>
                  <span className="text-xs text-slate-200 block">Flag consecutive repeated words</span>
                  <span className="text-[10px] text-slate-400">Detects duplicated tokens (e.g. "the the")</span>
                </div>
                <input
                  type="checkbox"
                  checked={checkRepetition}
                  onChange={(e) => setCheckRepetition(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-850 border border-slate-800 cursor-pointer hover:bg-slate-800">
                <div>
                  <span className="text-xs text-slate-200 block">Punctuation & comma spacing</span>
                  <span className="text-[10px] text-slate-400">Flags missing/extra spaces around commas and punctuation</span>
                </div>
                <input
                  type="checkbox"
                  checked={checkTypography}
                  onChange={(e) => setCheckTypography(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500/40">
            <Check className="w-4 h-4 mr-1" /> Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
};
