import React, { useState, useEffect } from 'react';
import { Edit3, UploadCloud, Loader2 } from 'lucide-react';
import { Toolbar } from './Toolbar';
import { editorStore } from '../../core/state/editorStore';
import { SentenceNode } from '../../types/document';
import { extractTextFromDocumentFile } from '../../core/engine/documentExtractor';
import { rulesStore } from '../../core/state/rulesStore';
import { isTauri, TauriBridge } from '../../core/bridge/tauriBridge';

export const SourceEditorPane: React.FC = () => {
  const state = editorStore.getState;
  const [rawMode, setRawMode] = useState(false);
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
                  alert(`Could not load document:\n${err?.message || err}`);
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
    const sample = `# Welcome to Spelling Launcher

Spelling Launcher is your private, local-first sentence writing and rewriting assistant powered by your local Ollama instance and LanguageTool rules.

We recieved alot of constructive feedback on the new launch.

In their was a major question regarding the medication's side affect.

The team met in close proximity due to the fact that we had future plans.

Please review the document ,and let us know your thoughts.`;
    editorStore.loadDocument(sample, null, 'Sample.md');
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
      alert(`Could not extract document "${file.name}":\n${err?.message || err}`);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col overflow-hidden relative transition-colors ${
        isDragging ? 'ring-2 ring-emerald-500 bg-emerald-950/20' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-30 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 border-2 border-dashed border-emerald-500 rounded-xl m-2 pointer-events-none">
          <UploadCloud className="w-12 h-12 text-emerald-400 animate-bounce mb-3" />
          <h3 className="text-base font-bold text-slate-100">Drop your document here</h3>
          <p className="text-xs text-slate-400 mt-1">
            Supports PDF, Apple Pages, Word (DOCX), Markdown, and Plain Text
          </p>
        </div>
      )}

      {/* Loading Overlay for extraction */}
      {isExtracting && (
        <div className="absolute inset-0 z-30 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 space-y-3 pointer-events-none">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
          <p className="text-sm font-semibold text-slate-200">Extracting and formatting document text...</p>
        </div>
      )}

      {/* Pane Header */}
      <div className="h-10 border-b border-slate-800 bg-slate-900 px-4 flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider select-none shrink-0">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-emerald-400" />
          <span>Source Document</span>
        </div>
        <span className="text-[11px] font-normal text-slate-500 lowercase">
          Click any sentence to inspect & rewrite
        </span>
      </div>

      <Toolbar
        onInsertMarkdown={handleInsertMarkdown}
        onResetToSample={handleResetSample}
        rawMode={rawMode}
        onToggleRawMode={() => setRawMode(!rawMode)}
      />

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 font-sans text-slate-200 leading-relaxed text-base">
        {rawMode ? (
          <textarea
            value={state.document.rawContent}
            onChange={handleRawChange}
            className="w-full h-full min-h-[400px] bg-transparent text-slate-100 font-mono text-sm leading-relaxed outline-none resize-none"
            placeholder="Type or paste Markdown or plain text here..."
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
                  className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-emerald-300 border border-slate-800 overflow-x-auto my-3"
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

                  let textStyles = 'cursor-pointer px-1 py-0.5 rounded transition-all duration-150 inline ';
                  if (isSelected) {
                    textStyles += 'bg-emerald-500/25 text-emerald-100 ring-2 ring-emerald-500/70 shadow-md ';
                  } else if (hasSpelling) {
                    // Red Wavy Underline: Typos & Misspellings
                    textStyles += 'underline decoration-rose-500 decoration-wavy decoration-2 underline-offset-4 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20 ';
                  } else if (hasGrammar) {
                    // Amber Wavy Underline: Grammar & Confusion Homophones
                    textStyles += 'underline decoration-amber-400 decoration-wavy decoration-2 underline-offset-4 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 ';
                  } else if (hasWordiness) {
                    // Sky Blue Underline: Wordiness, Redundancy, Plain English
                    textStyles += 'underline decoration-sky-400 decoration-solid decoration-2 underline-offset-4 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20 ';
                  } else if (hasPunctuation) {
                    // Purple Underline: Punctuation & Typography
                    textStyles += 'underline decoration-purple-400 decoration-solid decoration-2 underline-offset-4 bg-purple-500/10 text-purple-100 hover:bg-purple-500/20 ';
                  } else if (hasIssues) {
                    textStyles += 'underline decoration-indigo-400 decoration-solid decoration-2 underline-offset-4 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/20 ';
                  } else {
                    textStyles += 'hover:bg-slate-800/80 text-slate-200 ';
                  }

                  const issueTooltip = hasIssues
                    ? issues.map((i) => `• [${i.category.toUpperCase()}] ${i.title}`).join('\n')
                    : 'Click to inspect & rewrite';

                  const dotColor = hasSpelling
                    ? 'bg-rose-500'
                    : hasGrammar
                    ? 'bg-amber-400'
                    : hasWordiness
                    ? 'bg-sky-400'
                    : hasPunctuation
                    ? 'bg-purple-400'
                    : 'bg-indigo-400';

                  return (
                    <span
                      key={sentence.id}
                      onClick={() => handleSentenceClick(sentence)}
                      className={textStyles}
                      title={issueTooltip}
                    >
                      {hasIssues && !isSelected && (
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${dotColor}`} />
                      )}
                      {sentence.trimmedText}
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
