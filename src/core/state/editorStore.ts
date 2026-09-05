import { DocumentModel, DocumentStats, SentenceNode } from '../../types/document';
import { DeterministicIssue, RewriteOption, RewriteTone, RewriteLength, RewriteGoal } from '../../types/suggestions';
import { parseDocument, reassembleDocument, calculateDocumentStats } from '../engine/segmenter';
import { analyzeSentenceIssues } from '../engine/deterministicRules';
import { rewriteSelectedPassage } from '../engine/aiRewriter';
import { rulesStore } from './rulesStore';
import { settingsStore } from './settingsStore';

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

  refreshAllIssues(): void {
    const allIssues = new Map<string, DeterministicIssue[]>();
    const rules = rulesStore.state.rules;
    const ignored = rulesStore.state.ignoredTerms;
    const settings = settingsStore.state;

    for (const p of this.state.document.paragraphs) {
      if (p.isCodeBlock || p.isBlank) continue;
      for (const s of p.sentences) {
        const issues = analyzeSentenceIssues(s, {
          ignoredTerms: ignored,
          userRules: rules,
          maxSentenceLength: settings.maxSentenceLengthThreshold,
          checkPassive: settings.autoCheckPassive,
          checkTypography: settings.autoCheckTypography,
          checkRepetition: settings.autoCheckRepetition,
        });
        if (issues.length > 0) {
          allIssues.set(s.id, issues);
        }
      }
    }

    this.state.allDocumentIssues = allIssues;

    if (this.state.selectedSentenceId) {
      this.state.activeSentenceIssues = allIssues.get(this.state.selectedSentenceId) || [];
    }

    this.notify();
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

  updateRawContentDirectly(rawContent: string): void {
    const doc = parseDocument(rawContent, this.state.document.filePath, this.state.document.fileName);
    doc.isDirty = true;
    const stats = calculateDocumentStats(rawContent, doc.paragraphs);

    this.state.document = doc;
    this.state.stats = stats;

    this.pushHistory(rawContent, 'Manual Edit');
    this.refreshAllIssues();
  }

  async selectSentence(sentenceId: string | null): Promise<void> {
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
    await this.generateRewritesForSelected();
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

    this.generateRewritesForSelected();
  }

  applyIssueFix(issue: DeterministicIssue): void {
    if (!issue.suggestedText) return;
    this.applySentenceRevision(issue.sentenceId, issue.suggestedText, `Applied: ${issue.title}`);
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
    if (this.state.selectedSentenceId) {
      this.generateRewritesForSelected();
    }
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
    if (this.state.selectedSentenceId) {
      this.generateRewritesForSelected();
    }
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
