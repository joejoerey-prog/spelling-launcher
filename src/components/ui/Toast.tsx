import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, RefreshCw } from 'lucide-react';

export interface ToastProps {
  message: string | null;
  type?: 'success' | 'error' | 'info';
  onDismiss: () => void;
  onRetry?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onDismiss, onRetry }) => {
  useEffect(() => {
    if (message && type !== 'error') {
      const timer = setTimeout(() => {
        onDismiss();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, type, onDismiss]);

  if (!message) return null;

  const bgStyles = {
    success: 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200',
    error: 'bg-rose-950/90 border-rose-500/40 text-rose-200',
    info: 'bg-slate-800/95 border-slate-700 text-slate-200',
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-lg ${bgStyles[type]}`}>
        {type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
        {type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
        <span className="text-sm font-medium flex-1">{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-500/40 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        )}
        <button onClick={onDismiss} className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/10 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
