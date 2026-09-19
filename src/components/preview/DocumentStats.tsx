import React from 'react';
import { BookOpen, Clock, FileCheck2, BarChart2, Sparkles } from 'lucide-react';
import { DocumentStats as DocStatsType } from '../../types/document';
import { Card } from '../ui/Card';

export interface DocumentStatsProps {
  stats: DocStatsType;
  revisionsCount: number;
}

export const DocumentStats: React.FC<DocumentStatsProps> = ({ stats, revisionsCount }) => {
  return (
    <Card className="border-slate-800 bg-slate-900/60 p-3 grid grid-cols-2 gap-2 text-xs">
      <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950/50">
        <BookOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <div>
          <div className="text-[10px] text-slate-500 uppercase">Words</div>
          <div className="font-semibold text-slate-200">{stats.wordCount}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950/50">
        <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <div>
          <div className="text-[10px] text-slate-500 uppercase">Read Time</div>
          <div className="font-semibold text-slate-200">{stats.readingTimeMinutes} min</div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950/50">
        <BarChart2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <div>
          <div className="text-[10px] text-slate-500 uppercase">Avg / Sentence</div>
          <div className="font-semibold text-slate-200">{stats.averageSentenceLength} w</div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950/50">
        <FileCheck2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <div>
          <div className="text-[10px] text-slate-500 uppercase">Revisions</div>
          <div className="font-semibold text-slate-200">{revisionsCount}</div>
        </div>
      </div>

      {stats.readabilityScore !== undefined && (
        <div className="col-span-2 flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Readability (Flesch)</div>
              <div className="font-semibold text-slate-200">
                {stats.readabilityLabel}{' '}
                <span className="text-slate-400 font-normal text-[11px]">(Grade {stats.readabilityGrade})</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                stats.readabilityScore >= 60
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : stats.readabilityScore >= 40
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {stats.readabilityScore}/100
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};
