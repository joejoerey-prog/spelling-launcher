import React, { useState, useEffect } from 'react';
import { Edit3, UploadCloud, Loader2 } from 'lucide-react';
import { Toolbar } from './Toolbar';
import { editorStore, INITIAL_SAMPLE_TEXT } from '../../core/state/editorStore';
import { SentenceNode } from '../../types/document';
import { DeterministicIssue } from '../../types/suggestions';
import { extractTextFromDocumentFile } from '../../core/engine/documentExtractor';
import { rulesStore } from '../../core/state/rulesStore';
import { SHORTCUT_EVENT, ShortcutAction } from '../../core/shortcuts';
import { isTauri, TauriBridge } from '../../core/bridge/tauriBridge';

const UNDERLINE_BY_CATEGORY = (category: DeterministicIssue['category']): string => {
  switch (category) {
    case 'spelling':
      return 'underline decoration-rose-500 decoration-wavy decoration-2 underline-offset-4';
    case 'grammar':
    case 'confusion':
    case 'repetition':
      return 'underline decoration-amber-400 decoration-wavy decoration-2 underline-offset-4';
    case 'wordiness':
    case 'passive':
    case 'style':
    case 'length':
      return 'underline decoration-ink-400 decoration-dotted decoration-2 underline-offset-4';
    case 'punctuation':
    case 'typography':
      return 'underline decoration-ink-400 decoration-dotted decoration-2 underline-offset-4';
    default:
      return 'underline decoration-ink-400 decoration-solid decoration-2 underline-offset-4';
  }
};

/** Splits a sentence into plain and underlined segments. Overlapping ranges fall back to the first. */
function highlightSegments(text: string, issues: DeterministicIssue[]) {
  const ranges = issues
    .filter(
      (i) =>
        i.matchStart !== undefined &&
        i.matchEnd !== undefined &&
        i.matchEnd > i.matchStart &&
        // Skip ranges that no longer line up with the text the backend matched (stale or clamped).
        (i.matchedText === undefined || text.slice(i.matchStart, i.matchEnd) === i.matchedText)
    )
    .sort((a, b) => a.matchStart! - b.matchStart!);

  const segments: { text: string; category?: DeterministicIssue['category'] }[] = [];
  let cursor = 0;
  for (const i of ranges) {
    if (i.matchStart! < cursor) continue;
    if (i.matchStart! > cursor) segments.push({ text: text.slice(cursor, i.matchStart) });
    segments.push({ text: text.slice(i.matchStart, i.matchEnd), category: i.category });
    cursor = i.matchEnd!;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}

export const SourceEditorPane: React.FC = () => {
  const [, setTick] = useState(0);
  useEffect(() => {
    return editorStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  const state = editorStore.getState;
  const [rawMode, setRawMode] = useState(false);

  useEffect(() => {
    const onShortcut = (e: Event) => {
      if ((e as CustomEvent<ShortcutAction>).detail === 'toggleRaw') setRawMode((m) => !m);
    };
    window.addEventListener(SHORTCUT_EVENT, onShortcut);
    return () => window.removeEventListener(SHORTCUT_EVENT, onShortcut);
  }, []);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  // Setup global drag-and-drop listeners for both Tauri native and WebKit
  useEffect(() => {
    const preventDrag = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', preventDrag);
    window.addEventListener('drop', preventDrag);

    let unlistenTauri: (() => void) | undefined;

    if (isTauri()) {
      import('@tauri-apps/api/webview')
        .then(({ getCurrentWebview }) => {
          return getCurrentWebview().onDragDropEvent(async (event) => {
            if (event.payload.type === 'drop') {
              setIsDragging(false);
              const paths = event.payload.paths;
              if (paths && paths.length > 0) {
                if (
                  editorStore.getState.document.isDirty &&
                  !(await TauriBridge.confirm('You have unsaved changes. Open the dropped document anyway?'))
                ) {
                  return;
                }
                const filePath = paths[0];
                const fileName = filePath.split('/').pop() || 'Document';
                setIsExtracting(true);
                try {
                  const res = await TauriBridge.readDocument(filePath);
                  if (res.content) {
                    editorStore.loadDocument(res.content, filePath, fileName);
                    await rulesStore.addRecentDoc({
                      file_path: filePath,
                      title: fileName.replace(/\.[^/.]+$/, ''),
                      word_count: res.content.split(/\s+/).filter(Boolean).length,
                      last_modified: 'Just now',
                      snippet: res.content.slice(0, 100),
                    });
                  }
                } catch (err: any) {
                  editorStore.showError(`Could not load document: ${err?.message || err}`);
                } finally {
                  setIsExtracting(false);
                }
              }
            } else if (event.payload.type === 'enter' || event.payload.type === 'over') {
              setIsDragging(true);
            } else if (event.payload.type === 'leave') {
              setIsDragging(false);
            }
          });
        })
        .then((unlisten) => {
          unlistenTauri = unlisten;
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('dragover', preventDrag);
      window.removeEventListener('drop', preventDrag);
      if (unlistenTauri) unlistenTauri();
    };
  }, []);

  const handleSentenceClick = (sentence: SentenceNode) => {
    if (state.selectedSentenceId === sentence.id) {
      editorStore.selectSentence(null);
    } else {
      editorStore.selectSentence(sentence.id);
    }
  };

  const handleRawChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    editorStore.updateRawContentDirectly(e.target.value);
  };

  const handleInsertMarkdown = (prefix: string) => {
    const newContent = `${state.document.rawContent}\n\n${prefix}`;
    editorStore.updateRawContentDirectly(newContent);
  };

  const handleResetSample = () => {
    editorStore.loadDocument(INITIAL_SAMPLE_TEXT, null, 'Sample.md');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (
      editorStore.getState.document.isDirty &&
      !(await TauriBridge.confirm('You have unsaved changes. Open the dropped document anyway?'))
    ) {
      return;
    }

    setIsExtracting(true);
    try {
      const content = await extractTextFromDocumentFile(file);
      editorStore.loadDocument(content, file.name, file.name);

      await rulesStore.addRecentDoc({
        file_path: file.name,
        title: file.name.replace(/\.[^/.]+$/, ''),
        word_count: content.split(/\s+/).filter(Boolean).length,
        last_modified: 'Just now',
        snippet: content.slice(0, 100),
      });
    } catch (err: any) {
      editorStore.showError(`Could not extract document "${file.name}": ${err?.message || err}`);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col overflow-hidden relative transition-colors ${
        isDragging ? 'ring-1 ring-accent-500 bg-ink-850' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-30 bg-ink-900 flex flex-col items-center justify-center p-6 border border-dashed border-accent-500 rounded-xl m-2 pointer-events-none">
          <UploadCloud className="w-10 h-10 text-ink-400 mb-3" />
          <h3 className="text-base font-medium text-ink-100">Drop a document to open it</h3>
          <p className="text-xs text-ink-400 mt-1">
            PDF, Pages, Word, Markdown or plain text
          </p>
        </div>
      )}

      {/* Loading Overlay for extraction */}
      {isExtracting && (
        <div className="absolute inset-0 z-30 bg-ink-900 flex flex-col items-center justify-center p-6 space-y-3 pointer-events-none">
          <Loader2 className="w-8 h-8 text-ink-400 animate-spin" />
          <p className="text-sm font-medium text-ink-200">Reading document</p>
        </div>
      )}

      {/* Pane Header */}
      <div className="h-10 border-b border-white/10 bg-ink-900 px-4 flex items-center justify-between text-xs font-medium text-ink-300 select-none shrink-0">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-ink-500" />
          <span>Document</span>
        </div>
        {!state.selectedSentenceId && (
          <span className="text-xs font-normal text-ink-500">
            Select a sentence to check it
          </span>
        )}
      </div>

      <Toolbar
        onInsertMarkdown={handleInsertMarkdown}
        onResetToSample={handleResetSample}
        rawMode={rawMode}
        onToggleRawMode={() => setRawMode(!rawMode)}
      />

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 font-serif text-ink-200 leading-8 text-[17px]">
        {rawMode ? (
          <textarea
            value={state.document.rawContent}
            onChange={handleRawChange}
            className="w-full h-full min-h-[400px] bg-transparent text-ink-100 font-mono text-sm leading-relaxed outline-none resize-none"
            placeholder="Type or paste text"
            autoFocus
          />
        ) : (
          state.document.paragraphs.map((para) => {
            if (para.isBlank) {
              return <div key={para.id} className="h-4" />;
            }

            if (para.isCodeBlock) {
              return (
                <pre
                  key={para.id}
                  className="bg-ink-950 p-4 rounded-lg font-mono text-xs text-ink-300 border border-white/10 overflow-x-auto my-3"
                >
                  {para.rawText}
                </pre>
              );
            }

            return (
              <div key={para.id} className="paragraph-block flex flex-wrap items-baseline gap-x-1 gap-y-1 my-1">
                {para.sentences.map((sentence) => {
                  const isSelected = state.selectedSentenceId === sentence.id;
                  const issues = state.allDocumentIssues.get(sentence.id) || [];
                  const hasIssues = issues.length > 0;

                  // LanguageTool Multi-Color Categories
                  const hasSpelling = issues.some((i) => i.category === 'spelling');
                  const hasGrammar = issues.some((i) => i.category === 'grammar' || i.category === 'confusion' || i.category === 'repetition');
                  const hasWordiness = issues.some((i) => i.category === 'wordiness' || i.category === 'passive' || i.category === 'style' || i.category === 'length');
                  const hasPunctuation = issues.some((i) => i.category === 'punctuation' || i.category === 'typography');

                  let textStyles =
                    'cursor-pointer px-1 py-0.5 rounded transition-colors duration-150 inline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ';
                  if (isSelected) {
                    textStyles += 'bg-accent-500/10 text-ink-100 ring-1 ring-accent-500/50 ';
                  } else {
                    // Only the offending words are underlined; the sentence itself is not tinted.
                    textStyles += 'hover:bg-ink-800 text-ink-200 ';
                  }

                  const issueTooltip = hasIssues
                    ? issues.map((i) => `${i.category}: ${i.title}`).join('\n')
                    : 'Select to check and rewrite';

                  const dotColor = hasSpelling
                    ? 'text-rose-400'
                    : hasGrammar
                    ? 'text-amber-400'
                    : hasWordiness
                    ? 'text-ink-400'
                    : hasPunctuation
                    ? 'text-ink-400'
                    : 'text-ink-400';

                  return (
                    <span
                      key={sentence.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onClick={() => handleSentenceClick(sentence)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSentenceClick(sentence);
                        }
                      }}
                      className={textStyles}
                      title={issueTooltip}
                    >
                      {hasIssues && !isSelected && (
                        <span aria-hidden className={`mr-0.5 ${dotColor}`}>‸</span>
                      )}
                      {highlightSegments(sentence.trimmedText, issues).map((seg, idx) =>
                        seg.category ? (
                          <span key={idx} className={UNDERLINE_BY_CATEGORY(seg.category)}>
                            {seg.text}
                          </span>
                        ) : (
                          <React.Fragment key={idx}>{seg.text}</React.Fragment>
                        )
                      )}
                    </span>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
