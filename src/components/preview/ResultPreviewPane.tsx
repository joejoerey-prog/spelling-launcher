import React, { useState } from 'react';
import { Eye, Copy, Download, GitCommit, CheckCheck } from 'lucide-react';
import { editorStore } from '../../core/state/editorStore';
import { DocumentStats } from './DocumentStats';
import { DiffViewer } from './DiffViewer';
import { Button } from '../ui/Button';

export interface ResultPreviewPaneProps {
  onOpenExport: () => void;
}

export const ResultPreviewPane: React.FC<ResultPreviewPaneProps> = ({ onOpenExport }) => {
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
      <div className="h-10 border-b border-slate-800 bg-slate-900 px-4 flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider select-none shrink-0">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-400" />
          <span>Accepted Result Preview</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSessionDiffs(!showSessionDiffs)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              showSessionDiffs
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Toggle Session Diff View"
          >
            <GitCommit className="w-3 h-3" />
            {showSessionDiffs ? 'Doc View' : 'Diffs'}
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
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Changes in this session ({sessionDiffEntries.length})
            </div>
            {sessionDiffEntries.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-500">
                No revisions accepted yet in this session.
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
          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 font-sans text-sm text-slate-200 leading-relaxed space-y-3">
            {state.document.paragraphs.map((p) => {
              if (p.isBlank) return <div key={p.id} className="h-3" />;
              if (p.isCodeBlock) {
                return (
                  <pre
                    key={p.id}
                    className="p-3 bg-slate-950 rounded-lg text-xs font-mono text-sky-300 overflow-x-auto border border-slate-800/80"
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
                        className={diffEntry ? 'bg-emerald-950/40 text-emerald-100 rounded px-0.5' : ''}
                      >
                        {idx === 0 && s.prefix ? (
                          <strong className="text-slate-100 font-bold">{s.prefix}</strong>
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
      <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-2 shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          className="flex-1 text-xs"
        >
          {copied ? <CheckCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
          {copied ? 'Copied!' : 'Copy Text'}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenExport}
          className="flex-1 text-xs"
        >
          <Download className="w-3.5 h-3.5 mr-1" />
          Export File
        </Button>
      </div>
    </div>
  );
};
