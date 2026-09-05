import React from 'react';
import { Heading1, Heading2, List, ListOrdered, Quote, RotateCcw } from 'lucide-react';

export interface ToolbarProps {
  onInsertMarkdown: (prefix: string) => void;
  onResetToSample: () => void;
  rawMode: boolean;
  onToggleRawMode: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onInsertMarkdown,
  onResetToSample,
  rawMode,
  onToggleRawMode,
}) => {
  return (
    <div className="h-10 border-b border-slate-800 bg-slate-900/50 px-3 flex items-center justify-between text-xs text-slate-400 shrink-0">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onInsertMarkdown('# ')}
          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
          title="Heading 1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onInsertMarkdown('## ')}
          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onInsertMarkdown('- ')}
          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onInsertMarkdown('1. ')}
          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onInsertMarkdown('> ')}
          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
          title="Blockquote"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleRawMode}
          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
            rawMode ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Toggle Raw Markdown Edit Mode"
        >
          {rawMode ? 'Sentence View' : 'Raw Text'}
        </button>
        <button
          onClick={onResetToSample}
          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
          title="Load Sample Text"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
