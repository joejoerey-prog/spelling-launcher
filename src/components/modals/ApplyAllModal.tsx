import React, { useMemo } from 'react';
import { X, CheckCheck, ShieldCheck, ArrowRight } from 'lucide-react';
import { editorStore } from '../../core/state/editorStore';
import { Button } from '../ui/Button';
import { DeterministicIssue } from '../../types/suggestions';

export interface ApplyAllModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApplyAllModal: React.FC<ApplyAllModalProps> = ({ isOpen, onClose }) => {
  const state = editorStore.getState;

  // Gather all apply-all eligible issues with replacements across all sentences
  const eligibleIssues = useMemo(() => {
    const list: DeterministicIssue[] = [];
    for (const issues of state.allDocumentIssues.values()) {
      for (const issue of issues) {
        if (issue.applyAllEligible && issue.replacement) {
          list.push(issue);
        }
      }
    }
    // Sort in document order for clean preview
    return list.sort((a, b) => (a.rawStartOffset || 0) - (b.rawStartOffset || 0));
  }, [state.allDocumentIssues]);

  // Breakdown counts by category
  const counts = useMemo(() => {
    const summary: Record<string, number> = {
      spelling: 0,
      grammar: 0,
      punctuation: 0,
      confusion: 0,
    };
    for (const issue of eligibleIssues) {
      if (issue.category === 'spelling') summary.spelling++;
      else if (issue.category === 'punctuation') summary.punctuation++;
      else if (issue.ruleId?.startsWith('confusion.') || issue.category === 'confusion') summary.confusion++;
      else summary.grammar++;
    }
    return summary;
  }, [eligibleIssues]);

  if (!isOpen) return null;

  const handleApply = () => {
    editorStore.applyAllSafeFixes();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Apply All Safe Fixes
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  {eligibleIssues.length} {eligibleIssues.length === 1 ? 'fix' : 'fixes'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Gate-verified high-confidence spelling, grammar, and typography replacements
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-300 flex-1">
          {/* Gate Protection Notice */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-200">
                Guaranteed Single-Transaction Safety
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Only rules meeting the strict gate (&gt;95% accuracy and &lt;0.5 FP/1k words) are included.
                Wordiness, tone, and stylistic rewrites are never auto-applied. All replacements are applied in a single atomic action (one Cmd+Z reverts everything).
              </p>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {counts.spelling > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 font-medium">
                Typos & Spelling: {counts.spelling}
              </span>
            )}
            {counts.grammar > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium">
                Grammar & Distractor Agreement: {counts.grammar}
              </span>
            )}
            {counts.confusion > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-300 border border-orange-500/30 font-medium">
                Homophone Confusion: {counts.confusion}
              </span>
            )}
            {counts.punctuation > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/30 font-medium">
                Punctuation & Spacing: {counts.punctuation}
              </span>
            )}
          </div>

          {/* List of Replacements */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Fixes to be applied ({eligibleIssues.length})
            </div>

            {eligibleIssues.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs">
                No safe auto-applicable fixes detected in this document.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {eligibleIssues.map((issue) => {
                  const ruleBadgeColor =
                    issue.category === 'spelling'
                      ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                      : issue.category === 'punctuation'
                      ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                      : 'text-amber-400 bg-amber-500/10 border-amber-500/20';

                  return (
                    <div
                      key={issue.id}
                      className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${ruleBadgeColor}`}>
                            {issue.ruleId || issue.category}
                          </span>
                          <span className="text-xs text-slate-300 font-medium truncate">
                            {issue.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate italic">
                          "{issue.originalText}"
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
                        <span className="px-2 py-1 rounded bg-rose-950/40 text-rose-300 line-through border border-rose-800/30">
                          {issue.originalText.slice(issue.matchStart, issue.matchEnd) || 'original'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        <span className="px-2 py-1 rounded bg-emerald-950/40 text-emerald-300 font-bold border border-emerald-800/30">
                          {issue.replacement}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            {eligibleIssues.length > 0
              ? 'Pressing Apply modifies your document raw text in memory.'
              : 'All clear.'}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApply}
              disabled={eligibleIssues.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500/40"
            >
              <CheckCheck className="w-4 h-4 mr-1.5" />
              Apply {eligibleIssues.length} Safe {eligibleIssues.length === 1 ? 'Fix' : 'Fixes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
