import React, { useState, useEffect } from 'react';
import { Eye, Copy, Download, GitCommit, CheckCheck } from 'lucide-react';
import { editorStore } from '../../core/state/editorStore';
import { DocumentStats } from './DocumentStats';
import { DiffViewer } from './DiffViewer';
import { Button } from '../ui/Button';

export interface ResultPreviewPaneProps {
  onOpenExport: () => void;
}

export const ResultPreviewPane: React.FC<ResultPreviewPaneProps> = ({ onOpenExport }) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    return editorStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  const state = editorStore.getState;
  const [showSessionDiffs, setShowSessionDiffs] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(state.document.rawContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sessionDiffEntries = Array.from(state.sessionDiffs.entries());

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Pane Header */}
      <div className="h-10 border-b border-white/10 bg-ink-900 px-4 flex items-center justify-between text-xs font-medium text-ink-300 select-none shrink-0">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-ink-500" />
          <span>Result</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSessionDiffs(!showSessionDiffs)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              showSessionDiffs
                ? 'bg-ink-800 text-ink-100 border border-white/10'
                : 'text-ink-400 hover:text-ink-200 hover:bg-ink-800'
            }`}
            title="Toggle changes view"
          >
            <GitCommit className="w-3 h-3" />
            {showSessionDiffs ? 'Document' : 'Changes'}
          </button>
        </div>
      </div>

      {/* Pane Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick Document Stats */}
        <DocumentStats stats={state.stats} revisionsCount={sessionDiffEntries.length} />

        {/* Content Viewer / Session Diffs */}
        {showSessionDiffs ? (
          <div className="space-y-3">
            <div className="text-xs font-medium text-ink-400">
              Changes this session ({sessionDiffEntries.length})
            </div>
            {sessionDiffEntries.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-ink-850 border border-white/10 text-xs text-ink-500">
                No revisions accepted yet.
              </div>
            ) : (
              sessionDiffEntries.map(([sId, diff]) => (
                <div key={sId} className="space-y-1">
                  <DiffViewer originalText={diff.original} modifiedText={diff.current} />
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="p-4 bg-ink-850 rounded-xl border border-white/10 font-serif text-[15px] text-ink-200 leading-7 space-y-3">
            {state.document.paragraphs.map((p) => {
              if (p.isBlank) return <div key={p.id} className="h-3" />;
              if (p.isCodeBlock) {
                return (
                  <pre
                    key={p.id}
                    className="p-3 bg-ink-950 rounded-lg text-xs font-mono text-ink-300 overflow-x-auto border border-white/10"
                  >
                    {p.rawText}
                  </pre>
                );
              }
              return (
                <p key={p.id} className="leading-relaxed">
                  {p.sentences.map((s, idx) => {
                    const diffEntry = state.sessionDiffs.get(s.id);
                    return (
                      <span
                        key={s.id}
                        className={diffEntry ? 'text-emerald-200 underline decoration-emerald-500/50 underline-offset-4' : ''}
                      >
                        {idx === 0 && s.prefix ? (
                          <strong className="text-ink-100 font-medium">{s.prefix}</strong>
                        ) : null}
                        {idx > 0 ? ' ' : ''}
                        {s.trimmedText}
                      </span>
                    );
                  })}
                </p>
              );
            })}
          </div>
        )}
      </div>

      {/* Export & Copy Footer */}
      <div className="p-3 border-t border-white/10 bg-ink-900 flex items-center justify-between gap-2 shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          className="flex-1 text-xs"
        >
          {copied ? <CheckCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
          {copied ? 'Copied' : 'Copy text'}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenExport}
          className="flex-1 text-xs"
        >
          <Download className="w-3.5 h-3.5 mr-1" />
          Export
        </Button>
      </div>
    </div>
  );
};
