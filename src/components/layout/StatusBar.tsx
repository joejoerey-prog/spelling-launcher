import React from 'react';
import { ShieldCheck, HardDrive, Rocket } from 'lucide-react';
import { editorStore } from '../../core/state/editorStore';
import { settingsStore } from '../../core/state/settingsStore';

export const StatusBar: React.FC = () => {
  const state = editorStore.getState;
  const settings = settingsStore.state;
  const totalIssues = Array.from(state.allDocumentIssues.values()).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <footer className="h-7 border-t border-slate-800 bg-slate-950 px-4 flex items-center justify-between text-[11px] text-slate-400 select-none shrink-0">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          100% Local-First (Privacy Guaranteed)
        </span>
        <span>•</span>
        <span>
          Words: <strong className="text-slate-200">{state.stats.wordCount}</strong>
        </span>
        <span>
          Sentences: <strong className="text-slate-200">{state.stats.sentenceCount}</strong>
        </span>
        <span>
          Est. Reading Time: <strong className="text-slate-200">{state.stats.readingTimeMinutes} min</strong>
        </span>
        {state.stats.readabilityScore !== undefined && (
          <>
            <span>•</span>
            <span title={`Flesch Reading Ease: ${state.stats.readabilityScore}/100`}>
              Readability: <strong className="text-slate-200">{state.stats.readabilityLabel} (Grade {state.stats.readabilityGrade})</strong>
            </span>
          </>
        )}
        {totalIssues > 0 && (
          <>
            <span>•</span>
            <span className="text-amber-400 font-medium">
              {totalIssues} issue{totalIssues > 1 ? 's' : ''} detected
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-slate-400">
          <Rocket className="w-3 h-3 text-emerald-400" />
          Launcher: {settings.provider === 'local' ? 'Local Heuristics' : settings.provider.toUpperCase()}
        </span>
        <span>•</span>
        <span className="flex items-center gap-1 text-slate-500">
          <HardDrive className="w-3 h-3" />
          SQLite Persisted
        </span>
      </div>
    </footer>
  );
};
