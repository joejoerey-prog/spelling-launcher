import React, { useRef, useState } from 'react';
import {
  FileText,
  FolderOpen,
  Save,
  Download,
  Undo2,
  Redo2,
  SlidersHorizontal,
  BookOpen,
  Rocket,
  Loader2,
  CheckCheck,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { editorStore } from '../../core/state/editorStore';
import { TauriBridge, isTauri } from '../../core/bridge/tauriBridge';
import { rulesStore } from '../../core/state/rulesStore';
import { extractTextFromDocumentFile, cleanExtractedText } from '../../core/engine/documentExtractor';
import { settingsStore } from '../../core/state/settingsStore';
import { SHORTCUT_EVENT, ShortcutAction, effectiveShortcuts, formatCombo } from '../../core/shortcuts';

export interface AppHeaderProps {
  onOpenSettings: () => void;
  onOpenRules: () => void;
  onOpenExport: () => void;
  onOpenApplyAll?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenSettings,
  onOpenRules,
  onOpenExport,
  onOpenApplyAll,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpeningFile, setIsOpeningFile] = useState(false);
  const [, setTick] = useState(0);

  React.useEffect(() => {
    return editorStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  const state = editorStore.getState;
  const keys = effectiveShortcuts(settingsStore.state.shortcuts);
  const withKey = (label: string, action: ShortcutAction) => (keys[action] ? `${label} (${formatCombo(keys[action])})` : label);
  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  const eligibleCount = React.useMemo(() => {
    let count = 0;
    for (const issues of state.allDocumentIssues.values()) {
      for (const issue of issues) {
        if (issue.applyAllEligible && issue.replacement) {
          count++;
        }
      }
    }
    return count;
  }, [state.allDocumentIssues]);

  const handleNewDocument = async () => {
    if (state.document.isDirty) {
      if (!(await TauriBridge.confirm('You have unsaved changes. Create a new document anyway?'))) return;
    }
    editorStore.loadDocument('# Untitled Document\n\nStart writing or paste your text here to rewrite sentences.', null, 'Untitled.md');
  };

  const handleOpenFileClick = async () => {
    if (editorStore.getState.document.isDirty) {
      if (!(await TauriBridge.confirm('You have unsaved changes. Open another document anyway?'))) return;
    }

    // Outside Tauri there is no native dialog, so use the hidden web file input.
    if (!isTauri()) {
      fileInputRef.current?.click();
      return;
    }

    try {
      const selectedPath = await TauriBridge.openDocumentDialog();
      if (!selectedPath) return; // Cancelled: do nothing.
      setIsOpeningFile(true);
      const fileName = selectedPath.split('/').pop() || 'Document';
      const res = await TauriBridge.readDocument(selectedPath);
      if (res.content) {
        const formatted = cleanExtractedText(res.content);
        editorStore.loadDocument(formatted, selectedPath, fileName);
        await rulesStore.addRecentDoc({
          file_path: selectedPath,
          title: fileName.replace(/\.[^/.]+$/, ''),
          word_count: formatted.split(/\s+/).filter(Boolean).length,
          last_modified: 'Just now',
          snippet: formatted.slice(0, 100),
        });
      }
    } catch (err: any) {
      editorStore.showError(`Could not open document: ${err?.message || err}`);
    } finally {
      setIsOpeningFile(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOpeningFile(true);
    try {
      // Cleanly extracts human-readable text from PDF, Apple Pages, DOCX, or Plain Text/Markdown
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
      editorStore.showError(`Could not open document "${file.name}": ${err?.message || err}`);
    } finally {
      setIsOpeningFile(false);
      e.target.value = '';
    }
  };

  // Open / New shortcuts are dispatched from App's key handler.
  React.useEffect(() => {
    const onShortcut = (e: Event) => {
      const action = (e as CustomEvent<ShortcutAction>).detail;
      if (action === 'open' && !isOpeningFile) handleOpenFileClick();
      else if (action === 'newDocument') handleNewDocument();
    };
    window.addEventListener(SHORTCUT_EVENT, onShortcut);
    return () => window.removeEventListener(SHORTCUT_EVENT, onShortcut);
  });

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between shrink-0 select-none">
      {/* Hidden file input supporting PDF, Apple Pages, DOCX, and Markdown/Text */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".txt,.md,.markdown,.pdf,.pages,.docx,.rtf"
        className="hidden"
      />

      {/* Brand & Document Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md shadow-emerald-950/40 border border-emerald-400/30">
          <Rocket className="w-4 h-4 text-emerald-100" />
          <span className="font-bold text-sm tracking-tight text-white">Spelling Launcher</span>
        </div>

        <div className="h-5 w-px bg-slate-800" />

        <div className="flex items-center gap-2 text-sm text-slate-300">
          <FileText className="w-4 h-4 text-slate-500" />
          <span className="font-medium truncate max-w-xs">{state.document.fileName}</span>
          {isOpeningFile ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Extracting document text...
            </span>
          ) : state.document.isDirty ? (
            <span className="w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />
          ) : null}
        </div>
      </div>

      {/* Document & History Actions */}
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="sm" onClick={handleNewDocument} title={withKey('New Document', 'newDocument')}>
          New
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={isOpeningFile ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <FolderOpen className="w-4 h-4" />}
          onClick={handleOpenFileClick}
          disabled={isOpeningFile}
          title={withKey('Open Document (.pdf, .pages, .docx, .md, .txt)', 'open')}
        >
          {isOpeningFile ? 'Reading...' : 'Open'}
        </Button>
        <Button variant="ghost" size="sm" icon={<Save className="w-4 h-4" />} onClick={() => editorStore.saveCurrentDocument()} title={withKey('Save Document', 'save')}>
          Save
        </Button>
        <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />} onClick={onOpenExport} title={withKey('Export Document', 'export')}>
          Export
        </Button>

        <div className="h-5 w-px bg-slate-800 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          icon={<Undo2 className="w-4 h-4" />}
          onClick={() => editorStore.undo()}
          disabled={!canUndo}
          title={withKey('Undo', 'undo')}
          aria-label="Undo"
        />
        <Button
          variant="ghost"
          size="sm"
          icon={<Redo2 className="w-4 h-4" />}
          onClick={() => editorStore.redo()}
          disabled={!canRedo}
          title={withKey('Redo', 'redo')}
          aria-label="Redo"
        />

        {eligibleCount > 0 && onOpenApplyAll && (
          <>
            <div className="h-5 w-px bg-slate-800 mx-1" />
            <Button
              variant="secondary"
              size="sm"
              icon={<CheckCheck className="w-4 h-4 text-emerald-400" />}
              onClick={onOpenApplyAll}
              className="bg-emerald-950/50 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60 shadow-sm"
              title={withKey('Review & Apply All Gate-Verified Safe Fixes', 'applyAll')}
            >
              Apply Safe ({eligibleCount})
            </Button>
          </>
        )}

        <div className="h-5 w-px bg-slate-800 mx-1" />

        <Button variant="ghost" size="sm" icon={<BookOpen className="w-4 h-4" />} onClick={onOpenRules} title="Linguistic Rules & Custom Terms">
          Rules
        </Button>
        <Button variant="ghost" size="sm" icon={<SlidersHorizontal className="w-4 h-4" />} onClick={onOpenSettings} title={withKey('Settings', 'openSettings')}>
          Settings
        </Button>
      </div>
    </header>
  );
};
