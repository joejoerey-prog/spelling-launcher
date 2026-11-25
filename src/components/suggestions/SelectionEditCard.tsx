import React, { useState } from 'react';
import { Check, Sparkles, Wand2, X } from 'lucide-react';
import { SelectionEditSession, editorStore } from '../../core/state/editorStore';
import { Button } from '../ui/Button';
import { DiffChange } from '../../types/diff';

export interface SelectionEditCardProps {
  session: SelectionEditSession;
  /** The document changed after the text was highlighted, so accepting would be refused. */
  stale: boolean;
}

const Diff: React.FC<{ changes: DiffChange[] }> = ({ changes }) => (
  <div className="text-[15px] leading-7 text-ink-200 font-serif p-3 rounded-lg bg-ink-900 border border-white/10 whitespace-pre-wrap">
    {changes.map((c, i) =>
      c.op === 'insert' ? (
        <span key={i} className="text-emerald-300 underline decoration-emerald-500/60 underline-offset-4">{c.value}</span>
      ) : c.op === 'delete' ? (
        <span key={i} className="text-rose-400/80 line-through decoration-rose-500/70">{c.value}</span>
      ) : (
        <span key={i}>{c.value}</span>
      )
    )}
  </div>
);

export const SelectionEditCard: React.FC<SelectionEditCardProps> = ({ session, stale }) => {
  const isSuggest = session.kind === 'suggest';
  const title = isSuggest ? 'Suggestions for your highlight' : 'Polish your highlight';
  // Polish: ids of changes the user turned off. Everything starts accepted.
  const [rejected, setRejected] = useState<Set<number>>(new Set());
  const changeIds = session.pieces.flatMap((p) => (p.kind === 'change' ? [p.id] : []));
  const acceptedIds = changeIds.filter((id) => !rejected.has(id));

  const toggle = (id: number) =>
    setRejected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <section
      role="region"
      aria-label={title}
      className="p-3.5 bg-ink-850 rounded-xl border border-accent-500/40 space-y-3 animate-fade-in"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-ink-300">
          {isSuggest ? <Sparkles className="w-3.5 h-3.5 text-ink-400" /> : <Wand2 className="w-3.5 h-3.5 text-ink-400" />}
          <span>{title}</span>
        </div>
        <button
          type="button"
          onClick={() => editorStore.dismissSelectionEdit()}
          aria-label="Close"
          className="p-1 rounded text-ink-500 hover:text-ink-100 hover:bg-ink-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-[15px] font-serif text-ink-100 leading-7 whitespace-pre-wrap">{session.text}</p>

      {stale && (
        <p role="alert" className="p-2.5 rounded-lg text-xs bg-amber-950/50 border border-amber-500/40 text-amber-200">
          The document changed after you highlighted this text. Highlight it again to get fresh results.
        </p>
      )}
      {session.notice && <p className="text-xs text-ink-400">{session.notice}</p>}

      <div aria-live="polite">
        {session.status === 'loading' ? (
          <div className="space-y-2.5">
            <span className="sr-only">Looking for {isSuggest ? 'suggestions' : 'changes'}</span>
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-ink-900 rounded-xl border border-white/10 space-y-2">
                <div className="h-3 w-1/3 bg-ink-700/50 rounded" />
                <div className="h-4 w-full bg-ink-700/30 rounded" />
              </div>
            ))}
          </div>
        ) : isSuggest ? (
          session.options.length === 0 ? (
            <p className="text-xs text-ink-400">
              No replacements found for this text. Try a longer phrase, or choose Ollama or Cloud API in Settings for more options.
            </p>
          ) : (
            <ol className="space-y-2.5">
              {session.options.map((o, i) => (
                <li key={o.id} className="p-3 rounded-xl border border-white/10 bg-ink-850 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-ink-200">
                    {o.isAiGenerated ? <Sparkles className="w-3.5 h-3.5 text-ink-400" /> : <Wand2 className="w-3.5 h-3.5 text-ink-400" />}
                    <span>{o.label}</span>
                  </div>
                  <Diff changes={o.diff} />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-ink-500 truncate">{o.description}</p>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={stale}
                      aria-label={`Accept option ${i + 1}: ${o.label}`}
                      onClick={() => editorStore.acceptSelectionOption(o.id)}
                      className="text-xs px-3 py-1 font-medium shrink-0"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> Accept
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )
        ) : changeIds.length === 0 ? (
          <p role="status" className="flex items-center gap-2 text-sm text-ink-200">
            <Check className="w-4 h-4 text-emerald-300" /> No changes needed. This text is already good.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="text-[15px] leading-8 text-ink-200 font-serif p-3 rounded-lg bg-ink-900 border border-white/10 whitespace-pre-wrap">
              {session.pieces.map((p, i) =>
                p.kind === 'same' ? (
                  <span key={i}>{p.text}</span>
                ) : (
                  <button
                    key={i}
                    type="button"
                    disabled={stale}
                    aria-pressed={!rejected.has(p.id)}
                    aria-label={`${rejected.has(p.id) ? 'Accept' : 'Reject'} change ${p.id + 1}: ${p.from || 'nothing'} to ${p.to || 'nothing'}`}
                    onClick={() => toggle(p.id)}
                    className={`mx-0.5 px-1 rounded border whitespace-pre-wrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50 ${
                      rejected.has(p.id) ? 'border-dashed border-white/20 bg-ink-800 text-ink-300' : 'border-emerald-500/40 bg-emerald-950/30'
                    }`}
                  >
                    {rejected.has(p.id) ? (
                      <span>{p.from || '(nothing)'}</span>
                    ) : (
                      <>
                        {p.from && <span className="text-rose-400/80 line-through decoration-rose-500/70">{p.from}</span>}
                        {p.to && <span className="text-emerald-300 underline decoration-emerald-500/60 underline-offset-4">{p.to}</span>}
                      </>
                    )}
                  </button>
                )
              )}
            </div>
            <p className="text-xs text-ink-500">Select a change to keep the original wording for it.</p>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => editorStore.dismissSelectionEdit()} className="text-xs whitespace-nowrap">
                Keep original
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={stale || acceptedIds.length === 0}
                onClick={() => editorStore.applyPolish(acceptedIds)}
                className="text-xs px-3 font-medium whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Apply {acceptedIds.length} of {changeIds.length} {changeIds.length === 1 ? 'change' : 'changes'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
