import { describe, it, expect } from 'vitest';
import { extractTextFromDocumentFile, cleanExtractedText, extractTextFromDocx } from '../src/core/engine/documentExtractor';
import JSZip from 'jszip';

describe('Document Extractor', () => {
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

  it('throws an error if DOCX is missing word/document.xml', async () => {
    const zip = new JSZip();
    zip.file('dummy.txt', 'This is not a valid DOCX file.');
    const arrayBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    await expect(extractTextFromDocx(arrayBuffer)).rejects.toThrow('Failed to parse DOCX document: Not a valid DOCX file: word/document.xml not found.');
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
