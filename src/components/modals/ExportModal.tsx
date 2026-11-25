import React, { useState, useEffect } from 'react';
import { X, Download, Check, AlertCircle } from 'lucide-react';
import { editorStore } from '../../core/state/editorStore';
import { TauriBridge } from '../../core/bridge/tauriBridge';
import { Button } from '../ui/Button';
import { useDialogFocus } from './useDialogFocus';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const state = editorStore.getState;
  const initialBaseName = state.document.fileName.replace(/\.[^/.]+$/, '') || 'document';
  const [filename, setFilename] = useState(initialBaseName);
  const [format, setFormat] = useState<'md' | 'txt'>('md');
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const dialogRef = useDialogFocus(isOpen);

  // Re-derive the name from the current document every time the modal opens.
  useEffect(() => {
    if (isOpen) {
      setFilename(editorStore.getState.document.fileName.replace(/\.[^/.]+$/, '') || 'document');
      setExportMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Safe filename preview
  const sanitizedName = `${filename.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^_+|_+$/g, '') || 'document'}.${format}`;

  const handleExport = async () => {
    setIsExporting(true);
    setExportMessage(null);

    try {
      const content = state.document.rawContent;
      const res = await TauriBridge.exportDocument(sanitizedName, content);
      if (res.success) {
        setExportMessage({ text: `Successfully exported: ${sanitizedName}`, isError: false });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setExportMessage({ text: `Export error: ${res.message || 'export failed'}`, isError: true });
      }
    } catch (e: any) {
      setExportMessage({ text: `Export error: ${e?.message || e}`, isError: true });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-150">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        tabIndex={-1}
        className="bg-ink-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col outline-none"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5 text-ink-400" />
            <h2 id="export-modal-title" className="text-base font-medium text-ink-100">Export document</h2>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-1 rounded-lg text-ink-400 hover:text-white hover:bg-ink-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-sm text-ink-300">
          <div className="space-y-1.5">
            <label htmlFor="export-filename" className="text-xs font-medium text-ink-400">
              File Name
            </label>
            <input
              id="export-filename"
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-ink-100 focus:outline-none focus:border-accent-500"
              placeholder="document-name"
            />
          </div>

          <div className="space-y-1.5">
            <div id="export-format-label" className="text-xs font-medium text-ink-400">
              Format
            </div>
            <div role="group" aria-labelledby="export-format-label" className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('md')}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  format === 'md'
                    ? 'border-accent-500 bg-ink-800 text-ink-100'
                    : 'border-white/10 bg-ink-850 text-ink-400 hover:bg-ink-800'
                }`}
              >
                <div className="font-medium text-xs">Markdown (.md)</div>
                <div className="text-xs text-ink-500 mt-0.5">Preserves headings & lists</div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('txt')}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  format === 'txt'
                    ? 'border-accent-500 bg-ink-800 text-ink-100'
                    : 'border-white/10 bg-ink-850 text-ink-400 hover:bg-ink-800'
                }`}
              >
                <div className="font-medium text-xs">Plain text (.txt)</div>
                <div className="text-xs text-ink-500 mt-0.5">Universal compatibility</div>
              </button>
            </div>
          </div>

          {/* Safe Filename Preview */}
          <div className="p-3 bg-ink-950 rounded-lg border border-white/10 text-xs flex items-center justify-between">
            <span className="text-ink-400">Saves as</span>
            <span className="font-mono text-emerald-400 font-medium">{sanitizedName}</span>
          </div>

          {exportMessage && (
            <div
              role={exportMessage.isError ? 'alert' : 'status'}
              className={`p-3 border text-xs rounded-lg flex items-center gap-2 ${
                exportMessage.isError
                  ? 'bg-rose-950/60 border-rose-500/30 text-rose-200'
                  : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-200'
              }`}
            >
              {exportMessage.isError ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{exportMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-ink-850 flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={handleExport}
            loading={isExporting}
          >
            <Download className="w-4 h-4 mr-1" />
            Export Now
          </Button>
        </div>
      </div>
    </div>
  );
};
