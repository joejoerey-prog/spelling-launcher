import { DocumentModel, DocumentStats, SentenceNode, ParagraphNode } from '../../types/document';
import { DeterministicIssue, IssueCategory, RewriteOption, RewriteTone, RewriteLength, RewriteGoal } from '../../types/suggestions';
import { parseDocument, calculateDocumentStats } from '../engine/segmenter';
import { rewriteSelectedPassage } from '../engine/aiRewriter';
import { rulesStore } from './rulesStore';
import { settingsStore } from './settingsStore';
import { styleStore } from './styleStore';
import { TauriBridge } from '../bridge/tauriBridge';

const MAX_HISTORY = 200;
const COALESCE_MS = 1000;
const TEXT_EXT = /\.(txt|md|markdown|text)$/i;

export interface HistoryEntry {
  rawContent: string;
  description: string;
  timestamp: Date;
}

export interface EditorState {
  document: DocumentModel;
  stats: DocumentStats;
  selectedSentenceId: string | null;
  activeSentenceIssues: DeterministicIssue[];
  allDocumentIssues: Map<string, DeterministicIssue[]>;
  rewriteOptions: RewriteOption[];
  isLoadingRewrites: boolean;
  selectedTone: RewriteTone;
  selectedLength: RewriteLength;
  selectedGoal: RewriteGoal;
  error: string | null;
  errorSource: 'rewrite' | null;
  successMessage: string | null;
  history: HistoryEntry[];
  historyIndex: number;
  sessionDiffs: Map<string, { original: string; current: string }>;
}

export const INITIAL_SAMPLE_TEXT = `# Welcome to Spelling Launcher

Spelling Launcher is your private, local-first sentence writing and rewriting assistant, checked by the native macOS spell checker and built-in rules, with optional Ollama rewrites.

We recieved alot of constructive feedback on the new launch.

In their was a major question regarding the medication's side affect.

The team met in close proximity due to the fact that we had future plans.

Please review the document ,and let us know your thoughts.`;

class EditorStore {
  private state: EditorState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    const doc = parseDocument(INITIAL_SAMPLE_TEXT, null, 'Welcome.md');
    const stats = calculateDocumentStats(INITIAL_SAMPLE_TEXT, doc.paragraphs);

    this.state = {
      document: doc,
      stats,
      selectedSentenceId: null,
      activeSentenceIssues: [],
      allDocumentIssues: new Map(),
      rewriteOptions: [],
      isLoadingRewrites: false,
      selectedTone: 'natural',
      selectedLength: 'same',
      selectedGoal: 'clarity',
      error: null,
      errorSource: null,
      successMessage: null,
      history: [
        {
          rawContent: INITIAL_SAMPLE_TEXT,
          description: 'Initial Document',
          timestamp: new Date(),
        },
      ],
      historyIndex: 0,
      sessionDiffs: new Map(),
    };

    this.refreshAllIssues();
  }

  get getState(): EditorState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  findSentence(sentenceId: string): SentenceNode | null {
    for (const p of this.state.document.paragraphs) {
      for (const s of p.sentences) {
        if (s.id === sentenceId) return s;
      }
    }
    return null;
  }

  getSelectedSentence(): SentenceNode | null {
    return this.state.selectedSentenceId ? this.findSentence(this.state.selectedSentenceId) : null;
  }

  /** Document range (UTF-16 offsets into rawContent) of the sentence's trimmed text. */
  private sentenceRange(s: SentenceNode): { start: number; end: number } | null {
    if (s.documentStartOffset === undefined) return null;
    const start = s.documentStartOffset + (s.text.length - s.text.trimStart().length);
    return { start, end: start + s.trimmedText.length };
  }

  private checkDebounceTimer: any = null;

  private shouldSkipIssue(issue: any): boolean {
    return (
      styleStore.isRuleSuppressed(issue.rule_id) ||
      (!settingsStore.state.autoCheckTypography && (issue.category === 'punctuation' || issue.category === 'capitalisation')) ||
      (!settingsStore.state.autoCheckRepetition && issue.category === 'repetition')
    );
  }

  private buildIssue(issue: any, s: SentenceNode, sentenceDocStart: number): DeterministicIssue {
    const categoryMap: Record<string, IssueCategory> = {
      spelling: 'spelling',
      grammar: 'grammar',
      style: 'wordiness',
      punctuation: 'punctuation',
      repetition: 'repetition',
      capitalisation: 'typography',
    };
    const trimmed = s.trimmedText;
    const trimStart = sentenceDocStart + (s.text.length - s.text.trimStart().length);
    // Offsets are relative to the trimmed sentence text (originalText), which is what they are sliced from.
    const relStart = Math.min(trimmed.length, Math.max(0, issue.start_offset - trimStart));
    const relEnd = Math.min(trimmed.length, Math.max(relStart, issue.end_offset - trimStart));
    const replacementStr = issue.replacement ?? (issue.suggestions && issue.suggestions.length > 0 ? issue.suggestions[0] : undefined);
    const inside = issue.start_offset >= trimStart && issue.end_offset <= trimStart + trimmed.length;

    return {
      id: issue.id || `${s.id}-${issue.rule_id}-${issue.start_offset}`,
      sentenceId: s.id,
      category: categoryMap[issue.category] || 'grammar',
      title: issue.message || 'Possible issue',
      description:
        `Matched "${issue.matched_text}".` +
        (issue.suggestions && issue.suggestions.length > 0 ? ` Suggestions: ${issue.suggestions.join(', ')}` : ''),
      severity: issue.severity === 'error' ? 'warning' : 'suggestion',
      originalText: trimmed,
      suggestedText:
        replacementStr !== undefined && inside ? trimmed.slice(0, relStart) + replacementStr + trimmed.slice(relEnd) : undefined,
      matchStart: relStart,
      matchEnd: relEnd,
      applyAllEligible: Boolean(issue.apply_all_eligible),
      ruleId: issue.rule_id,
      rawStartOffset: issue.start_offset,
      rawEndOffset: issue.end_offset,
      matchedText: issue.matched_text,
      replacement: replacementStr,
      suggestions: issue.suggestions || (replacementStr !== undefined ? [replacementStr] : []),
    };
  }

  private mapNativeIssuesToDocument(nativeIssues: any[]): void {
    const allIssues = new Map<string, DeterministicIssue[]>();
    const doc = this.state.document;

    for (const issue of nativeIssues) {
      if (this.shouldSkipIssue(issue)) continue;
      let matchedSentence: SentenceNode | null = null;
      let sentenceDocStart = 0;

      for (const p of doc.paragraphs) {
        if (p.isCodeBlock || p.isBlank) continue;
        const pStart = p.startOffset ?? 0;
        const pEnd = p.endOffset ?? 0;
        if (issue.start_offset < pStart || issue.start_offset > pEnd) continue;

        for (const s of p.sentences) {
          const sStart = s.documentStartOffset ?? (pStart + s.startOffset);
          const sEnd = s.documentEndOffset ?? (pStart + s.endOffset);
          if (issue.start_offset >= sStart && issue.start_offset <= sEnd) {
            matchedSentence = s;
            sentenceDocStart = sStart;
            break;
          }
        }
        if (matchedSentence) break;
      }

      if (!matchedSentence) {
        for (const p of doc.paragraphs) {
          if (p.isCodeBlock || p.isBlank) continue;
          const pStart = p.startOffset ?? 0;
          for (const s of p.sentences) {
            const sStart = s.documentStartOffset ?? (pStart + s.startOffset);
            const sEnd = s.documentEndOffset ?? (pStart + s.endOffset);
            if (issue.start_offset < sEnd && issue.end_offset > sStart) {
              matchedSentence = s;
              sentenceDocStart = sStart;
              break;
            }
          }
          if (matchedSentence) break;
        }
      }

      if (!matchedSentence) continue;

      const existing = allIssues.get(matchedSentence.id) || [];
      existing.push(this.buildIssue(issue, matchedSentence, sentenceDocStart));
      allIssues.set(matchedSentence.id, existing);
    }

    this.state.allDocumentIssues = allIssues;
    if (this.state.selectedSentenceId) {
      this.state.activeSentenceIssues = allIssues.get(this.state.selectedSentenceId) || [];
    }
  }

  private updateParagraphIssues(p: ParagraphNode, nativeIssues: any[]): void {
    const allIssues = new Map(this.state.allDocumentIssues);
    for (const s of p.sentences) {
      allIssues.delete(s.id);
    }

    for (const issue of nativeIssues) {
      if (this.shouldSkipIssue(issue)) continue;
      let matchedSentence: SentenceNode | null = null;
      let sentenceDocStart = 0;

      for (const s of p.sentences) {
        const sStart = s.documentStartOffset ?? ((p.startOffset || 0) + s.startOffset);
        const sEnd = s.documentEndOffset ?? ((p.startOffset || 0) + s.endOffset);
        if (issue.start_offset >= sStart && issue.start_offset <= sEnd) {
          matchedSentence = s;
          sentenceDocStart = sStart;
          break;
        }
      }

      if (!matchedSentence) continue;

      const existing = allIssues.get(matchedSentence.id) || [];
      existing.push(this.buildIssue(issue, matchedSentence, sentenceDocStart));
      allIssues.set(matchedSentence.id, existing);
    }

    this.state.allDocumentIssues = allIssues;
    if (this.state.selectedSentenceId) {
      this.state.activeSentenceIssues = allIssues.get(this.state.selectedSentenceId) || [];
    }
  }

  async refreshAllIssues(options?: { dirtyParagraphIndex?: number }): Promise<void> {
    try {
      const lang = settingsStore.state.language || 'en_GB';
      const doc = this.state.document;
      const checkedContent = doc.rawContent;

      if (options?.dirtyParagraphIndex !== undefined) {
        const p = doc.paragraphs[options.dirtyParagraphIndex];
        if (p && !p.isCodeBlock && !p.isBlank) {
          const issues = await TauriBridge.checkParagraph(p.rawText, p.startOffset || 0, lang);
          // The document changed while the backend was checking: these offsets are stale.
          if (this.state.document.rawContent !== checkedContent) return;
          this.updateParagraphIssues(p, issues);
          this.notify();

          if (this.checkDebounceTimer) clearTimeout(this.checkDebounceTimer);
          this.checkDebounceTimer = setTimeout(() => {
            this.refreshAllIssues();
          }, 300);
          return;
        }
      }

      const issues = await TauriBridge.checkDocument(checkedContent, lang);
      if (this.state.document.rawContent !== checkedContent) return;
      this.mapNativeIssuesToDocument(issues);
      this.notify();
    } catch (err: any) {
      console.warn('Native checking notice/error:', err);
      this.showError(`Native text check notice: ${err?.message || err}`);
    }
  }

  loadDocument(rawContent: string, filePath: string | null = null, fileName: string = 'Document.md'): void {
    // The segmenter's offsets assume \n line endings; CRLF files would misplace every fix.
    rawContent = rawContent.replace(/\r\n?/g, '\n');
    const doc = parseDocument(rawContent, filePath, fileName);
    const stats = calculateDocumentStats(rawContent, doc.paragraphs);

    this.state.document = doc;
    this.state.stats = stats;
    this.state.selectedSentenceId = null;
    this.state.activeSentenceIssues = [];
    this.state.rewriteOptions = [];
    this.state.error = null;
    this.state.errorSource = null;
    this.state.successMessage = `Loaded ${fileName}`;
    this.state.history = [
      {
        rawContent,
        description: `Loaded ${fileName}`,
        timestamp: new Date(),
      },
    ];
    this.state.historyIndex = 0;
    this.state.sessionDiffs = new Map();

    this.refreshAllIssues();
  }

  /** Parses new raw content into the document model, recomputes stats and marks the document dirty. */
  private setContent(rawContent: string): void {
    const doc = parseDocument(rawContent, this.state.document.filePath, this.state.document.fileName);
    doc.isDirty = true;
    doc.lastSavedAt = this.state.document.lastSavedAt;
    this.state.document = doc;
    this.state.stats = calculateDocumentStats(rawContent, doc.paragraphs);
  }

  updateRawContentDirectly(rawContent: string, dirtyParagraphIndex?: number): void {
    this.setContent(rawContent);

    this.pushHistory(rawContent, 'Manual Edit');

    if (dirtyParagraphIndex !== undefined) {
      this.refreshAllIssues({ dirtyParagraphIndex });
    } else {
      if (this.checkDebounceTimer) clearTimeout(this.checkDebounceTimer);
      this.checkDebounceTimer = setTimeout(() => {
        this.refreshAllIssues();
      }, 300);
    }
  }

  selectSentence(sentenceId: string | null): void {
    if (sentenceId !== this.state.selectedSentenceId) {
      this.state.rewriteOptions = [];
    }
    this.state.selectedSentenceId = sentenceId;
    this.state.error = null;
    this.state.errorSource = null;

    if (!sentenceId) {
      this.state.activeSentenceIssues = [];
      this.notify();
      return;
    }

    const sentence = this.getSelectedSentence();
    if (!sentence) {
      this.state.selectedSentenceId = null;
      this.notify();
      return;
    }

    this.state.activeSentenceIssues = this.state.allDocumentIssues.get(sentenceId) || [];
    // Rewriting is decoupled from selection (Amendment 3). Only triggers explicitly.
    this.notify();
  }

  async setToneAndLength(tone: RewriteTone, length: RewriteLength, goal: RewriteGoal = 'clarity'): Promise<void> {
    this.state.selectedTone = tone;
    this.state.selectedLength = length;
    this.state.selectedGoal = goal;
    await this.generateRewritesForSelected();
  }

  async generateRewritesForSelected(): Promise<void> {
    const sentence = this.getSelectedSentence();
    if (!sentence) return;

    this.state.isLoadingRewrites = true;
    this.notify();

    const settings = settingsStore.state;
    const isOllama = settings.provider === 'ollama';

    const result = await rewriteSelectedPassage(
      sentence.id,
      {
        sentenceText: sentence.trimmedText,
        tone: this.state.selectedTone,
        length: this.state.selectedLength,
        goal: this.state.selectedGoal,
      },
      {
        apiKey: isOllama ? '' : settings.openaiApiKey,
        baseUrl: isOllama ? settings.ollamaBaseUrl : settings.openaiBaseUrl,
        model: isOllama ? settings.ollamaModel : settings.openaiModel,
        provider: settings.provider,
      }
    );

    this.state.isLoadingRewrites = false;
    // The user moved to another sentence while this was generating: drop the stale result.
    if (this.state.selectedSentenceId !== sentence.id) {
      this.notify();
      return;
    }
    this.state.rewriteOptions = result.options;
    if (result.error) {
      this.state.error = result.error;
      this.state.errorSource = 'rewrite';
    }
    this.notify();
  }

  /**
   * The single edit primitive: splices rawContent at document offsets, re-parses, recomputes stats,
   * marks dirty, pushes one history entry and re-checks.
   */
  private async commitEdits(
    edits: { start: number; end: number; text: string }[],
    description: string,
    message: string = description
  ): Promise<void> {
    let content = this.state.document.rawContent;
    for (const e of [...edits].sort((a, b) => b.start - a.start)) {
      content = content.slice(0, e.start) + e.text + content.slice(e.end);
    }
    this.setContent(content);
    this.state.successMessage = message;
    this.pushHistory(content, description);
    await this.refreshAllIssues();
  }

  private staleEditNotice(): void {
    this.showError('The document changed since it was last checked, so nothing was edited. Re-checking now.');
    this.refreshAllIssues();
  }

  private recordDiff(sentenceId: string, original: string, current: string): void {
    const existing = this.state.sessionDiffs.get(sentenceId);
    this.state.sessionDiffs.set(sentenceId, { original: existing ? existing.original : original, current });
  }

  applySentenceRevision(sentenceId: string, newSentenceText: string, description: string = 'Accepted Rewrite'): void {
    const sentence = this.findSentence(sentenceId);
    if (!sentence) return;

    const originalText = sentence.trimmedText;
    const newTrimmed = newSentenceText.trim();
    if (originalText === newTrimmed) return;

    const range = this.sentenceRange(sentence);
    if (!range || this.state.document.rawContent.slice(range.start, range.end) !== originalText) {
      this.staleEditNotice();
      return;
    }

    this.recordDiff(sentenceId, originalText, newTrimmed);
    void this.commitEdits([{ ...range, text: newTrimmed }], description);
  }

  /** True when the issue's offsets still point at the text the backend matched. */
  private issueIsCurrent(issue: DeterministicIssue): boolean {
    const { rawStartOffset: start, rawEndOffset: end } = issue;
    const raw = this.state.document.rawContent;
    if (start === undefined || end === undefined || start < 0 || start > end || end > raw.length) return false;
    return issue.matchedText === undefined || raw.slice(start, end) === issue.matchedText;
  }

  applyIssueFix(issue: DeterministicIssue, specificReplacement?: string): void {
    const replacement = specificReplacement ?? issue.replacement;
    if (replacement === undefined || issue.rawStartOffset === undefined || issue.rawEndOffset === undefined) return;
    if (!this.issueIsCurrent(issue)) {
      this.staleEditNotice();
      return;
    }

    const start = issue.rawStartOffset;
    const end = issue.rawEndOffset;
    const sentence = this.findSentence(issue.sentenceId);
    const range = sentence && this.sentenceRange(sentence);
    if (sentence && range && start >= range.start && end <= range.end) {
      const t = sentence.trimmedText;
      this.recordDiff(sentence.id, t, t.slice(0, start - range.start) + replacement + t.slice(end - range.start));
    }

    const description = specificReplacement !== undefined ? `Applied: ${specificReplacement}` : `Applied: ${issue.title}`;
    void this.commitEdits([{ start, end, text: replacement }], description);
  }

  async applyAllSafeFixes(customIssues?: DeterministicIssue[]): Promise<void> {
    let eligible = customIssues;
    if (!eligible) {
      eligible = [];
      for (const issues of this.state.allDocumentIssues.values()) {
        for (const issue of issues) {
          if (issue.applyAllEligible && issue.replacement !== undefined) {
            eligible.push(issue);
          }
        }
      }
    }

    // Descending offset order; skip stale fixes and any fix overlapping one already applied.
    const sorted = eligible
      .filter((i) => i.replacement !== undefined && this.issueIsCurrent(i))
      .sort((a, b) => b.rawStartOffset! - a.rawStartOffset!);
    const edits: { start: number; end: number; text: string }[] = [];
    let lastStart = Infinity;
    for (const issue of sorted) {
      if (issue.rawEndOffset! > lastStart) continue;
      edits.push({ start: issue.rawStartOffset!, end: issue.rawEndOffset!, text: issue.replacement! });
      lastStart = issue.rawStartOffset!;
    }

    if (eligible.length === 0) return;
    if (edits.length === 0) {
      this.staleEditNotice();
      return;
    }

    const skipped = eligible.length - edits.length;
    await this.commitEdits(
      edits,
      `Applied All (${edits.length}) Fixes`,
      `Successfully applied ${edits.length} fixes` + (skipped > 0 ? ` (${skipped} skipped: overlapping or out of date)` : '')
    );
  }

  async ignoreWord(word: string): Promise<void> {
    try {
      await TauriBridge.ignoreWord(word);
      await rulesStore.fetchAll();
      this.state.successMessage = `Ignored word "${word}"`;
      await this.refreshAllIssues();
    } catch (e: any) {
      this.showError(`Could not ignore word: ${e?.message || e}`);
    }
  }

  pushHistory(rawContent: string, description: string): void {
    const now = new Date();
    const idx = this.state.historyIndex;
    const last = this.state.history[idx];
    let newHistory: HistoryEntry[];

    if (
      description === 'Manual Edit' &&
      last?.description === 'Manual Edit' &&
      idx === this.state.history.length - 1 &&
      now.getTime() - last.timestamp.getTime() < COALESCE_MS
    ) {
      // Typing burst: fold into the previous Manual Edit entry.
      newHistory = [...this.state.history.slice(0, idx), { rawContent, description, timestamp: now }];
    } else {
      newHistory = [...this.state.history.slice(0, idx + 1), { rawContent, description, timestamp: now }];
      if (newHistory.length > MAX_HISTORY) newHistory = newHistory.slice(newHistory.length - MAX_HISTORY);
    }

    this.state.history = newHistory;
    this.state.historyIndex = newHistory.length - 1;
    this.notify();
  }

  private restoreHistory(index: number, label: string): void {
    this.state.historyIndex = index;
    const entry = this.state.history[index];
    this.setContent(entry.rawContent);
    // Drop revision records the restored text no longer contains (shortcut: redo does not bring them back).
    for (const [id, d] of this.state.sessionDiffs) {
      if (this.findSentence(id)?.trimmedText !== d.current) this.state.sessionDiffs.delete(id);
    }
    this.state.rewriteOptions = [];
    if (this.state.selectedSentenceId && !this.getSelectedSentence()) {
      this.state.selectedSentenceId = null;
      this.state.activeSentenceIssues = [];
    }
    this.state.successMessage = `${label}: ${entry.description}`;
    this.notify();
    this.refreshAllIssues();
  }

  undo(): void {
    if (this.state.historyIndex <= 0) return;
    this.restoreHistory(this.state.historyIndex - 1, 'Undo');
  }

  redo(): void {
    if (this.state.historyIndex >= this.state.history.length - 1) return;
    this.restoreHistory(this.state.historyIndex + 1, 'Redo');
  }

  async learnWord(word: string): Promise<void> {
    try {
      await TauriBridge.learnWord(word);
      await styleStore.addLearnedWord(word);
      await rulesStore.fetchAll();
      this.state.successMessage = `Added "${word}" to your learned words`;
      await this.refreshAllIssues();
    } catch (e: any) {
      this.showError(`Could not learn word: ${e?.message || e}`);
    }
  }

  async ignoreIssue(issue: DeterministicIssue): Promise<void> {
    const key = issue.ruleId || issue.category;
    const newlySuppressed = await styleStore.recordRejection(key);
    if (newlySuppressed) {
      this.state.successMessage = `Rule "${key}" suppressed based on writing style feedback (3 rejections)`;
    } else {
      const count = styleStore.state.ruleRejections[key] || 1;
      this.state.successMessage = `Ignored issue (${count}/3 before auto-suppression)`;
    }
    this.state.activeSentenceIssues = this.state.activeSentenceIssues.filter((i) => i.id !== issue.id);
    const existing = this.state.allDocumentIssues.get(issue.sentenceId) || [];
    this.state.allDocumentIssues.set(
      issue.sentenceId,
      existing.filter((i) => i.id !== issue.id)
    );
    this.notify();
  }

  showError(message: string, source: 'rewrite' | null = null): void {
    this.state.error = message;
    this.state.errorSource = source;
    this.notify();
  }

  clearSuccess(): void {
    this.state.successMessage = null;
    this.notify();
  }

  clearError(): void {
    this.state.error = null;
    this.state.errorSource = null;
    this.notify();
  }

  clearMessages(): void {
    this.state.error = null;
    this.state.errorSource = null;
    this.state.successMessage = null;
    this.notify();
  }

  markSaved(filePath: string, savedContent?: string): void {
    const doc = this.state.document;
    // Edits made while the save was in flight keep the document dirty.
    doc.isDirty = savedContent !== undefined && doc.rawContent !== savedContent;
    doc.filePath = filePath;
    doc.fileName = filePath.split(/[\\/]/).pop() || doc.fileName;
    doc.lastSavedAt = new Date();
    this.state.successMessage = 'Document saved successfully';
    this.notify();
  }

  /** Cmd+S and the header Save button. Asks for a destination when there is no text-file path yet. */
  async saveCurrentDocument(): Promise<void> {
    try {
      const doc = this.state.document;
      let target = doc.filePath;
      if (!target || !TEXT_EXT.test(target)) {
        const stem = doc.fileName.replace(/\.[^/.]+$/, '') || 'document';
        target = await TauriBridge.chooseSavePath(`${stem}.md`);
        if (!target) return;
      }

      const content = this.state.document.rawContent;
      const res = await TauriBridge.saveDocument(target, content, true);
      if (!res.success) {
        this.showError(`Save failed: ${res.message || 'unknown error'}`);
        return;
      }
      this.markSaved(target, content);
      const saved = this.state.document;
      await rulesStore
        .addRecentDoc({
          file_path: target,
          title: saved.fileName.replace(/\.[^/.]+$/, ''),
          word_count: content.split(/\s+/).filter(Boolean).length,
          last_modified: 'Just now',
          snippet: content.slice(0, 100),
        })
        .catch(() => {});
    } catch (e: any) {
      this.showError(`Save failed: ${e?.message || e}`);
    }
  }
}

export const editorStore = new EditorStore();
