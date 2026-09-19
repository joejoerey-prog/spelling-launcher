import { DocumentModel, DocumentStats, SentenceNode, ParagraphNode } from '../../types/document';
import { DeterministicIssue, IssueCategory, RewriteOption, RewriteTone, RewriteLength, RewriteGoal } from '../../types/suggestions';
import { parseDocument, reassembleDocument, calculateDocumentStats } from '../engine/segmenter';
import { rewriteSelectedPassage } from '../engine/aiRewriter';
import { rulesStore } from './rulesStore';
import { settingsStore } from './settingsStore';
import { styleStore } from './styleStore';
import { TauriBridge } from '../bridge/tauriBridge';

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
  successMessage: string | null;
  history: HistoryEntry[];
  historyIndex: number;
  sessionDiffs: Map<string, { original: string; current: string }>;
}

const INITIAL_SAMPLE_TEXT = `# Welcome to Spelling Launcher

Spelling Launcher is your private, local-first sentence writing and rewriting assistant powered by your local Ollama instance and LanguageTool rules.

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

  getSelectedSentence(): SentenceNode | null {
    if (!this.state.selectedSentenceId) return null;
    for (const p of this.state.document.paragraphs) {
      for (const s of p.sentences) {
        if (s.id === this.state.selectedSentenceId) return s;
      }
    }
    return null;
  }

  private checkDebounceTimer: any = null;

  private mapNativeIssuesToDocument(nativeIssues: any[]): void {
    const allIssues = new Map<string, DeterministicIssue[]>();
    const doc = this.state.document;

    for (const issue of nativeIssues) {
      if (styleStore.isRuleSuppressed(issue.rule_id)) continue;
      if (!settingsStore.state.autoCheckTypography && (issue.category === 'punctuation' || issue.category === 'capitalisation')) continue;
      if (!settingsStore.state.autoCheckRepetition && issue.category === 'repetition') continue;
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

      const categoryMap: Record<string, IssueCategory> = {
        spelling: 'spelling',
        grammar: 'grammar',
        style: 'wordiness',
        punctuation: 'punctuation',
        repetition: 'repetition',
        capitalisation: 'typography',
      };
      const cat = categoryMap[issue.category] || 'grammar';

      const relStart = Math.max(0, issue.start_offset - sentenceDocStart);
      const relEnd = Math.min(matchedSentence.text.length, issue.end_offset - sentenceDocStart);
      const replacementStr = issue.replacement ?? (issue.suggestions && issue.suggestions.length > 0 ? issue.suggestions[0] : undefined);

      let fullSuggestedText: string | undefined;
      if (replacementStr !== undefined) {
        if (matchedSentence.trimmedText.includes(issue.matched_text)) {
          fullSuggestedText = matchedSentence.trimmedText.replace(issue.matched_text, replacementStr);
        } else {
          fullSuggestedText = matchedSentence.trimmedText;
        }
      }

      const detIssue: DeterministicIssue = {
        id: issue.id || `${matchedSentence.id}-${issue.rule_id}-${issue.start_offset}`,
        sentenceId: matchedSentence.id,
        category: cat,
        title: issue.message || `Issue: ${issue.rule_id}`,
        description: `Rule: ${issue.rule_id}. Matched "${issue.matched_text}".` + (issue.suggestions && issue.suggestions.length > 0 ? ` Suggestions: ${issue.suggestions.join(', ')}` : ''),
        severity: issue.severity === 'error' ? 'warning' : 'suggestion',
        originalText: matchedSentence.trimmedText,
        suggestedText: fullSuggestedText,
        matchStart: relStart,
        matchEnd: relEnd,
        applyAllEligible: Boolean(issue.apply_all_eligible),
        ruleId: issue.rule_id,
        rawStartOffset: issue.start_offset,
        rawEndOffset: issue.end_offset,
        replacement: replacementStr,
        suggestions: issue.suggestions || (replacementStr ? [replacementStr] : []),
      };

      const existing = allIssues.get(matchedSentence.id) || [];
      existing.push(detIssue);
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
      if (styleStore.isRuleSuppressed(issue.rule_id)) continue;
      if (!settingsStore.state.autoCheckTypography && (issue.category === 'punctuation' || issue.category === 'capitalisation')) continue;
      if (!settingsStore.state.autoCheckRepetition && issue.category === 'repetition') continue;
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

      const categoryMap: Record<string, IssueCategory> = {
        spelling: 'spelling',
        grammar: 'grammar',
        style: 'wordiness',
        punctuation: 'punctuation',
        repetition: 'repetition',
        capitalisation: 'typography',
      };
      const cat = categoryMap[issue.category] || 'grammar';
      const relStart = Math.max(0, issue.start_offset - sentenceDocStart);
      const relEnd = Math.min(matchedSentence.text.length, issue.end_offset - sentenceDocStart);
      const replacementStr = issue.replacement ?? (issue.suggestions && issue.suggestions.length > 0 ? issue.suggestions[0] : undefined);

      let fullSuggestedText: string | undefined;
      if (replacementStr !== undefined) {
        if (matchedSentence.trimmedText.includes(issue.matched_text)) {
          fullSuggestedText = matchedSentence.trimmedText.replace(issue.matched_text, replacementStr);
        } else {
          fullSuggestedText = matchedSentence.trimmedText;
        }
      }

      const detIssue: DeterministicIssue = {
        id: issue.id || `${matchedSentence.id}-${issue.rule_id}-${issue.start_offset}`,
        sentenceId: matchedSentence.id,
        category: cat,
        title: issue.message || `Issue: ${issue.rule_id}`,
        description: `Rule: ${issue.rule_id}. Matched "${issue.matched_text}".` + (issue.suggestions && issue.suggestions.length > 0 ? ` Suggestions: ${issue.suggestions.join(', ')}` : ''),
        severity: issue.severity === 'error' ? 'warning' : 'suggestion',
        originalText: matchedSentence.trimmedText,
        suggestedText: fullSuggestedText,
        matchStart: relStart,
        matchEnd: relEnd,
        applyAllEligible: Boolean(issue.apply_all_eligible),
        ruleId: issue.rule_id,
        rawStartOffset: issue.start_offset,
        rawEndOffset: issue.end_offset,
        replacement: replacementStr,
        suggestions: issue.suggestions || (replacementStr ? [replacementStr] : []),
      };

      const existing = allIssues.get(matchedSentence.id) || [];
      existing.push(detIssue);
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

      if (options?.dirtyParagraphIndex !== undefined) {
        const p = doc.paragraphs[options.dirtyParagraphIndex];
        if (p && !p.isCodeBlock && !p.isBlank) {
          const issues = await TauriBridge.checkParagraph(p.rawText, p.startOffset || 0, lang);
          this.updateParagraphIssues(p, issues);
          this.notify();

          if (this.checkDebounceTimer) clearTimeout(this.checkDebounceTimer);
          this.checkDebounceTimer = setTimeout(() => {
            this.refreshAllIssues();
          }, 300);
          return;
        }
      }

      const issues = await TauriBridge.checkDocument(doc.rawContent, lang);
      this.mapNativeIssuesToDocument(issues);
      this.notify();
    } catch (err: any) {
      console.warn('Native checking notice/error:', err);
      this.state.error = `Native text check notice: ${err?.message || err}`;
      this.notify();
    }
  }

  loadDocument(rawContent: string, filePath: string | null = null, fileName: string = 'Document.md'): void {
    const doc = parseDocument(rawContent, filePath, fileName);
    const stats = calculateDocumentStats(rawContent, doc.paragraphs);

    this.state.document = doc;
    this.state.stats = stats;
    this.state.selectedSentenceId = null;
    this.state.activeSentenceIssues = [];
    this.state.rewriteOptions = [];
    this.state.error = null;
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

  updateRawContentDirectly(rawContent: string, dirtyParagraphIndex?: number): void {
    const doc = parseDocument(rawContent, this.state.document.filePath, this.state.document.fileName);
    doc.isDirty = true;
    const stats = calculateDocumentStats(rawContent, doc.paragraphs);

    this.state.document = doc;
    this.state.stats = stats;

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
    this.state.selectedSentenceId = sentenceId;
    this.state.error = null;

    if (!sentenceId) {
      this.state.activeSentenceIssues = [];
      this.state.rewriteOptions = [];
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

    this.state.rewriteOptions = result.options;
    this.state.isLoadingRewrites = false;
    if (result.error) {
      this.state.error = result.error;
    }
    this.notify();
  }

  applySentenceRevision(sentenceId: string, newSentenceText: string, description: string = 'Accepted Rewrite'): void {
    const sentence = this.getSelectedSentence();
    if (!sentence || sentence.id !== sentenceId) return;

    const originalText = sentence.trimmedText;
    const newTrimmed = newSentenceText.trim();

    if (originalText === newTrimmed) return;

    const existing = this.state.sessionDiffs.get(sentenceId);
    this.state.sessionDiffs.set(sentenceId, {
      original: existing ? existing.original : originalText,
      current: newTrimmed,
    });

    for (const p of this.state.document.paragraphs) {
      for (const s of p.sentences) {
        if (s.id === sentenceId) {
          s.text = newTrimmed;
          s.trimmedText = newTrimmed;
          break;
        }
      }
    }

    const reassembled = reassembleDocument(this.state.document);
    this.state.document.rawContent = reassembled;
    this.state.document.isDirty = true;
    this.state.stats = calculateDocumentStats(reassembled, this.state.document.paragraphs);
    this.state.successMessage = description;

    this.pushHistory(reassembled, description);
    this.refreshAllIssues();
  }

  applyIssueFix(issue: DeterministicIssue, specificReplacement?: string): void {
    if (specificReplacement && issue.originalText && issue.matchStart !== undefined && issue.matchEnd !== undefined) {
      const newSentenceText =
        issue.originalText.slice(0, issue.matchStart) +
        specificReplacement +
        issue.originalText.slice(issue.matchEnd);
      this.applySentenceRevision(issue.sentenceId, newSentenceText, `Applied: ${specificReplacement}`);
    } else if (issue.suggestedText) {
      this.applySentenceRevision(issue.sentenceId, issue.suggestedText, `Applied: ${issue.title}`);
    } else if (issue.rawStartOffset !== undefined && issue.rawEndOffset !== undefined && issue.replacement !== undefined) {
      const raw = this.state.document.rawContent;
      const rep = specificReplacement || issue.replacement;
      const updated = raw.slice(0, issue.rawStartOffset) + rep + raw.slice(issue.rawEndOffset);
      this.updateRawContentDirectly(updated);
    }
  }

  async applyAllSafeFixes(customIssues?: DeterministicIssue[]): Promise<void> {
    let eligible = customIssues;
    if (!eligible) {
      eligible = [];
      for (const issues of this.state.allDocumentIssues.values()) {
        for (const issue of issues) {
          if (issue.applyAllEligible && (issue.replacement !== undefined || issue.suggestedText !== undefined)) {
            eligible.push(issue);
          }
        }
      }
    }

    if (eligible.length === 0) return;

    let content = this.state.document.rawContent;

    const sorted = [...eligible]
      .filter((i) => i.rawStartOffset !== undefined && i.rawEndOffset !== undefined && i.replacement !== undefined)
      .sort((a, b) => (b.rawStartOffset || 0) - (a.rawStartOffset || 0));

    if (sorted.length > 0) {
      for (const issue of sorted) {
        const start = issue.rawStartOffset!;
        const end = issue.rawEndOffset!;
        const repl = issue.replacement!;
        content = content.slice(0, start) + repl + content.slice(end);
      }
    } else {
      for (const issue of eligible) {
        if (issue.suggestedText) {
          for (const p of this.state.document.paragraphs) {
            for (const s of p.sentences) {
              if (s.id === issue.sentenceId) {
                s.text = issue.suggestedText;
                s.trimmedText = issue.suggestedText.trim();
              }
            }
          }
        }
      }
      content = reassembleDocument(this.state.document);
    }

    const doc = parseDocument(content, this.state.document.filePath, this.state.document.fileName);
    doc.isDirty = true;
    this.state.document = doc;
    this.state.stats = calculateDocumentStats(content, doc.paragraphs);

    const desc = `Applied All (${eligible.length}) Fixes`;
    this.pushHistory(content, desc);
    this.state.successMessage = `Successfully applied ${eligible.length} fixes`;
    await this.refreshAllIssues();
  }

  async ignoreWord(word: string): Promise<void> {
    try {
      await TauriBridge.ignoreWord(word);
      await rulesStore.addIgnoredTerm(word);
      this.state.successMessage = `Ignored word "${word}"`;
      await this.refreshAllIssues();
    } catch (e: any) {
      this.state.error = `Could not ignore word: ${e?.message || e}`;
      this.notify();
    }
  }

  pushHistory(rawContent: string, description: string): void {
    const newHistory = this.state.history.slice(0, this.state.historyIndex + 1);
    newHistory.push({
      rawContent,
      description,
      timestamp: new Date(),
    });

    this.state.history = newHistory;
    this.state.historyIndex = newHistory.length - 1;
    this.notify();
  }

  undo(): void {
    if (this.state.historyIndex <= 0) return;
    this.state.historyIndex -= 1;
    const entry = this.state.history[this.state.historyIndex];

    const doc = parseDocument(entry.rawContent, this.state.document.filePath, this.state.document.fileName);
    doc.isDirty = true;
    this.state.document = doc;
    this.state.stats = calculateDocumentStats(entry.rawContent, doc.paragraphs);
    this.state.successMessage = `Undo: ${entry.description}`;

    this.refreshAllIssues();
  }

  redo(): void {
    if (this.state.historyIndex >= this.state.history.length - 1) return;
    this.state.historyIndex += 1;
    const entry = this.state.history[this.state.historyIndex];

    const doc = parseDocument(entry.rawContent, this.state.document.filePath, this.state.document.fileName);
    doc.isDirty = true;
    this.state.document = doc;
    this.state.stats = calculateDocumentStats(entry.rawContent, doc.paragraphs);
    this.state.successMessage = `Redo: ${entry.description}`;

    this.refreshAllIssues();
  }

  async learnWord(word: string): Promise<void> {
    await TauriBridge.learnWord(word);
    await styleStore.addLearnedWord(word);
    this.state.successMessage = `Learned "${word}" in macOS system dictionary`;
    this.refreshAllIssues();
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

  clearMessages(): void {
    this.state.error = null;
    this.state.successMessage = null;
    this.notify();
  }

  markSaved(filePath: string): void {
    this.state.document.isDirty = false;
    this.state.document.filePath = filePath;
    this.state.document.lastSavedAt = new Date();
    this.state.successMessage = 'Document saved successfully';
    this.notify();
  }
}

export const editorStore = new EditorStore();
