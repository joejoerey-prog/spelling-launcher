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
      className="border-white/10 bg-ink-850 hover:border-white/20 hover:bg-ink-800 transition-colors p-3.5 space-y-2.5 group"
    >
      {/* Card Header: Label & Badges */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {option.isAiGenerated ? (
            <Sparkles className="w-3.5 h-3.5 text-ink-400" />
          ) : (
            <Wand2 className="w-3.5 h-3.5 text-ink-400" />
          )}
          <span className="font-medium text-xs text-ink-200 transition-colors">
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
      <div className="text-[15px] leading-7 text-ink-200 font-serif p-3 rounded-lg bg-ink-900 border border-white/10">
        {option.diff.map((change, idx) => {
          if (change.op === 'insert') {
            return (
              <span
                key={idx}
                className="text-emerald-300 underline decoration-emerald-500/60 underline-offset-4"
              >
                {change.value}
              </span>
            );
          }
          if (change.op === 'delete') {
            return (
              <span
                key={idx}
                className="text-rose-400/80 line-through decoration-rose-500/70"
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
        <p className="text-xs text-ink-500 truncate max-w-[12rem]">
          {option.description}
        </p>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={handleAccept}
            className="text-xs px-3 py-1 font-medium"
          >
            <Check className="w-3.5 h-3.5 mr-1" /> Accept
          </Button>
        </div>
      </div>
    </Card>
  );
};
