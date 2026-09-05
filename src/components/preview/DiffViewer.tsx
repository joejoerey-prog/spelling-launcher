import React from 'react';
import { computeWordDiff } from '../../core/engine/diff';

export interface DiffViewerProps {
  originalText: string;
  modifiedText: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ originalText, modifiedText }) => {
  const diffResult = computeWordDiff(originalText, modifiedText);

  return (
    <div className="font-sans text-xs leading-relaxed space-y-1">
      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
        {diffResult.changes.map((c, i) => {
          if (c.op === 'insert') {
            return (
              <span
                key={i}
                className="bg-emerald-500/20 text-emerald-300 font-semibold px-0.5 rounded underline decoration-emerald-500/40"
              >
                {c.value}
              </span>
            );
          }
          if (c.op === 'delete') {
            return (
              <span
                key={i}
                className="bg-rose-950/40 text-rose-400 line-through decoration-rose-500 px-0.5 opacity-60"
              >
                {c.value}
              </span>
            );
          }
          return <span key={i} className="text-slate-300">{c.value}</span>;
        })}
      </div>
    </div>
  );
};
