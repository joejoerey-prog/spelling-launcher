import React, { useState } from 'react';
import { X, BookOpen, Plus, Trash2, AlertCircle, Sparkles, Check } from 'lucide-react';
import { rulesStore } from '../../core/state/rulesStore';
import { editorStore } from '../../core/state/editorStore';
import { UserRule } from '../../types/database';
import { Button } from '../ui/Button';

export interface RuleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LANGUAGE_TOOL_STARTER_PACK: Omit<UserRule, 'id'>[] = [
  {
    name: "Plain English: Utilize -> Use",
    pattern: "\\butilize\\b",
    replacement: "use",
    category: "conciseness",
    description: "Replace pompous/wordy 'utilize' with simple, direct 'use'.",
    is_active: true,
  },
  {
    name: "Plain English: Facilitate -> Help / Enable",
    pattern: "\\bfacilitate\\b",
    replacement: "help",
    category: "clarity",
    description: "Simplify corporate jargon 'facilitate' to 'help'.",
    is_active: true,
  },
  {
    name: "Plain English: Commence -> Begin / Start",
    pattern: "\\bcommence\\b",
    replacement: "start",
    category: "style",
    description: "Simplify formal 'commence' to 'start'.",
    is_active: true,
  },
  {
    name: "Plain English: Terminate -> End",
    pattern: "\\bterminate\\b",
    replacement: "end",
    category: "clarity",
    description: "Simplify harsh/formal 'terminate' to 'end'.",
    is_active: true,
  },
  {
    name: "Plain English: Leverage -> Use",
    pattern: "\\bleverage\\b",
    replacement: "use",
    category: "style",
    description: "Replace buzzword 'leverage' with 'use'.",
    is_active: true,
  },
  {
    name: "Cliché: At the end of the day -> Ultimately",
    pattern: "\\bat the end of the day\\b",
    replacement: "ultimately",
    category: "style",
    description: "Replace overused cliché 'at the end of the day' with 'ultimately'.",
    is_active: true,
  },
  {
    name: "Wordiness: First and foremost -> First",
    pattern: "\\bfirst and foremost\\b",
    replacement: "first",
    category: "conciseness",
    description: "Simplify pleonasm 'first and foremost' to 'first'.",
    is_active: true,
  },
  {
    name: "Wordiness: In view of the fact that -> Because",
    pattern: "\\bin view of the fact that\\b",
    replacement: "because",
    category: "conciseness",
    description: "Simplify wordy 'in view of the fact that' to 'because'.",
    is_active: true,
  },
  {
    name: "Cliché: Low-hanging fruit -> Quick wins",
    pattern: "\\blow-hanging fruit\\b",
    replacement: "quick wins",
    category: "style",
    description: "Replace corporate buzzword 'low-hanging fruit' with 'quick wins'.",
    is_active: true,
  },
  {
    name: "Wordiness: In spite of the fact that -> Although",
    pattern: "\\bin spite of the fact that\\b",
    replacement: "although",
    category: "conciseness",
    description: "Simplify wordy phrase 'in spite of the fact that' to 'although'.",
    is_active: true,
  },
];

export const RuleManagerModal: React.FC<RuleManagerModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'dictionary'>('rules');
  const [ruleName, setRuleName] = useState('');
  const [pattern, setPattern] = useState('');
  const [replacement, setReplacement] = useState('');
  const [category, setCategory] = useState('clarity');
  const [description, setDescription] = useState('');
  const [newIgnoredTerm, setNewIgnoredTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [starterPackSuccess, setStarterPackSuccess] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const { rules, ignoredList } = rulesStore.state;

  if (!isOpen) return null;

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim() || !pattern.trim()) {
      setError('Please provide a rule name and regex pattern.');
      return;
    }

    try {
      new RegExp(pattern);
    } catch {
      setError('Invalid regular expression syntax.');
      return;
    }

    await rulesStore.addRule({
      name: ruleName.trim(),
      pattern: pattern.trim(),
      replacement: replacement.trim(),
      category,
      description: description.trim() || `Replace with "${replacement.trim()}"`,
      is_active: true,
    });

    setRuleName('');
    setPattern('');
    setReplacement('');
    setDescription('');
    setError(null);
    editorStore.refreshAllIssues();
  };

  const handleLoadStarterPack = async () => {
    setIsImporting(true);
    setStarterPackSuccess(false);

    try {
      const existingPatterns = new Set(rules.map((r) => r.pattern.toLowerCase()));
      for (const rule of LANGUAGE_TOOL_STARTER_PACK) {
        if (!existingPatterns.has(rule.pattern.toLowerCase())) {
          await rulesStore.addRule(rule);
        }
      }
      editorStore.refreshAllIssues();
      setStarterPackSuccess(true);
      setTimeout(() => setStarterPackSuccess(false), 4000);
    } catch (err: any) {
      setError(`Failed to load starter pack: ${err?.message || err}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleToggle = async (rule: UserRule) => {
    if (rule.id) {
      await rulesStore.toggleRule(rule.id, !rule.is_active);
      editorStore.refreshAllIssues();
    }
  };

  const handleDelete = async (id?: number) => {
    if (id) {
      await rulesStore.deleteRule(id);
      editorStore.refreshAllIssues();
    }
  };

  const handleAddIgnored = async () => {
    if (!newIgnoredTerm.trim()) return;
    await rulesStore.addIgnoredTerm(newIgnoredTerm.trim());
    setNewIgnoredTerm('');
    editorStore.refreshAllIssues();
  };

  const handleRemoveIgnored = async (id?: number, term?: string) => {
    if (id && term) {
      await rulesStore.removeIgnoredTerm(id, term);
      editorStore.refreshAllIssues();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-slate-100">Custom Rules & Local Dictionary</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-3 border-b-2 transition-all ${
              activeTab === 'rules'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Custom Linguistic Rules ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab('dictionary')}
            className={`py-3 border-b-2 transition-all ${
              activeTab === 'dictionary'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Ignored Terms Dictionary ({ignoredList.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-300">
          {activeTab === 'rules' ? (
            <>
              {/* LanguageTool Starter Pack Banner */}
              <div className="p-4 bg-indigo-950/30 rounded-xl border border-indigo-500/20 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-xs text-slate-100 uppercase tracking-wider">
                      LanguageTool Plain English Starter Pack
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-normal">
                    Import curated Plain English rules for replacing corporate jargon, clichés, and wordiness into your local database.
                  </p>
                  {starterPackSuccess && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 pt-1 font-medium">
                      <Check className="w-3.5 h-3.5" /> LanguageTool rules imported successfully!
                    </div>
                  )}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleLoadStarterPack}
                  disabled={isImporting}
                  className="shrink-0 text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  {isImporting ? 'Importing...' : 'Load Rules Pack'}
                </Button>
              </div>

              {/* Add Rule Form */}
              <form onSubmit={handleAddRule} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                <div className="font-semibold text-xs text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-sky-400" /> Create New Linguistic Rule
                </div>

                {error && (
                  <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Rule Name</label>
                    <input
                      type="text"
                      value={ruleName}
                      onChange={(e) => setRuleName(e.target.value)}
                      placeholder="e.g. Avoid 'In terms of'"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                    >
                      <option value="clarity">Clarity</option>
                      <option value="conciseness">Conciseness</option>
                      <option value="style">Style</option>
                      <option value="tone">Tone</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Pattern (Regex / Text)</label>
                    <input
                      type="text"
                      value={pattern}
                      onChange={(e) => setPattern(e.target.value)}
                      placeholder="e.g. \bin terms of\b"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Replacement</label>
                    <input
                      type="text"
                      value={replacement}
                      onChange={(e) => setReplacement(e.target.value)}
                      placeholder="e.g. regarding"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Description (Optional)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short advice explaining the change..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button type="submit" variant="primary" size="sm" className="text-xs px-4">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Rule
                  </Button>
                </div>
              </form>

              {/* Rules List */}
              <div className="space-y-3">
                <div className="font-semibold text-xs text-slate-400 uppercase tracking-wider">
                  Active Rules ({rules.filter((r) => r.is_active).length} of {rules.length})
                </div>

                {rules.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                    No custom rules configured yet. Click "Load Rules Pack" above to get started!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          rule.is_active
                            ? 'bg-slate-950/40 border-slate-800 text-slate-200'
                            : 'bg-slate-950/20 border-slate-900 text-slate-500 opacity-60'
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-200 truncate">{rule.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded uppercase font-mono">
                              {rule.category}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-slate-400 flex items-center gap-2 truncate">
                            <span className="text-rose-400/80">{rule.pattern}</span>
                            <span>→</span>
                            <span className="text-emerald-400/80">{rule.replacement || '(remove)'}</span>
                          </div>
                          {rule.description && (
                            <p className="text-[11px] text-slate-500 truncate">{rule.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleToggle(rule)}
                            className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${
                              rule.is_active ? 'bg-emerald-500' : 'bg-slate-700'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                rule.is_active ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <button
                            onClick={() => handleDelete(rule.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                            title="Delete rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Ignored Terms Tab */
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newIgnoredTerm}
                  onChange={(e) => setNewIgnoredTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddIgnored()}
                  placeholder="Add custom word, acronym or brand to ignore..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
                <Button variant="secondary" size="sm" onClick={handleAddIgnored} className="text-xs px-3">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Term
                </Button>
              </div>

              <div className="space-y-2">
                {ignoredList.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                    No ignored terms. Words flagged for repetition can be added here.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {ignoredList.map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-mono border border-slate-700/60"
                      >
                        <span>{item.term}</span>
                        <button
                          onClick={() => handleRemoveIgnored(item.id, item.term)}
                          className="text-slate-400 hover:text-rose-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
