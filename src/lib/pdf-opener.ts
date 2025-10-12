/**
 * PDF Opener - Shared utility for opening PDF files in the application
 * 
 * This module provides a centralized way to open PDF files, whether they are:
 * - Locally selected files
 * - Downloaded arXiv papers
 * - Referenced papers from within other PDFs
 */

import { extractPdfFromPathWithMeta } from './pdf';
import { generateFileId } from './utils';
import { cacheManager, type RecentFile } from './cache';
import { storageManager } from './storage';
import { getPaperById, type ArxivPaper } from './arxiv';
import { exists } from '@tauri-apps/plugin-fs';

export interface OpenPdfOptions {
  // Store functions (from useAppStore)
  addRecentFile: (file: RecentFile) => void;
  setCurrentPaper: (path: string | null) => void;
  setLastSelectedPdfPath: (path: string | null) => void;
  
  // Navigation function (from useNavigate)
  navigate: (path: string) => void;
  
  // Optional: preferred title to use instead of extracted metadata
  preferredTitle?: string;
  
  // Optional callbacks
  onStart?: () => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Open a PDF file by path
 * Extracts metadata, adds to recent files, and navigates to chat
 */
export async function openPdfByPath(
  filePath: string,
  options: OpenPdfOptions
): Promise<void> {
  const { addRecentFile, setCurrentPaper, setLastSelectedPdfPath, navigate, preferredTitle, onStart, onComplete, onError } = options;
  
  try {
    onStart?.();
    console.log('[PdfOpener] Opening PDF:', filePath);
    
    // Extract PDF metadata
    const result = await extractPdfFromPathWithMeta(filePath);
    const { title: extractedTitle, pageCount, fileSize } = result;
    
    // Use preferred title if provided, otherwise use extracted title, then fallback to filename
    const title = preferredTitle || extractedTitle || filePath.split('/').pop() || 'Untitled';
    
    // Create recent file entry
    const recentFile: RecentFile = {
      id: generateFileId(filePath),
      path: filePath,
      title,
      lastAccessed: Date.now(),
      addedDate: Date.now(),
      pageCount,
      fileSize
    };
    
    // Add to cache (persistent storage)
    await cacheManager.addRecentFile(filePath, recentFile.title, { pageCount, fileSize });
    
    // Add to store (in-memory)
    addRecentFile(recentFile);
    
    // Set current paper and path
    setCurrentPaper(filePath);
    setLastSelectedPdfPath(filePath);
    
    // Navigate to chat
    console.log('[PdfOpener] Successfully opened PDF, navigating to chat');
    navigate('/chat');
    
    onComplete?.();
  } catch (error: any) {
    console.error('[PdfOpener] Failed to open PDF:', error);
    onError?.(error);
    throw error;
  }
}

/**
 * Open an arXiv paper by ID
 * Downloads the paper if needed, then opens it
 */
export async function openArxivPaper(
  arxivId: string,
  options: OpenPdfOptions
): Promise<void> {
  const { onStart, onError } = options;
  
  try {
    onStart?.();
    console.log('[PdfOpener] Opening arXiv paper:', arxivId);
    
    // Initialize storage
    await storageManager.initialize();
    const storagePath = storageManager.getStoragePath();
    
    if (!storagePath) {
      throw new Error('Storage path not available');
    }
    
    // Fetch paper info from arXiv
    const paper = await getPaperById(arxivId);
    if (!paper) {
      throw new Error(`Paper ${arxivId} not found on arXiv`);
    }
    
    // Construct file path
    const sanitizedArxivId = arxivId.replace(/\//g, '_');
    const sanitizedTitle = paper.title
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 100)
      .replace(/^_+|_+$/g, '');
    const fileName = `${sanitizedArxivId}_${sanitizedTitle}.pdf`;
    const paperPath = `${storagePath}/${fileName}`;
    
    let finalPath = paperPath;
    
    // Download if not already exists
    if (!(await exists(paperPath))) {
      console.log('[PdfOpener] Downloading paper:', paper.title);
      finalPath = await storageManager.downloadArxivPaper(
        paper.id,
        paper.title,
        paper.pdfUrl
      );
    } else {
      console.log('[PdfOpener] Paper already exists:', paperPath);
    }
    
    // Open the PDF using the shared function
    // Pass the original paper title so it's not sanitized in the UI
    await openPdfByPath(finalPath, {
      ...options,
      preferredTitle: paper.title
    });
    
  } catch (error: any) {
    console.error('[PdfOpener] Failed to open arXiv paper:', error);
    onError?.(error);
    throw error;
  }
}

/**
 * Open an arXiv paper from paper object
 * Convenience wrapper when you already have the ArxivPaper object
 */
export async function openArxivPaperFromObject(
  paper: ArxivPaper,
  options: OpenPdfOptions
): Promise<void> {
  return openArxivPaper(paper.id, options);
}

