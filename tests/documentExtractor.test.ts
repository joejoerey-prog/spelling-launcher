import { describe, it, expect } from 'vitest';
import { extractTextFromDocumentFile, cleanExtractedText, readFileAsText } from '../src/core/engine/documentExtractor';
import JSZip from 'jszip';

describe('Document Extractor', () => {
  describe('readFileAsText', () => {
    it('should use file.text() when available', async () => {
      const file = new File(['hello world'], 'test.txt', { type: 'text/plain' });
      const result = await readFileAsText(file);
      expect(result).toBe('hello world');
    });

    it('should fallback to FileReader when file.text() is not available', async () => {
      const file = new File(['fallback text'], 'test.txt', { type: 'text/plain' });
      // Remove or undefined the text method to force FileReader fallback
      Object.defineProperty(file, 'text', { value: undefined });

      const result = await readFileAsText(file);
      expect(result).toBe('fallback text');
    });
  });

  it('reads plain text files directly', async () => {
    const textContent = 'This is a test paragraph.\n\nHere is a second sentence.';
    const file = new File([textContent], 'sample.txt', { type: 'text/plain' });
    const extracted = await extractTextFromDocumentFile(file);
    expect(extracted).toBe(textContent);
  });

  it('reads markdown files preserving markdown elements', async () => {
    const mdContent = '# Heading\n\n- Bullet 1\n- Bullet 2';
    const file = new File([mdContent], 'notes.md', { type: 'text/markdown' });
    const extracted = await extractTextFromDocumentFile(file);
    expect(extracted).toBe(mdContent);
  });

  it('extracts paragraphs from a DOCX zip archive', async () => {
    const zip = new JSZip();
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>First paragraph from Word.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Second paragraph with important details.</w:t></w:r></w:p>
  </w:body>
</w:document>`;
    zip.file('word/document.xml', docXml);
    const blob = await zip.generateAsync({ type: 'blob' });
    const file = new File([blob], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    const extracted = await extractTextFromDocumentFile(file);
    expect(extracted).toContain('First paragraph from Word.');
    expect(extracted).toContain('Second paragraph with important details.');
  });

  it('formats letterhead addresses, dates, and salutations from multiline PDF output', () => {
    const rawPdf = `Joe Rey
2
The Paddock
Cambourne
Cambridgeshire
CB23 5EH
United Kingdom
07766 257146
joerey1968@icloud.com
26 March 2026
Dearest Bella,
I am writing to you to say that you have been an inspiration and how proud I
am of you and the amazing young lady that you have become.`;

    const cleaned = cleanExtractedText(rawPdf);
    expect(cleaned).toContain('Joe Rey');
    expect(cleaned).toContain('2 The Paddock');
    expect(cleaned).toContain('CB23 5EH');
    expect(cleaned).toContain('United Kingdom');
    expect(cleaned).toContain('07766 257146');
    expect(cleaned).toContain('joerey1968@icloud.com');
    expect(cleaned).toContain('26 March 2026');
    expect(cleaned).toContain('Dearest Bella,\n\nI am writing to you to say');
  });
});
