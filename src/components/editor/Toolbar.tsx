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
    <div className="h-10 border-b border-white/10 bg-ink-900 px-3 flex items-center justify-between text-xs text-ink-400 shrink-0 select-none">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onInsertMarkdown('# ')}
          className="p-1.5 hover:bg-ink-800 rounded text-ink-400 hover:text-ink-200 transition-colors"
          title="Heading 1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onInsertMarkdown('## ')}
          className="p-1.5 hover:bg-ink-800 rounded text-ink-400 hover:text-ink-200 transition-colors"
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onInsertMarkdown('- ')}
          className="p-1.5 hover:bg-ink-800 rounded text-ink-400 hover:text-ink-200 transition-colors"
          title="Bullet list"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onInsertMarkdown('1. ')}
          className="p-1.5 hover:bg-ink-800 rounded text-ink-400 hover:text-ink-200 transition-colors"
          title="Numbered list"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onInsertMarkdown('> ')}
          className="p-1.5 hover:bg-ink-800 rounded text-ink-400 hover:text-ink-200 transition-colors"
          title="Blockquote"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleRawMode}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            rawMode ? 'bg-ink-800 text-ink-100 border border-white/10' : 'text-ink-400 hover:text-ink-200 hover:bg-ink-800'
          }`}
          title="Toggle raw text"
        >
          {rawMode ? 'Sentences' : 'Raw text'}
        </button>
        <button
          onClick={onResetToSample}
          className="p-1.5 hover:bg-ink-800 rounded text-ink-400 hover:text-ink-200 transition-colors"
          title="Load sample text"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
