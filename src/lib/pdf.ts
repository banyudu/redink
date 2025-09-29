import { readFile } from '@tauri-apps/plugin-fs';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
// Bundle the worker locally via Vite ?url to avoid remote CDN/CORS issues
// Vite will transform this into an asset URL served by the dev server or included in the build
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Vite will provide the string URL at build time
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl as unknown as string;

async function extractPageText(pdf: PDFDocumentProxy, pageNumber: number): Promise<string> {
  const page = await pdf.getPage(pageNumber);
  const textContent = await page.getTextContent();
  const items = textContent.items as Array<{ str: string }>;
  const text = items.map((it) => it.str).join(' ');
  return text;
}

export async function extractPdfTextFromPath(filePath: string): Promise<string> {
  const data = await readFile(filePath);
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;

  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const pageText = await extractPageText(pdf, i);
    pageTexts.push(pageText);
  }

  const fullText = pageTexts
    .join('\n\n')
    .replace(/\s+/g, ' ')
    .trim();
  return fullText;
}

// PDF metadata info interface
interface PDFInfo {
  Title?: string;
  Author?: string;
  Subject?: string;
  Creator?: string;
  Producer?: string;
  CreationDate?: string;
  ModDate?: string;
  Keywords?: string;
}

export type ExtractResult = {
  text: string;
  charCount: number;
  pageCount: number;
  title?: string;
  author?: string;
  subject?: string;
  fileSize: number;
  creationDate?: Date;
  modificationDate?: Date;
};

// Extract title from PDF content (first meaningful line)
function extractTitleFromText(text: string): string | undefined {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  for (const line of lines.slice(0, 10)) { // Check first 10 non-empty lines
    // Skip lines that look like headers, footers, or page numbers
    if (line.length < 10 || line.length > 200) continue;
    if (/^\d+$/.test(line)) continue; // Skip page numbers
    if (/^(abstract|introduction|conclusion|references|bibliography)$/i.test(line)) continue;
    if (line.toLowerCase().includes('arxiv:') || line.toLowerCase().includes('doi:')) continue;
    
    // Look for title-like content
    if (line.length > 20 && line.length < 150) {
      // Remove common prefixes
      let title = line.replace(/^(title:\s*|abstract:\s*)/i, '').trim();
      
      // Capitalize first letter if it's not already
      if (title.length > 0) {
        title = title.charAt(0).toUpperCase() + title.slice(1);
        return title;
      }
    }
  }
  
  return undefined;
}

export async function extractPdfFromPathWithMeta(filePath: string): Promise<ExtractResult> {
  const data = await readFile(filePath);
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;

  // Extract metadata
  const metadata = await pdf.getMetadata().catch(() => null);
  const info = metadata?.info as PDFInfo | undefined;
  
  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const pageText = await extractPageText(pdf, i);
    pageTexts.push(pageText);
  }
  const text = pageTexts.join('\n\n').replace(/\s+/g, ' ').trim();
  
  // Extract title from metadata or content
  let title = info?.Title || extractTitleFromText(text);
  
  // Clean up title
  if (title) {
    title = title.replace(/[\r\n]+/g, ' ').trim();
    if (title.length > 100) {
      title = title.substring(0, 100) + '...';
    }
  }
  
  return { 
    text, 
    charCount: text.length, 
    pageCount: pdf.numPages,
    title,
    author: info?.Author,
    subject: info?.Subject,
    fileSize: data.byteLength,
    creationDate: info?.CreationDate ? new Date(info.CreationDate) : undefined,
    modificationDate: info?.ModDate ? new Date(info.ModDate) : undefined
  };
}


