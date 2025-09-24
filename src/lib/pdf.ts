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

export type ExtractResult = {
  text: string;
  charCount: number;
  pageCount: number;
};

export async function extractPdfFromPathWithMeta(filePath: string): Promise<ExtractResult> {
  const data = await readFile(filePath);
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;

  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const pageText = await extractPageText(pdf, i);
    pageTexts.push(pageText);
  }
  const text = pageTexts.join('\n\n').replace(/\s+/g, ' ').trim();
  return { text, charCount: text.length, pageCount: pdf.numPages };
}


