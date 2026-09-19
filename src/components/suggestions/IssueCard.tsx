import React from 'react';
import { AlertTriangle, Lightbulb, Type, BookOpen, Check, EyeOff, SpellCheck, Scissors } from 'lucide-react';
import { DeterministicIssue } from '../../types/suggestions';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { editorStore } from '../../core/state/editorStore';

export interface IssueCardProps {
  issue: DeterministicIssue;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue }) => {
  const getCategoryTheme = () => {
    switch (issue.category) {
      case 'spelling':
        return {
          icon: <SpellCheck className="w-4 h-4 text-rose-400 shrink-0" />,
          badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
          label: 'Spelling',
        };
      case 'grammar':
      case 'confusion':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
          badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
          label: 'Grammar',
        };
      case 'wordiness':
        return {
          icon: <Scissors className="w-4 h-4 text-sky-400 shrink-0" />,
          badgeClass: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
          label: 'Wordiness',
        };
      case 'passive':
        return {
          icon: <Lightbulb className="w-4 h-4 text-sky-400 shrink-0" />,
          badgeClass: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
          label: 'Passive Voice',
        };
      case 'style':
      case 'length':
        return {
          icon: <Scissors className="w-4 h-4 text-sky-400 shrink-0" />,
          badgeClass: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
          label: 'Style',
        };
      case 'punctuation':
      case 'typography':
        return {
          icon: <Type className="w-4 h-4 text-purple-400 shrink-0" />,
          badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
          label: 'Punctuation',
        };
      case 'repetition':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />,
          badgeClass: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
          label: 'Repetition',
        };
      default:
        return {
          icon: <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />,
          badgeClass: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
          label: issue.category,
        };
    }
  };

  const theme = getCategoryTheme();

  const handleApply = () => {
    editorStore.applyIssueFix(issue);
  };

  const handleIgnore = () => {
    editorStore.ignoreIssue(issue);
  };

  const handleLearnWord = () => {
    if (issue.matchStart !== undefined && issue.matchEnd !== undefined) {
      const match = issue.originalText.slice(issue.matchStart, issue.matchEnd).trim();
      if (match) {
        editorStore.learnWord(match);
      }
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-850 hover:border-slate-700/80 transition-all p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {theme.icon}
          <span className="font-semibold text-xs text-slate-200 truncate">{issue.title}</span>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0 ${theme.badgeClass}`}>
          {theme.label}
        </span>
      </div>

      <p className="text-xs text-slate-400 leading-normal">{issue.description}</p>

      {issue.suggestions && issue.suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Suggestions:</span>
          {issue.suggestions.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => editorStore.applyIssueFix(issue, sug)}
              className="text-xs px-2 py-0.5 rounded-md bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 transition-colors font-medium flex items-center gap-1 cursor-pointer"
              title={`Replace with "${sug}"`}
            >
              <Check className="w-2.5 h-2.5" />
              {sug}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        {issue.suggestedText ? (
          <div className="text-xs font-mono text-emerald-300 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-500/20 truncate flex-1">
            {issue.suggestedText}
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          {issue.category === 'spelling' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLearnWord}
              title="Learn word in macOS dictionary"
              className="text-[11px] px-2 py-1 text-slate-400 hover:text-slate-200"
            >
              <BookOpen className="w-3 h-3 mr-1" /> Learn
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleIgnore}
            title="Ignore issue (suppresses rule after 3 rejections)"
            className="text-[11px] px-2 py-1 text-slate-400 hover:text-slate-200"
          >
            <EyeOff className="w-3 h-3 mr-1" /> Ignore
          </Button>
          {issue.suggestedText && (
            <Button
              variant="success"
              size="sm"
              onClick={handleApply}
              className="text-xs px-2.5 py-1"
            >
              <Check className="w-3 h-3 mr-1" /> Fix
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
