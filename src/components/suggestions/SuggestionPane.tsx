import React, { useState, useEffect } from 'react';
import { Sparkles, MessageSquare, RefreshCw, ArrowRight } from 'lucide-react';
import { editorStore } from '../../core/state/editorStore';
import { IssueCard } from './IssueCard';
import { RewriteCard } from './RewriteCard';
import { ToneLengthSelector } from './ToneLengthSelector';
import { Button } from '../ui/Button';

export const SuggestionPane: React.FC = () => {
  const [, setTick] = useState(0);
  useEffect(() => {
    return editorStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  const state = editorStore.getState;
  const sentence = editorStore.getSelectedSentence();
  const [customText, setCustomText] = useState('');

  const handleCustomApply = () => {
    if (!sentence || !customText.trim()) return;
    editorStore.applySentenceRevision(sentence.id, customText.trim(), 'Custom Edit');
    setCustomText('');
  };

  const handleRegenerate = () => {
    editorStore.generateRewritesForSelected();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Pane Header */}
      <div className="h-10 border-b border-slate-800 bg-slate-900 px-4 flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider select-none shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span>Suggestions & Rewrites</span>
        </div>
        {sentence && (
          <button
            onClick={handleRegenerate}
            disabled={state.isLoadingRewrites}
            className="flex items-center gap-1 text-[11px] font-normal text-sky-400 hover:text-sky-300 transition-colors disabled:opacity-50 lowercase"
          >
            <RefreshCw className={`w-3 h-3 ${state.isLoadingRewrites ? 'animate-spin' : ''}`} />
            refresh
          </button>
        )}
      </div>

      {/* Pane Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!sentence ? (
          /* Empty State */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400">
              <MessageSquare className="w-6 h-6 text-sky-400/80" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-slate-200">No Sentence Selected</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Click on any sentence in the source editor to view deterministic linguistic checks, tone variations, and AI rewrites.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Active Sentence Preview Box */}
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-sky-500/30 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                <span>Active Sentence</span>
                <span>{sentence.trimmedText.split(/\s+/).filter(Boolean).length} words</span>
              </div>
              <p className="text-sm font-medium text-slate-100 leading-relaxed">
                "{sentence.trimmedText}"
              </p>
            </div>

            {/* Deterministic Issues (if any) */}
            {state.activeSentenceIssues.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Linguistic Checks ({state.activeSentenceIssues.length})
                </div>
                <div className="space-y-2">
                  {state.activeSentenceIssues.map((issue) => (
                    <IssueCard key={issue.id} issue={issue} />
                  ))}
                </div>
              </div>
            )}

            {/* Tone & Length Selector */}
            <ToneLengthSelector />

            {/* Side-by-side Rewrite Variations */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <span>Rewrite Options</span>
                <div className="flex items-center gap-2">
                  <span>{state.rewriteOptions.length} choices</span>
                  {state.rewriteOptions.length > 0 && (
                    <button
                      onClick={handleRegenerate}
                      className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
                      title="Regenerate Options"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Regenerate
                    </button>
                  )}
                </div>
              </div>

              {state.isLoadingRewrites ? (
                /* Loading Skeleton */
                <div className="space-y-2.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-slate-850 rounded-xl border border-slate-800 animate-pulse space-y-2">
                      <div className="h-3 w-1/3 bg-slate-700/50 rounded" />
                      <div className="h-4 w-full bg-slate-700/30 rounded" />
                    </div>
                  ))}
                </div>
              ) : state.rewriteOptions.length > 0 ? (
                <div className="space-y-2.5">
                  {state.rewriteOptions.map((opt, idx) => (
                    <RewriteCard key={opt.id} option={opt} index={idx} />
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center rounded-xl bg-slate-850 border border-slate-800 space-y-3">
                  <p className="text-xs text-slate-400">
                    Click below to generate rewrite options for this sentence.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => editorStore.generateRewritesForSelected()}
                    className="w-full text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Generate Rewrites
                  </Button>
                </div>
              )}
            </div>

            {/* Quick Custom Rewrite Input */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Custom Edit
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomApply()}
                  placeholder="Type your own variation..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCustomApply}
                  disabled={!customText.trim()}
                  className="text-xs"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
