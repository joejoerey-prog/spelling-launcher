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
} from 'lucide-react';
import { Button } from '../ui/Button';
import { editorStore } from '../../core/state/editorStore';
import { TauriBridge } from '../../core/bridge/tauriBridge';
import { rulesStore } from '../../core/state/rulesStore';
import { extractTextFromDocumentFile, cleanExtractedText } from '../../core/engine/documentExtractor';

export interface AppHeaderProps {
  onOpenSettings: () => void;
  onOpenRules: () => void;
  onOpenExport: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenSettings,
  onOpenRules,
  onOpenExport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpeningFile, setIsOpeningFile] = useState(false);
  const state = editorStore.getState;
  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  const handleNewDocument = () => {
    if (state.document.isDirty) {
      if (!confirm('You have unsaved changes. Create a new document anyway?')) return;
    }
    editorStore.loadDocument('# Untitled Document\n\nStart writing or paste your text here to rewrite sentences.', null, 'Untitled.md');
  };

  const handleOpenFileClick = async () => {
    try {
      const selectedPath = await TauriBridge.openDocumentDialog();
      if (selectedPath) {
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
        return;
      }
    } catch {
      // Fallback to web input if dialog plugin not active
    } finally {
      setIsOpeningFile(false);
    }

    fileInputRef.current?.click();
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
      alert(`Could not open document "${file.name}":\n${err?.message || err}`);
    } finally {
      setIsOpeningFile(false);
      e.target.value = '';
    }
  };

  const handleSaveDocument = async () => {
    const doc = state.document;
    const targetPath = doc.filePath || doc.fileName || 'document.md';
    try {
      const res = await TauriBridge.saveDocument(targetPath, doc.rawContent, true);
      if (res.success) {
        editorStore.markSaved(targetPath);
        await rulesStore.addRecentDoc({
          file_path: targetPath,
          title: doc.fileName.replace(/\.[^/.]+$/, ''),
          word_count: doc.rawContent.split(/\s+/).filter(Boolean).length,
          last_modified: 'Just now',
          snippet: doc.rawContent.slice(0, 100),
        });
      }
    } catch (e: any) {
      alert(`Save failed: ${e?.message || e}`);
    }
  };

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
          <Rocket className="w-4 h-4 text-emerald-100 animate-pulse" />
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
        <Button variant="ghost" size="sm" onClick={handleNewDocument} title="New Document">
          New
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={isOpeningFile ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <FolderOpen className="w-4 h-4" />}
          onClick={handleOpenFileClick}
          disabled={isOpeningFile}
          title="Open Document (.pdf, .pages, .docx, .md, .txt)"
        >
          {isOpeningFile ? 'Reading...' : 'Open'}
        </Button>
        <Button variant="ghost" size="sm" icon={<Save className="w-4 h-4" />} onClick={handleSaveDocument} title="Save Document (Cmd+S)">
          Save
        </Button>
        <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />} onClick={onOpenExport} title="Export Document">
          Export
        </Button>

        <div className="h-5 w-px bg-slate-800 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          icon={<Undo2 className="w-4 h-4" />}
          onClick={() => editorStore.undo()}
          disabled={!canUndo}
          title="Undo (Cmd+Z)"
        />
        <Button
          variant="ghost"
          size="sm"
          icon={<Redo2 className="w-4 h-4" />}
          onClick={() => editorStore.redo()}
          disabled={!canRedo}
          title="Redo (Cmd+Shift+Z)"
        />

        <div className="h-5 w-px bg-slate-800 mx-1" />

        <Button variant="ghost" size="sm" icon={<BookOpen className="w-4 h-4" />} onClick={onOpenRules} title="Linguistic Rules & Custom Terms">
          Rules
        </Button>
        <Button variant="ghost" size="sm" icon={<SlidersHorizontal className="w-4 h-4" />} onClick={onOpenSettings} title="Settings">
          Settings
        </Button>
      </div>
    </header>
  );
};
