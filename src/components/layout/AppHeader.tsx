import React, { useRef, useState } from 'react';
import {
  FileText,
  FilePlus,
  FolderOpen,
  Save,
  Download,
  Undo2,
  Redo2,
  SlidersHorizontal,
  BookOpen,
  ChevronUp,
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
    <header className="h-14 border-b border-white/10 bg-ink-900 px-4 flex items-center justify-between shrink-0 select-none">
      {/* Hidden file input supporting PDF, Apple Pages, DOCX, and Markdown/Text */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".txt,.md,.markdown,.pdf,.pages,.docx,.rtf"
        className="hidden"
      />

      {/* Brand & Document Name */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <ChevronUp className="w-4 h-4 text-accent-400" strokeWidth={2} />
          <span className="font-medium text-base text-ink-100">Spelling Launcher</span>
        </div>

        <div className="h-5 w-px bg-ink-800" />

        <div className="flex items-center gap-2 text-sm text-ink-300 min-w-0">
          <FileText className="w-4 h-4 text-ink-500" />
          <span className="font-medium truncate max-w-[10rem] xl:max-w-xs">{state.document.fileName}</span>
          {isOpeningFile ? (
            <span className="flex items-center gap-1 text-xs text-ink-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Reading document
            </span>
          ) : state.document.isDirty ? (
            <span className="w-2 h-2 rounded-full bg-accent-400" title="Unsaved changes" />
          ) : null}
        </div>
      </div>

      {/* Document & History Actions */}
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="sm" icon={<FilePlus className="w-4 h-4" />} onClick={handleNewDocument} title={withKey('New document', 'newDocument')}>
          <span className="hidden xl:inline">New</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={isOpeningFile ? <Loader2 className="w-4 h-4 animate-spin text-ink-400" /> : <FolderOpen className="w-4 h-4" />}
          onClick={handleOpenFileClick}
          disabled={isOpeningFile}
          title={withKey('Open document (.pdf, .pages, .docx, .md, .txt)', 'open')}
        >
          <span className="hidden xl:inline">{isOpeningFile ? 'Opening' : 'Open'}</span>
        </Button>
        <Button variant="ghost" size="sm" icon={<Save className="w-4 h-4" />} onClick={() => editorStore.saveCurrentDocument()} title={withKey('Save document', 'save')}>
          <span className="hidden xl:inline">Save</span>
        </Button>
        <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />} onClick={onOpenExport} title={withKey('Export document', 'export')}>
          <span className="hidden xl:inline">Export</span>
        </Button>

        <div className="h-5 w-px bg-ink-800 mx-1" />

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
            <div className="h-5 w-px bg-ink-800 mx-1" />
            <Button
              variant="secondary"
              size="sm"
              icon={<CheckCheck className="w-4 h-4" />}
              onClick={onOpenApplyAll}
              className="text-accent-300 border-accent-500/30"
              title={withKey('Review and apply all verified safe fixes', 'applyAll')}
            >
              Apply safe fixes ({eligibleCount})
            </Button>
          </>
        )}

        <div className="h-5 w-px bg-ink-800 mx-1" />

        <Button variant="ghost" size="sm" icon={<BookOpen className="w-4 h-4" />} onClick={onOpenRules} title="Rules and custom terms">
          <span className="hidden xl:inline">Rules</span>
        </Button>
        <Button variant="ghost" size="sm" icon={<SlidersHorizontal className="w-4 h-4" />} onClick={onOpenSettings} title={withKey('Settings', 'openSettings')}>
          <span className="hidden xl:inline">Settings</span>
        </Button>
      </div>
    </header>
  );
};
