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
    editorStore.applySentenceRevision(sentence.id, customText.trim(), 'Custom edit');
    setCustomText('');
  };

  const handleRegenerate = () => {
    editorStore.generateRewritesForSelected();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Pane Header */}
      <div className="h-10 border-b border-white/10 bg-slate-900 px-4 flex items-center justify-between text-xs font-medium text-slate-300 select-none shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-slate-500" />
          <span>Suggestions</span>
        </div>
        {sentence && (
          <button
            onClick={handleRegenerate}
            disabled={state.isLoadingRewrites}
            className="flex items-center gap-1 text-xs font-normal text-slate-400 hover:text-slate-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${state.isLoadingRewrites ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Pane Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!sentence ? (
          /* Empty State */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-sm text-slate-200">No sentence selected</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Select a sentence in the editor to see its checks and rewrite options.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Active Sentence Preview Box */}
            <div className="p-3.5 bg-slate-850 rounded-xl border border-sky-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Selected sentence</span>
                <span>{sentence.trimmedText.split(/\s+/).filter(Boolean).length} words</span>
              </div>
              <p className="text-[15px] font-serif text-slate-100 leading-7">
                {sentence.trimmedText}
              </p>
            </div>

            {/* Deterministic Issues (if any) */}
            {state.activeSentenceIssues.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-400">
                  Checks ({state.activeSentenceIssues.length})
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
              <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                <span>Rewrites</span>
                <div className="flex items-center gap-2">
                  <span>{state.rewriteOptions.length} options</span>
                  {state.rewriteOptions.length > 0 && (
                    <button
                      onClick={handleRegenerate}
                      className="text-xs text-slate-400 hover:text-slate-100 flex items-center gap-1"
                      title="Regenerate rewrites"
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
                    <div key={i} className="p-4 bg-slate-850 rounded-xl border border-white/10 space-y-2">
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
                <div className="p-4 text-center rounded-xl bg-slate-850 border border-white/10 space-y-3">
                  <p className="text-xs text-slate-400">
                    No rewrites yet for this sentence.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => editorStore.generateRewritesForSelected()}
                    className="w-full text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Generate rewrites
                  </Button>
                </div>
              )}
            </div>

            {/* Quick Custom Rewrite Input */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <span className="text-xs font-medium text-slate-400">
                Custom edit
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomApply()}
                  aria-label="Custom edit text"
                  placeholder="Your own version"
                  className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus-visible:border-sky-500"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCustomApply}
                  disabled={!customText.trim()}
                  aria-label="Apply custom edit"
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
