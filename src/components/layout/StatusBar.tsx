import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { editorStore } from '../../core/state/editorStore';
import { settingsStore } from '../../core/state/settingsStore';

export const StatusBar: React.FC = () => {
  const state = editorStore.getState;
  const settings = settingsStore.state;
  const totalIssues = Array.from(state.allDocumentIssues.values()).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <footer className="h-7 border-t border-white/10 bg-slate-950 px-4 flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums select-none shrink-0">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          Runs on this Mac
        </span>
        <span className="text-slate-600">/</span>
        <span>
          Words <strong className="font-normal text-slate-200">{state.stats.wordCount}</strong>
        </span>
        <span>
          Sentences <strong className="font-normal text-slate-200">{state.stats.sentenceCount}</strong>
        </span>
        <span>
          Reading time <strong className="font-normal text-slate-200">{state.stats.readingTimeMinutes} min</strong>
        </span>
        {state.stats.readabilityScore !== undefined && (
          <>
            <span className="text-slate-600">/</span>
            <span title={`Flesch Reading Ease: ${state.stats.readabilityScore}/100`}>
              Readability <strong className="font-normal text-slate-200">{state.stats.readabilityLabel} (Grade {state.stats.readabilityGrade})</strong>
            </span>
          </>
        )}
        {totalIssues > 0 && (
          <>
            <span className="text-slate-600">/</span>
            <span className="text-amber-400">
              {totalIssues} issue{totalIssues > 1 ? 's' : ''}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span>{settings.provider === 'local' ? 'Local checks' : settings.provider}</span>
      </div>
    </footer>
  );
};
