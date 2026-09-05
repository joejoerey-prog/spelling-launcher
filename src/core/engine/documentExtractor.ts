import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import JSZip from 'jszip';
import { isTauri, parseDocumentViaRust } from '../bridge/tauriBridge';

// Configure pdfjs worker if available, otherwise runs on main thread
if (typeof window !== 'undefined' && (pdfjsLib as any).GlobalWorkerOptions) {
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = '';
}

export function readFileAsArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export function readFileAsText(file: File | Blob): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Extracts clean text from an Apple Pages (.pages) file.
 */
export async function extractTextFromPages(data: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(data);
    
    // 1. Primary approach: QuickLook Preview PDF (highest fidelity for Pages)
    const previewPdfFile = zip.file('QuickLook/Preview.pdf') || zip.file('preview.pdf');
    if (previewPdfFile) {
      const pdfBytes = await previewPdfFile.async('uint8array');
      return await extractTextFromPdf(pdfBytes);
    }

    // 2. Fallback: Check for index.xml in legacy Pages bundles
    const indexXml = zip.file('index.xml');
    if (indexXml) {
      const xmlStr = await indexXml.async('string');
      const stripped = xmlStr.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (stripped) return cleanExtractedText(stripped);
    }

    // 3. Fallback: Extract strings from Document.iwa with readable words
    const files = Object.keys(zip.files);
    const extractedChunks: string[] = [];
    for (const fileName of files) {
      if (fileName.endsWith('.iwa') || fileName.includes('Document')) {
        const fileData = await zip.file(fileName)?.async('uint8array');
        if (fileData) {
          const asciiStr = new TextDecoder('utf-8', { fatal: false }).decode(fileData);
          const matches = asciiStr.match(/[A-Z][A-Za-z0-9,.'";: -]{15,}/g);
          if (matches) {
            extractedChunks.push(...matches);
          }
        }
      }
    }

    if (extractedChunks.length > 0) {
      return cleanExtractedText(extractedChunks.join('\n\n'));
    }

    return 'Unable to extract text from Apple Pages file. Please export the document as PDF or Plain Text in Pages.';
  } catch (err: any) {
    throw new Error(`Failed to parse Apple Pages document: ${err.message || err}`);
  }
}

/**
 * Extracts clean text from a Microsoft Word (.docx) file.
 */
export async function extractTextFromDocx(data: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(data);
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) {
      throw new Error('Not a valid DOCX file: word/document.xml not found.');
    }

    const xmlStr = await docXmlFile.async('string');
    const paragraphMatches = xmlStr.split(/<\/w:p>/);
    const paragraphs: string[] = [];

    for (const p of paragraphMatches) {
      const textMatches = p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
      const paragraphText = textMatches
        .map((t) => t.replace(/<[^>]+>/g, ''))
        .join('');
      if (paragraphText.trim()) {
        paragraphs.push(paragraphText.trim());
      }
    }

    return cleanExtractedText(paragraphs.join('\n\n'));
  } catch (err: any) {
    throw new Error(`Failed to parse DOCX document: ${err.message || err}`);
  }
}

/**
 * Extracts clean text from a PDF file using pdfjs-dist.
 */
export async function extractTextFromPdf(data: Uint8Array): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    let lastY: number | null = null;
    let pageStr = '';

    for (const item of textContent.items) {
      if ('str' in item) {
        const str = (item as any).str || '';
        if (!str.trim() && !pageStr.endsWith(' ')) {
          pageStr += ' ';
          continue;
        }

        const transform = (item as any).transform;
        const currentY = Array.isArray(transform) ? transform[5] : null;

        if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
          if (Math.abs(currentY - lastY) > 16) {
            pageStr += '\n\n';
          } else {
            pageStr += '\n';
          }
        } else if (pageStr.length > 0 && !pageStr.endsWith(' ') && !pageStr.endsWith('\n')) {
          pageStr += ' ';
        }

        pageStr += str;
        if (currentY !== null) {
          lastY = currentY;
        }
      }
    }

    if (pageStr.trim()) {
      pageTexts.push(pageStr.trim());
    }
  }

  const fullText = pageTexts.join('\n\n');
  return cleanExtractedText(fullText);
}

/**
 * Main extractor: First attempts native macOS engine via Tauri, with browser fallback.
 */
export async function extractTextFromDocumentFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // Plain text / Markdown
  if (ext === 'txt' || ext === 'md' || ext === 'markdown') {
    return await readFileAsText(file);
  }

  const buffer = await readFileAsArrayBuffer(file);
  const uint8 = new Uint8Array(buffer);

  // 1. Try native macOS extraction via Tauri Rust layer if running in desktop app
  if (isTauri()) {
    try {
      const nativeText = await parseDocumentViaRust(file.name, uint8);
      if (nativeText && nativeText.trim().length > 0) {
        return cleanExtractedText(nativeText);
      }
    } catch {
      // Fallback to client-side parsers
    }
  }

  // 2. Client-side fallback parsers
  if (ext === 'pdf') {
    return await extractTextFromPdf(uint8);
  }

  if (ext === 'pages') {
    return await extractTextFromPages(buffer);
  }

  if (ext === 'docx') {
    return await extractTextFromDocx(buffer);
  }

  // Fallback: try as UTF-8 text
  try {
    const text = await readFileAsText(file);
    if (!text.startsWith('%PDF') && !text.startsWith('PK\x03\x04')) {
      return text;
    }
  } catch {
    // Ignore
  }

  throw new Error(`Unsupported document type .${ext}. Supported formats: .txt, .md, .pdf, .pages, .docx`);
}

/**
 * Cleans extracted text formatting, structures letterheads, isolates salutations,
 * and normalizes paragraph spacing.
 */
export function cleanExtractedText(raw: string): string {
  const normalized = raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Fix hyphenated word line breaks (e.g. "com- \n prehensive" -> "comprehensive")
    .replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2')
    // Break paragraphs before numbered sections e.g. " 1. ", " 2.1 "
    .replace(/(\s+)([0-9]{1,2}(\.[0-9]+)*\.\s+[A-Z])/g, '\n\n$2')
    // Break before common document headers
    .replace(/ (Author:|Date:|Platform:|Hardware Profile:|The Issue:|The Fix:|Outcome:|Root Cause:)/g, '\n\n$1');

  // Split lines to detect and format letterhead & salutations
  const rawLines = normalized.split('\n').map((l) => l.trim()).filter(Boolean);
  const formattedBlocks: string[] = [];
  let inLetterhead = true;

  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i];

    // Check if line is a standalone salutation (e.g. "Dearest Bella,", "Dear John,")
    const isSalutation = /^(?:Dearest|Dear|Hi|Hello|To Whom It May Concern)\s+[A-Z][a-zA-Z0-9\s'.-]{0,35},?$/i.test(line);
    // Check if line contains a salutation followed by sentence text on the same line
    const salutationMatch = line.match(/^((?:Dearest|Dear|Hi|Hello|To Whom It May Concern)\s+[A-Z][a-zA-Z0-9\s'.-]{0,35},?)\s+(.*)$/i);

    if (salutationMatch) {
      formattedBlocks.push(salutationMatch[1]);
      formattedBlocks.push(salutationMatch[2]);
      inLetterhead = false;
      i++;
      continue;
    }

    if (isSalutation) {
      formattedBlocks.push(line);
      inLetterhead = false;
      i++;
      continue;
    }

    // Letterhead header items (name, address, postcode, phone, email, date) before the salutation
    if (inLetterhead && i < 15) {
      // Merge standalone house number (e.g. "2" + "The Paddock")
      if (/^\d{1,4}[a-zA-Z]?$/.test(line) && i + 1 < rawLines.length) {
        formattedBlocks.push(`${line} ${rawLines[i + 1]}`);
        i += 2;
        continue;
      }

      formattedBlocks.push(line);
      i++;
      continue;
    }

    // Sign-offs at the end of a letter (e.g. "Love you xxx", "Dad", "Yours sincerely,")
    if (/^(?:Yours sincerely|Yours faithfully|Warm regards|Kind regards|Best regards|With love|Lots of love|Warmly|Love you|Love)[,\s]/i.test(line)) {
      formattedBlocks.push(line);
      i++;
      continue;
    }

    // Normal body paragraphs: re-wrap wrapped lines within the same paragraph
    if (formattedBlocks.length > 0 && !inLetterhead) {
      const lastBlock = formattedBlocks[formattedBlocks.length - 1];
      const lastIsSal = /^(?:Dearest|Dear|Hi|Hello|To Whom It May Concern)/i.test(lastBlock);
      const endsWithSentencePunct = /[.!?]["'”’]?$/.test(lastBlock);

      if (!lastIsSal && !endsWithSentencePunct) {
        formattedBlocks[formattedBlocks.length - 1] = `${lastBlock} ${line}`;
        i++;
        continue;
      }
    }

    formattedBlocks.push(line);
    i++;
  }

  return formattedBlocks
    .map((block) => block.replace(/[ \t]{2,}/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}
