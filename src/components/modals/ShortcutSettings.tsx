import React, { useState } from 'react';
import { Keyboard, RotateCcw } from 'lucide-react';
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_ACTIONS,
  ShortcutAction,
  ShortcutMap,
  eventToCombo,
  findConflict,
  formatCombo,
  validateCombo,
} from '../../core/shortcuts';

export interface ShortcutSettingsProps {
  value: ShortcutMap;
  onChange: (next: ShortcutMap) => void;
}

const labelOf = (id: ShortcutAction) => SHORTCUT_ACTIONS.find((a) => a.id === id)?.label ?? id;

export const ShortcutSettings: React.FC<ShortcutSettingsProps> = ({ value, onChange }) => {
  const [recording, setRecording] = useState<ShortcutAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingSwap, setPendingSwap] = useState<{ action: ShortcutAction; combo: string; other: ShortcutAction } | null>(null);

  const assign = (action: ShortcutAction, combo: string) => {
    onChange({ ...value, [action]: combo });
    setRecording(null);
    setPendingSwap(null);
    setMessage(null);
  };

  const handleRecordKey = (action: ShortcutAction) => (e: React.KeyboardEvent) => {
    // Keep the key press away from the app's own shortcut handler while recording.
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') {
      setRecording(null);
      setMessage(null);
      return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      assign(action, '');
      return;
    }
    const combo = eventToCombo(e.nativeEvent);
    if (!combo) return; // modifier only: keep waiting for the main key
    const invalid = validateCombo(combo);
    if (invalid) {
      setMessage(invalid);
      return;
    }
    const other = findConflict(value, combo, action);
    if (other) {
      setPendingSwap({ action, combo, other });
      setRecording(null);
      setMessage(`${formatCombo(combo)} is already used by "${labelOf(other)}".`);
      return;
    }
    assign(action, combo);
  };

  const swap = () => {
    if (!pendingSwap) return;
    const { action, combo, other } = pendingSwap;
    onChange({ ...value, [action]: combo, [other]: value[action] });
    setPendingSwap(null);
    setMessage(null);
  };

  return (
    <div className="space-y-3" role="group" aria-labelledby="shortcuts-heading">
      <div className="flex items-center justify-between">
        <div id="shortcuts-heading" className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Keyboard className="w-3.5 h-3.5" /> Keyboard Shortcuts
        </div>
        <button
          type="button"
          onClick={() => {
            onChange({ ...DEFAULT_SHORTCUTS });
            setRecording(null);
            setPendingSwap(null);
            setMessage(null);
          }}
          className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" /> Reset all
        </button>
      </div>

      {message && (
        <div role="alert" className="p-2.5 rounded-lg text-xs bg-amber-950/50 border border-amber-500/40 text-amber-200 flex items-center justify-between gap-2">
          <span>{message}</span>
          {pendingSwap && (
            <span className="flex gap-1.5 shrink-0">
              <button type="button" onClick={swap} className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40">
                Swap
              </button>
              <button type="button" onClick={() => { setPendingSwap(null); setMessage(null); }} className="px-2 py-0.5 rounded hover:bg-white/10">
                Cancel
              </button>
            </span>
          )}
        </div>
      )}

      <div className="rounded-lg border border-slate-800 divide-y divide-slate-800">
        {SHORTCUT_ACTIONS.map(({ id, label }) => {
          const isRecording = recording === id;
          const isDefault = value[id] === DEFAULT_SHORTCUTS[id];
          return (
            <div key={id} className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-850">
              <span className="text-xs text-slate-200">{label}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  aria-label={`Change shortcut for ${label}, currently ${formatCombo(value[id])}`}
                  onClick={() => { setRecording(isRecording ? null : id); setMessage(null); setPendingSwap(null); }}
                  onKeyDown={isRecording ? handleRecordKey(id) : undefined}
                  onBlur={() => isRecording && setRecording(null)}
                  className={`min-w-[96px] px-2 py-1 rounded-md border font-mono text-xs text-center transition-colors ${
                    isRecording
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200 animate-pulse'
                      : 'border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-500'
                  }`}
                >
                  {isRecording ? 'Press keys…' : formatCombo(value[id])}
                </button>
                <button
                  type="button"
                  aria-label={`Reset shortcut for ${label}`}
                  title="Reset to default"
                  disabled={isDefault}
                  onClick={() => assign(id, DEFAULT_SHORTCUTS[id])}
                  className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-500"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-500">
        Click a shortcut, then press the new keys. Esc cancels, Backspace removes the shortcut. The system-wide shortcut works while the app is running, even when another app is in front.
      </p>
    </div>
  );
};
