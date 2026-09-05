import React, { useState } from 'react';
import { X, Download, Check } from 'lucide-react';
import { editorStore } from '../../core/state/editorStore';
import { TauriBridge } from '../../core/bridge/tauriBridge';
import { Button } from '../ui/Button';

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
  const [exportMessage, setExportMessage] = useState<string | null>(null);

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
        setExportMessage(`Successfully exported: ${sanitizedName}`);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (e: any) {
      setExportMessage(`Export error: ${e?.message || e}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-slate-100">Export Document</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-sm text-slate-300">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              File Name
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              placeholder="document-name"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Format
            </label>
            <div className="grid grid-cols-2 gap-2">
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
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 text-xs rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{exportMessage}</span>
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
