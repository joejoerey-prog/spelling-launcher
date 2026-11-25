import React from 'react';
import { computeWordDiff } from '../../core/engine/diff';

export interface DiffViewerProps {
  originalText: string;
  modifiedText: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ originalText, modifiedText }) => {
  const diffResult = computeWordDiff(originalText, modifiedText);

  return (
    <div className="font-serif text-[15px] leading-7 space-y-1">
      <div className="p-4 rounded-xl bg-ink-850 border border-white/10">
        {diffResult.changes.map((c, i) => {
          if (c.op === 'insert') {
            return (
              <span
                key={i}
                className="text-emerald-300 underline decoration-emerald-500/60 underline-offset-4"
              >
                {c.value}
              </span>
            );
          }
          if (c.op === 'delete') {
            return (
              <span
                key={i}
                className="text-rose-400/80 line-through decoration-rose-500/70"
              >
                {c.value}
              </span>
            );
          }
          return <span key={i} className="text-ink-300">{c.value}</span>;
        })}
      </div>
    </div>
  );
};
