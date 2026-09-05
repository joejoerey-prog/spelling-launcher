import React from 'react';
import { Check, Sparkles, Wand2 } from 'lucide-react';
import { RewriteOption } from '../../types/suggestions';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { editorStore } from '../../core/state/editorStore';

export interface RewriteCardProps {
  option: RewriteOption;
  index: number;
}

export const RewriteCard: React.FC<RewriteCardProps> = ({ option }) => {
  const handleAccept = () => {
    editorStore.applySentenceRevision(option.sentenceId, option.rewrittenText, `Accepted: ${option.label}`);
  };

  const getBadgeVariant = (tone?: string) => {
    switch (tone) {
      case 'professional':
        return 'info';
      case 'casual':
        return 'warning';
      case 'academic':
        return 'primary';
      case 'confident':
        return 'success';
      default:
        return 'suggestion';
    }
  };

  return (
    <Card
      hoverable
      className="border-slate-800 bg-slate-850 hover:border-sky-500/50 hover:bg-slate-800/90 transition-all p-3.5 space-y-2.5 group"
    >
      {/* Card Header: Label & Badges */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {option.isAiGenerated ? (
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          ) : (
            <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
          )}
          <span className="font-semibold text-xs text-slate-200 group-hover:text-white transition-colors">
            {option.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {option.tone && (
            <Badge variant={getBadgeVariant(option.tone)} size="sm">
              {option.tone}
            </Badge>
          )}
          {option.length && option.length !== 'same' && (
            <Badge variant="neutral" size="sm">
              {option.length}
            </Badge>
          )}
        </div>
      </div>

      {/* Side-by-side Inline Diff Render */}
      <div className="text-sm leading-relaxed text-slate-200 font-sans p-2 rounded-lg bg-slate-900/80 border border-slate-800">
        {option.diff.map((change, idx) => {
          if (change.op === 'insert') {
            return (
              <span
                key={idx}
                className="bg-emerald-500/20 text-emerald-300 font-medium px-0.5 rounded underline decoration-emerald-500/40 decoration-2"
              >
                {change.value}
              </span>
            );
          }
          if (change.op === 'delete') {
            return (
              <span
                key={idx}
                className="bg-rose-950/40 text-rose-400 line-through decoration-rose-500 px-0.5 opacity-60 text-xs"
              >
                {change.value}
              </span>
            );
          }
          return <span key={idx}>{change.value}</span>;
        })}
      </div>

      {/* Description & Action Bar */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
          {option.description}
        </p>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={handleAccept}
            className="text-xs px-3 py-1 font-semibold"
          >
            <Check className="w-3.5 h-3.5 mr-1" /> Accept
          </Button>
        </div>
      </div>
    </Card>
  );
};
