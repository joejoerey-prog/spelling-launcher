export interface SentenceNode {
  id: string;
  paragraphIndex: number;
  sentenceIndex: number;
  text: string;
  trimmedText: string;
  startOffset: number;
  endOffset: number;
  isHeading?: boolean;
  isListItem?: boolean;
  isBlockquote?: boolean;
  isCodeBlock?: boolean;
  prefix?: string; // e.g. "## " or "- "
}

export interface ParagraphNode {
  id: string;
  index: number;
  rawText: string;
  sentences: SentenceNode[];
  isCodeBlock?: boolean;
  isBlank?: boolean;
}

export interface DocumentModel {
  filePath: string | null;
  fileName: string;
  rawContent: string;
  paragraphs: ParagraphNode[];
  isDirty: boolean;
  lastSavedAt: Date | null;
}

export interface DocumentStats {
  characterCount: number;
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  readingTimeMinutes: number;
  averageSentenceLength: number;
}
