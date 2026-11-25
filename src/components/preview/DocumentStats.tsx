import React from 'react';
import { DocumentStats as DocStatsType } from '../../types/document';

export interface DocumentStatsProps {
  stats: DocStatsType;
  revisionsCount: number;
}

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="px-3 py-2">
    <div className="text-xs text-ink-500">{label}</div>
    <div className="font-mono text-sm text-ink-100 tabular-nums">{value}</div>
  </div>
);

export const DocumentStats: React.FC<DocumentStatsProps> = ({ stats, revisionsCount }) => {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-850 text-xs">
      <div className="grid grid-cols-2">
        <Stat label="Words" value={stats.wordCount} />
        <Stat label="Reading time" value={`${stats.readingTimeMinutes} min`} />
        <Stat label="Words per sentence" value={stats.averageSentenceLength} />
        <Stat label="Revisions" value={revisionsCount} />
      </div>
      {stats.readabilityScore !== undefined && (
        <div className="flex items-center justify-between border-t border-white/10 px-3 py-2">
          <div>
            <div className="text-xs text-ink-500">Readability (Flesch)</div>
            <div className="text-sm text-ink-100">
              {stats.readabilityLabel}
              <span className="ml-1.5 font-mono text-xs text-ink-400">grade {stats.readabilityGrade}</span>
            </div>
          </div>
          <span
            className={`font-mono text-sm tabular-nums ${
              stats.readabilityScore >= 60 ? 'text-emerald-400' : stats.readabilityScore >= 40 ? 'text-amber-400' : 'text-rose-400'
            }`}
          >
            {stats.readabilityScore}/100
          </span>
        </div>
      )}
    </div>
  );
};
