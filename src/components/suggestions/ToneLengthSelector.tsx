import React from 'react';
import { RewriteTone, RewriteLength } from '../../types/suggestions';
import { editorStore } from '../../core/state/editorStore';

export const ToneLengthSelector: React.FC = () => {
  const state = editorStore.getState;

  const tones: { id: RewriteTone; label: string }[] = [
    { id: 'natural', label: 'Natural' },
    { id: 'casual', label: 'Casual' },
    { id: 'professional', label: 'Professional' },
    { id: 'academic', label: 'Academic' },
    { id: 'confident', label: 'Confident' },
    { id: 'direct', label: 'Direct' },
  ];

  const lengths: { id: RewriteLength; label: string }[] = [
    { id: 'same', label: 'Standard' },
    { id: 'shorten', label: 'Shorten' },
    { id: 'expand', label: 'Expand' },
  ];

  const handleToneSelect = (tone: RewriteTone) => {
    editorStore.setToneAndLength(tone, state.selectedLength, state.selectedGoal);
  };

  const handleLengthSelect = (length: RewriteLength) => {
    editorStore.setToneAndLength(state.selectedTone, length, state.selectedGoal);
  };

  return (
    <div className="space-y-2 p-3 bg-ink-850 rounded-xl border border-white/10 text-xs">
      {/* Tone selection */}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <span className="text-xs font-medium text-ink-400">
          Tone
        </span>
        <div className="flex items-center gap-1 flex-wrap">
          {tones.map((t) => {
            const active = state.selectedTone === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleToneSelect(t.id)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  active
                    ? 'bg-ink-100 text-ink-900'
                    : 'bg-ink-800 text-ink-300 hover:text-ink-100 hover:bg-ink-700'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Length selection */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-medium text-ink-400">
          Length
        </span>
        <div className="flex items-center gap-1">
          {lengths.map((l) => {
            const active = state.selectedLength === l.id;
            return (
              <button
                key={l.id}
                onClick={() => handleLengthSelect(l.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  active
                    ? 'bg-ink-100 text-ink-900'
                    : 'bg-ink-800 text-ink-300 hover:text-ink-100 hover:bg-ink-700'
                }`}
              >
                {l.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
