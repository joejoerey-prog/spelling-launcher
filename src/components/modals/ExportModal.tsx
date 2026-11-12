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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        tabIndex={-1}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col outline-none"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5 text-emerald-400" />
            <h2 id="export-modal-title" className="text-base font-bold text-slate-100">Export Document</h2>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-sm text-slate-300">
          <div className="space-y-1.5">
            <label htmlFor="export-filename" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              File Name
            </label>
            <input
              id="export-filename"
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              placeholder="document-name"
            />
          </div>

          <div className="space-y-1.5">
            <div id="export-format-label" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Format
            </div>
            <div role="group" aria-labelledby="export-format-label" className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('md')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  format === 'md'
                    ? 'border-emerald-500 bg-emerald-950/20 text-emerald-200'
                    : 'border-slate-800 bg-slate-850 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold text-xs">Markdown (.md)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Preserves headings & lists</div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('txt')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  format === 'txt'
                    ? 'border-emerald-500 bg-emerald-950/20 text-emerald-200'
                    : 'border-slate-800 bg-slate-850 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold text-xs">Plain Text (.txt)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Universal compatibility</div>
              </button>
            </div>
          </div>

          {/* Safe Filename Preview */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs flex items-center justify-between">
            <span className="text-slate-400">Export Target:</span>
            <span className="font-mono text-emerald-400 font-semibold">{sanitizedName}</span>
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
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
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
