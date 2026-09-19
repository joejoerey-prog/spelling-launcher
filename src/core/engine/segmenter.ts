import { ParagraphNode, SentenceNode, DocumentModel, DocumentStats } from '../../types/document';
import { computeReadability } from '../utils/readability';

const COMMON_ABBREVIATIONS = new Set([
  'mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'sr.', 'jr.',
  'e.g.', 'i.e.', 'etc.', 'vs.', 'viz.', 'al.',
  'a.m.', 'p.m.',
  'jan.', 'feb.', 'mar.', 'apr.', 'jun.', 'jul.', 'aug.', 'sep.', 'sept.', 'oct.', 'nov.', 'dec.',
  'u.s.', 'u.k.', 'e.u.', 'inc.', 'ltd.', 'corp.', 'co.', 'no.', 'vol.', 'fig.'
]);

/**
 * Splits text into individual sentences while preserving markdown prefix and avoiding false breaks on abbreviations.
 */
export function splitIntoSentences(
  paragraphText: string,
  paragraphIndex: number,
  prefix: string = '',
  isHeading: boolean = false,
  isListItem: boolean = false,
  isBlockquote: boolean = false
): SentenceNode[] {
  const content = paragraphText.slice(prefix.length);
  if (!content.trim()) {
    return [];
  }

  // Headings are treated as single sentence units to preserve integrity
  if (isHeading) {
    return [
      {
        id: `p${paragraphIndex}-s0`,
        paragraphIndex,
        sentenceIndex: 0,
        text: content,
        trimmedText: content.trim(),
        startOffset: prefix.length,
        endOffset: paragraphText.length,
        isHeading: true,
        prefix,
      },
    ];
  }

  const sentences: SentenceNode[] = [];
  // Match potential sentence terminators (. ! ?) followed by whitespace or end-of-string
  const regex = /([.!?]+)(["'”’\)]*)(\s+|$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let sentenceIdx = 0;

  while ((match = regex.exec(content)) !== null) {
    const endMatchIndex = match.index + match[1].length + match[2].length;
    const candidate = content.slice(lastIndex, endMatchIndex);

    // Check if the trailing word is an abbreviation
    const lastWordMatch = candidate.match(/([a-zA-Z0-9.]+)\s*$/);
    const lastWord = lastWordMatch ? lastWordMatch[1].toLowerCase() : '';

    if (COMMON_ABBREVIATIONS.has(lastWord) && match[3] !== '') {
      // Continue matching past the abbreviation
      continue;
    }

    // Also check for decimal numbers like 3.14
    if (match[1] === '.' && /\d$/.test(candidate) && /^\d/.test(content.slice(regex.lastIndex))) {
      continue;
    }

    const trimmed = candidate.trim();
    if (trimmed.length > 0) {
      sentences.push({
        id: `p${paragraphIndex}-s${sentenceIdx}`,
        paragraphIndex,
        sentenceIndex: sentenceIdx,
        text: candidate,
        trimmedText: trimmed,
        startOffset: prefix.length + lastIndex,
        endOffset: prefix.length + endMatchIndex,
        isHeading,
        isListItem,
        isBlockquote,
        prefix: sentenceIdx === 0 ? prefix : '',
      });
      sentenceIdx++;
    }

    lastIndex = regex.lastIndex;
  }

  // Catch any remaining trailing text
  if (lastIndex < content.length) {
    const remainder = content.slice(lastIndex);
    const trimmed = remainder.trim();
    if (trimmed.length > 0) {
      sentences.push({
        id: `p${paragraphIndex}-s${sentenceIdx}`,
        paragraphIndex,
        sentenceIndex: sentenceIdx,
        text: remainder,
        trimmedText: trimmed,
        startOffset: prefix.length + lastIndex,
        endOffset: paragraphText.length,
        isHeading,
        isListItem,
        isBlockquote,
        prefix: sentenceIdx === 0 ? prefix : '',
      });
    }
  }

  return sentences;
}

/**
 * Parses raw text or markdown into a structured DocumentModel.
 */
export function parseDocument(rawContent: string, filePath: string | null = null, fileName: string = 'Untitled.md'): DocumentModel {
  const lines = rawContent.split(/\r?\n/);
  const paragraphs: ParagraphNode[] = [];
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  let currentParagraphLines: string[] = [];
  let paragraphIndex = 0;

  let searchOffset = 0;

  const flushParagraph = () => {
    if (currentParagraphLines.length === 0) return;
    const rawText = currentParagraphLines.join('\n');
    const firstLine = currentParagraphLines[0] || '';

    let prefix = '';
    let isHeading = false;
    let isListItem = false;
    let isBlockquote = false;

    if (/^#{1,6}\s+/.test(firstLine)) {
      const match = firstLine.match(/^(#{1,6}\s+)/);
      prefix = match ? match[1] : '';
      isHeading = true;
    } else if (/^(\s*[-*+]\s+|\s*\d+\.\s+)/.test(firstLine)) {
      const match = firstLine.match(/^(\s*[-*+]\s+|\s*\d+\.\s+)/);
      prefix = match ? match[1] : '';
      isListItem = true;
    } else if (/^>\s*/.test(firstLine)) {
      const match = firstLine.match(/^(>\s*)/);
      prefix = match ? match[1] : '';
      isBlockquote = true;
    }

    const sentences = splitIntoSentences(
      rawText,
      paragraphIndex,
      prefix,
      isHeading,
      isListItem,
      isBlockquote
    );

    const pStartIdx = rawContent.indexOf(rawText, searchOffset);
    const startOffset = pStartIdx >= 0 ? pStartIdx : searchOffset;
    const endOffset = startOffset + rawText.length;
    if (pStartIdx >= 0) {
      searchOffset = endOffset;
    }

    for (const s of sentences) {
      s.documentStartOffset = startOffset + s.startOffset;
      s.documentEndOffset = startOffset + s.endOffset;
    }

    paragraphs.push({
      id: `p${paragraphIndex}`,
      index: paragraphIndex,
      rawText,
      sentences,
      isCodeBlock: false,
      isBlank: rawText.trim().length === 0,
      startOffset,
      endOffset,
    });

    paragraphIndex++;
    currentParagraphLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        flushParagraph();
        inCodeBlock = true;
        codeBlockBuffer = [line];
      } else {
        codeBlockBuffer.push(line);
        inCodeBlock = false;
        const codeText = codeBlockBuffer.join('\n');
        const pStartIdx = rawContent.indexOf(codeText, searchOffset);
        const startOffset = pStartIdx >= 0 ? pStartIdx : searchOffset;
        const endOffset = startOffset + codeText.length;
        if (pStartIdx >= 0) {
          searchOffset = endOffset;
        }

        paragraphs.push({
          id: `p${paragraphIndex}`,
          index: paragraphIndex,
          rawText: codeText,
          sentences: [],
          isCodeBlock: true,
          isBlank: false,
          startOffset,
          endOffset,
        });
        paragraphIndex++;
        codeBlockBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      paragraphs.push({
        id: `p${paragraphIndex}`,
        index: paragraphIndex,
        rawText: '',
        sentences: [],
        isCodeBlock: false,
        isBlank: true,
        startOffset: searchOffset,
        endOffset: searchOffset,
      });
      paragraphIndex++;
    } else {
      currentParagraphLines.push(line);
    }
  }

  flushParagraph();

  return {
    filePath,
    fileName,
    rawContent,
    paragraphs,
    isDirty: false,
    lastSavedAt: null,
  };
}

/**
 * Reassembles raw document content from modified sentence nodes.
 */
export function reassembleDocument(document: DocumentModel): string {
  const renderedParagraphs = document.paragraphs.map((p) => {
    if (p.isCodeBlock || p.isBlank) {
      return p.rawText;
    }

    if (p.sentences.length === 0) {
      return p.rawText;
    }

    return p.sentences
      .map((s, idx) => {
        const prefix = idx === 0 && s.prefix ? s.prefix : '';
        const space = idx > 0 && !s.text.startsWith(' ') && !s.text.startsWith('\n') ? ' ' : '';
        return `${prefix}${space}${s.text.trim()}`;
      })
      .join('');
  });

  return renderedParagraphs.join('\n\n');
}

/**
 * Calculates document statistics (word count, sentence count, reading time, etc.)
 */
export function calculateDocumentStats(rawContent: string, paragraphs: ParagraphNode[]): DocumentStats {
  const characters = rawContent.length;
  const words = rawContent.trim() ? rawContent.trim().split(/\s+/).filter(Boolean).length : 0;

  let sentenceCount = 0;
  for (const p of paragraphs) {
    if (!p.isCodeBlock && !p.isBlank) {
      sentenceCount += p.sentences.length;
    }
  }

  const paragraphCount = paragraphs.filter((p) => !p.isBlank).length;
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 225));
  const avgSentenceLength = sentenceCount > 0 ? Math.round((words / sentenceCount) * 10) / 10 : 0;
  const readability = computeReadability(rawContent, words, sentenceCount);

  return {
    characterCount: characters,
    wordCount: words,
    sentenceCount,
    paragraphCount,
    readingTimeMinutes,
    averageSentenceLength: avgSentenceLength,
    readabilityScore: readability.score,
    readabilityGrade: readability.gradeLevel,
    readabilityLabel: readability.label,
  };
}
