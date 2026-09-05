import { describe, it, expect } from 'vitest';
import { parseDocument, reassembleDocument, splitIntoSentences, calculateDocumentStats } from '../src/core/engine/segmenter';

describe('Sentence & Document Segmenter', () => {
  it('correctly splits regular sentences', () => {
    const text = 'This is the first sentence. Here is the second sentence! Is this the third?';
    const sentences = splitIntoSentences(text, 0);

    expect(sentences).toHaveLength(3);
    expect(sentences[0].trimmedText).toBe('This is the first sentence.');
    expect(sentences[1].trimmedText).toBe('Here is the second sentence!');
    expect(sentences[2].trimmedText).toBe('Is this the third?');
  });

  it('avoids false sentence breaks on common abbreviations', () => {
    const text = 'Dr. Smith met with Mr. Jones at 5 p.m. to discuss e.g. the U.S. report. It went well.';
    const sentences = splitIntoSentences(text, 0);

    expect(sentences).toHaveLength(2);
    expect(sentences[0].trimmedText).toContain('Dr. Smith met with Mr. Jones');
    expect(sentences[1].trimmedText).toBe('It went well.');
  });

  it('preserves markdown headings as intact units', () => {
    const md = '# Chapter 1: The Beginning\n\nThis is the opening text.';
    const doc = parseDocument(md);
    const contentParagraphs = doc.paragraphs.filter((p) => !p.isBlank);

    expect(contentParagraphs).toHaveLength(2);
    expect(contentParagraphs[0].sentences).toHaveLength(1);
    expect(contentParagraphs[0].sentences[0].isHeading).toBe(true);
    expect(contentParagraphs[0].sentences[0].prefix).toBe('# ');
    expect(contentParagraphs[0].sentences[0].trimmedText).toBe('Chapter 1: The Beginning');
  });

  it('preserves code blocks without segmenting code lines into sentences', () => {
    const md = '# Code Example\n\n```typescript\nconst x = 10;\nconst y = 20.5;\n```\n\nNext paragraph.';
    const doc = parseDocument(md);

    const codePara = doc.paragraphs.find((p) => p.isCodeBlock);
    expect(codePara).toBeDefined();
    expect(codePara?.rawText).toContain('const x = 10;');
    expect(codePara?.sentences).toHaveLength(0);
  });

  it('roundtrip reassembly preserves document structure and paragraphs', () => {
    const md = '# Title\n\nFirst paragraph with sentence one. Sentence two.\n\n- List item 1\n- List item 2';
    const doc = parseDocument(md);
    const reassembled = reassembleDocument(doc);

    expect(reassembled).toContain('# Title');
    expect(reassembled).toContain('First paragraph with sentence one. Sentence two.');
    expect(reassembled).toContain('- List item 1');
  });

  it('calculates document metrics accurately', () => {
    const md = '# Test Header\n\nThis is a short five word sentence. Here is another sentence.';
    const doc = parseDocument(md);
    const stats = calculateDocumentStats(md, doc.paragraphs);

    expect(stats.sentenceCount).toBe(3); // Header + 2 sentences
    expect(stats.wordCount).toBe(14);
    expect(stats.readingTimeMinutes).toBe(1);
  });
});
