import { describe, it, expect, vi as vitest } from 'vitest';
import { extractTextFromDocumentFile, cleanExtractedText, readFileAsArrayBuffer } from '../src/core/engine/documentExtractor';
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

describe('readFileAsArrayBuffer', () => {
  it('uses native arrayBuffer method if available', async () => {
    const content = 'hello world';
    const blob = new Blob([content], { type: 'text/plain' });

    // Ensure arrayBuffer exists and spy on it (mocking to handle environments where it might be on the prototype)
    blob.arrayBuffer = vitest.fn().mockImplementation(async () => {
      return new TextEncoder().encode(content).buffer;
    });

    const arrayBuffer = await readFileAsArrayBuffer(blob);
    const text = new TextDecoder().decode(arrayBuffer);

    expect(blob.arrayBuffer).toHaveBeenCalled();
    expect(text).toBe(content);
  });

  it('uses FileReader fallback if arrayBuffer method is not available', async () => {
    const content = 'hello fallback';
    const blob = new Blob([content], { type: 'text/plain' });

    // Override arrayBuffer to simulate older browsers
    Object.defineProperty(blob, 'arrayBuffer', { value: undefined });

    const arrayBuffer = await readFileAsArrayBuffer(blob);
    const text = new TextDecoder().decode(arrayBuffer);
    expect(text).toBe(content);
  });

  it('rejects on FileReader error', async () => {
    const blob = new Blob(['error'], { type: 'text/plain' });
    Object.defineProperty(blob, 'arrayBuffer', { value: undefined });

    const originalFileReader = global.FileReader;

    // Mock FileReader to trigger onerror
    class MockFileReader {
      onload: any;
      onerror: any;
      error = new Error('Simulated FileReader error');
      readAsArrayBuffer() {
        if (this.onerror) {
          this.onerror();
        }
      }
    }

    global.FileReader = MockFileReader as any;

    await expect(readFileAsArrayBuffer(blob)).rejects.toThrow('Simulated FileReader error');

    // Restore original FileReader
    global.FileReader = originalFileReader;
  });
});
