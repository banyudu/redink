import React, { useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2,
  FileText,
  Loader2,
  BookOpen
} from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { readFile } from '@tauri-apps/plugin-fs';
import { useAppStore } from '@/store';
import { useNavigate } from 'react-router-dom';
import { openArxivPaper } from '@/lib/pdf-opener';
import { Command } from '@tauri-apps/plugin-shell';

// Configure PDF.js worker
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Use the same worker setup as in pdf.ts
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { whisper } from '@/lib/utils';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl as unknown as string;

interface PDFViewerProps {
  filePath: string;
  className?: string;
}

/**
 * Extract arXiv ID from various formats:
 * - URL: https://arxiv.org/abs/2506.17113
 * - URL: https://arxiv.org/pdf/2506.17113.pdf
 * - Text: arXiv:2506.17113
 * - Text with version: arXiv:2506.17113v1
 * - Old format: arXiv:physics/0110044
 */
function extractArxivId(text: string): string | null {
  // Match arxiv.org URLs
  const urlMatch = text.match(/arxiv\.org\/(?:abs|pdf)\/([a-zA-Z-]+\/\d+|\d+\.\d+)(?:v\d+)?(?:\.pdf)?/i);
  if (urlMatch) {
    return urlMatch[1];
  }
  
  // Match arXiv:ID format in text
  const textMatch = text.match(/arxiv:\s*([a-zA-Z-]+\/\d+|\d+\.\d+)(?:v\d+)?/i);
  if (textMatch) {
    return textMatch[1];
  }
  
  return null;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ filePath, className = '' }) => {
  const navigate = useNavigate();
  const { pdfViewerScale, setPdfViewerScale, setReadingProgress, getReadingProgress, addRecentFile, setCurrentPaper, setLastSelectedPdfPath } = useAppStore();
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(pdfViewerScale);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileData, setFileData] = useState<Blob | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingArxiv, setDownloadingArxiv] = useState(false);
  
  // Detect if we're on macOS
  const isMacOS = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  // Use refs to throttle zoom updates and prevent flickering
  const pendingScaleRef = React.useRef<number | null>(null);
  const rafIdRef = React.useRef<number | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const saveProgressTimeoutRef = React.useRef<number | null>(null);
  const hasRestoredProgressRef = React.useRef(false);
  
  // Handle arXiv paper click
  const handleArxivPaperClick = useCallback(async (arxivId: string) => {
    if (downloadingArxiv) {
      console.log('[PDFViewer] Already downloading a paper, ignoring click');
      return;
    }

    try {
      await openArxivPaper(arxivId, {
        addRecentFile,
        setCurrentPaper,
        setLastSelectedPdfPath,
        navigate,
        onStart: () => setDownloadingArxiv(true),
        onComplete: () => setDownloadingArxiv(false),
        onError: (error) => {
          setDownloadingArxiv(false);
          alert(`Failed to open paper: ${error.message ?? 'Unknown error'}`);
        }
      });
    } catch (error) {
      // Error already handled in onError callback
    }
  }, [downloadingArxiv, navigate, addRecentFile, setCurrentPaper, setLastSelectedPdfPath]);
  
  // Persist scale changes to store
  useEffect(() => {
    setPdfViewerScale(scale);
  }, [scale, setPdfViewerScale]);

  // Save reading progress (debounced)
  const saveProgress = useCallback((scrollTop: number, scrollLeft: number, page: number) => {
    if (!filePath) return;
    
    // Clear existing timeout
    if (saveProgressTimeoutRef.current) {
      clearTimeout(saveProgressTimeoutRef.current);
    }
    
    // Debounce saving to avoid too frequent updates
    saveProgressTimeoutRef.current = window.setTimeout(() => {
      setReadingProgress(filePath, {
        scrollTop,
        scrollLeft,
        currentPage: page,
        lastUpdated: Date.now(),
      });
      console.log('[PDFViewer] Saved reading progress:', { scrollTop, scrollLeft, page });
    }, 500);
  }, [filePath, setReadingProgress]);

  // Detect current visible page based on scroll position
  const detectCurrentPage = useCallback((container: HTMLDivElement) => {
    const pages = container.querySelectorAll('[data-page-number]');
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;
    
    let closestPage = 1;
    let closestDistance = Infinity;
    
    pages.forEach((pageElement) => {
      const pageRect = pageElement.getBoundingClientRect();
      const pageCenter = pageRect.top + pageRect.height / 2;
      const distance = Math.abs(pageCenter - containerCenter);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        const pageNum = parseInt(pageElement.getAttribute('data-page-number') || '1', 10);
        closestPage = pageNum;
      }
    });
    
    return closestPage;
  }, []);

  // Handle scroll events
  const handleScroll = useCallback((e: Event) => {
    const container = e.target as HTMLDivElement;
    if (!container) return;
    
    const scrollTop = container.scrollTop;
    const scrollLeft = container.scrollLeft;
    const page = detectCurrentPage(container);
    
    setCurrentPage(page);
    saveProgress(scrollTop, scrollLeft, page);
  }, [detectCurrentPage, saveProgress]);

  // Restore reading progress after PDF is loaded
  useEffect(() => {
    if (!scrollContainerRef.current || !filePath || totalPages === 0 || hasRestoredProgressRef.current) {
      return;
    }
    
    const savedProgress = getReadingProgress(filePath);
    if (savedProgress) {
      // Wait for all pages to render before restoring scroll
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = savedProgress.scrollTop;
          scrollContainerRef.current.scrollLeft = savedProgress.scrollLeft;
          setCurrentPage(savedProgress.currentPage);
          hasRestoredProgressRef.current = true;
          console.log('[PDFViewer] Restored reading progress:', savedProgress);
        }
      }, 100);
    } else {
      hasRestoredProgressRef.current = true;
    }
  }, [filePath, totalPages, getReadingProgress]);

  // Reset hasRestored flag when file changes
  useEffect(() => {
    hasRestoredProgressRef.current = false;
  }, [filePath]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (saveProgressTimeoutRef.current) {
        clearTimeout(saveProgressTimeoutRef.current);
      }
    };
  }, []);
  
  // Handle PDF link clicks and make arXiv references clickable
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    
    // Handle clicks on annotation layer links (actual PDF links)
    const handleAnnotationClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if clicked element is a link in the annotation layer
      const link = target.closest('a') as HTMLAnchorElement;
      if (link && link.href) {
        e.preventDefault();
        e.stopPropagation();
        
        const arxivId = extractArxivId(link.href);
        if (arxivId) {
          console.log('[PDFViewer] Clicked arXiv link:', arxivId);
          handleArxivPaperClick(arxivId);
        } else {
          console.log('[PDFViewer] Blocked non-arXiv link:', link.href);
        }
      }
    };
    
    // Handle clicks on text layer to detect arXiv references
    const handleTextLayerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if clicked on a span within text content
      if (target.tagName === 'SPAN' && target.closest('.react-pdf__Page__textContent')) {
        // Try to get arXiv ID from the span itself
        let text = target.textContent || '';
        let arxivId = extractArxivId(text);
        
        // If not found, try combining with adjacent siblings (text might be split across spans)
        if (!arxivId) {
          const prevSibling = target.previousElementSibling;
          const nextSibling = target.nextElementSibling;
          
          // Try combining with previous span
          if (prevSibling) {
            const combinedText = (prevSibling.textContent || '') + text;
            arxivId = extractArxivId(combinedText);
          }
          
          // Try combining with next span
          if (!arxivId && nextSibling) {
            const combinedText = text + (nextSibling.textContent || '');
            arxivId = extractArxivId(combinedText);
          }
          
          // Try combining with both
          if (!arxivId && prevSibling && nextSibling) {
            const combinedText = (prevSibling.textContent || '') + text + (nextSibling.textContent || '');
            arxivId = extractArxivId(combinedText);
          }
        }
        
        if (arxivId) {
          console.log('[PDFViewer] Clicked arXiv reference in text:', arxivId);
          handleArxivPaperClick(arxivId);
        }
      }
    };
    
    // Style links and arXiv references in PDF
    const styleArxivReferences = () => {
      // Style annotation layer links (actual PDF links)
      const allLinks = container.querySelectorAll('a');
      allLinks.forEach((link) => {
        const href = (link as HTMLAnchorElement).href;
        const arxivId = extractArxivId(href);
        
        if (arxivId) {
          // This is an arXiv link - style it prominently
          link.classList.add('arxiv-link');
          (link as HTMLElement).style.color = '#2563eb'; // blue-600
          (link as HTMLElement).style.textDecoration = 'underline';
          (link as HTMLElement).style.cursor = 'pointer';
          (link as HTMLElement).title = 'Click to open this arXiv paper';
          console.log('[PDFViewer] Styled arXiv link:', arxivId);
        } else {
          // Non-arXiv link - remove link styling
          link.classList.add('non-arxiv-link');
          (link as HTMLElement).style.color = 'inherit';
          (link as HTMLElement).style.textDecoration = 'none';
          (link as HTMLElement).style.cursor = 'default';
          (link as HTMLElement).title = 'External links are disabled';
          console.log('[PDFViewer] Removed styling from non-arXiv link:', href);
        }
      });
      
      // Style text spans that contain arXiv references
      const textSpans = container.querySelectorAll('.react-pdf__Page__textContent span');
      const styledSpans = new Set<HTMLElement>();
      
      textSpans.forEach((span) => {
        if (styledSpans.has(span as HTMLElement)) return;
        
        const text = span.textContent || '';
        let hasArxiv = extractArxivId(text);
        
        // Check adjacent spans (arXiv ID might be split)
        const nextSibling = span.nextElementSibling;
        if (!hasArxiv && nextSibling) {
          const combinedText = text + (nextSibling.textContent || '');
          hasArxiv = extractArxivId(combinedText);
          
          if (hasArxiv) {
            // Style both spans
            (span as HTMLElement).classList.add('arxiv-text-ref');
            (span as HTMLElement).style.cursor = 'pointer';
            (span as HTMLElement).style.textDecoration = 'underline';
            (span as HTMLElement).style.color = '#2563eb !important'; // blue-600
            (span as HTMLElement).title = 'Click to open this arXiv paper';
            (nextSibling as HTMLElement).classList.add('arxiv-text-ref');
            (nextSibling as HTMLElement).style.cursor = 'pointer';
            (nextSibling as HTMLElement).style.textDecoration = 'underline';
            (nextSibling as HTMLElement).style.color = '#2563eb !important'; // blue-600
            (nextSibling as HTMLElement).title = 'Click to open this arXiv paper';
            styledSpans.add(span as HTMLElement);
            styledSpans.add(nextSibling as HTMLElement);
            console.log('[PDFViewer] Styled arXiv text reference:', combinedText.substring(0, 50));
          }
        }
        
        // Style single span if it contains arXiv reference
        if (hasArxiv && !styledSpans.has(span as HTMLElement)) {
          (span as HTMLElement).classList.add('arxiv-text-ref');
          (span as HTMLElement).style.cursor = 'pointer';
          (span as HTMLElement).style.textDecoration = 'underline';
          (span as HTMLElement).style.color = '#2563eb !important'; // blue-600
          (span as HTMLElement).title = 'Click to open this arXiv paper';
          styledSpans.add(span as HTMLElement);
          console.log('[PDFViewer] Styled arXiv text reference:', text.substring(0, 50));
        }
      });
    };
    
    // Apply styling multiple times to catch all elements as they render
    const styleTimeout1 = setTimeout(styleArxivReferences, 300);
    const styleTimeout2 = setTimeout(styleArxivReferences, 800);
    const styleTimeout3 = setTimeout(styleArxivReferences, 1500);
    
    // Use MutationObserver to detect when new pages are rendered and re-apply styling
    const observer = new MutationObserver((mutations) => {
      let shouldRestyle = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any added node contains text layer or annotation layer
          const hasRelevantLayer = Array.from(mutation.addedNodes).some((node) => {
            if (node instanceof Element) {
              return node.classList.contains('react-pdf__Page__textContent') || 
                     node.querySelector('.react-pdf__Page__textContent') ||
                     node.classList.contains('react-pdf__Page__annotations') ||
                     node.querySelector('.react-pdf__Page__annotations') ||
                     node.tagName === 'A';
            }
            return false;
          });
          
          if (hasRelevantLayer) {
            shouldRestyle = true;
          }
        }
      }
      
      if (shouldRestyle) {
        // Delay styling to ensure layers are fully rendered
        setTimeout(styleArxivReferences, 200);
      }
    });
    
    observer.observe(container, {
      childList: true,
      subtree: true
    });
    
    container.addEventListener('click', handleAnnotationClick, true);
    container.addEventListener('click', handleTextLayerClick);
    
    return () => {
      container.removeEventListener('click', handleAnnotationClick, true);
      container.removeEventListener('click', handleTextLayerClick);
      clearTimeout(styleTimeout1);
      clearTimeout(styleTimeout2);
      clearTimeout(styleTimeout3);
      observer.disconnect();
    };
  }, [scrollContainerRef.current, handleArxivPaperClick, totalPages]);
  
  const pdfContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      // Use native event listener with passive: false to prevent default zoom
      const handleWheelNative = (e: WheelEvent) => {
        // Check for zoom gestures: Ctrl/Cmd+wheel OR trackpad pinch (ctrlKey is set on macOS for pinch)
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation(); // Prevent other handlers from firing
          
          // Calculate delta - for pinch gestures, deltaY will be larger
          const delta = -e.deltaY / 1000;
          
          // Accumulate scale changes and apply them in the next animation frame
          // This prevents multiple re-renders during rapid wheel events
          if (pendingScaleRef.current === null) {
            pendingScaleRef.current = scale;
          }
          
          pendingScaleRef.current = Math.max(0.5, Math.min(pendingScaleRef.current + delta, 3.0));
          
          // Cancel previous animation frame if it exists
          if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
          }
          
          // Schedule update for next animation frame
          // This batches all zoom updates from rapid gestures into a single re-render
          rafIdRef.current = requestAnimationFrame(() => {
            if (pendingScaleRef.current !== null) {
              setScale(pendingScaleRef.current);
              pendingScaleRef.current = null;
            }
            rafIdRef.current = null;
          });
        }
      };
      
      // Also handle gesturestart/gesturechange/gestureend for Safari/WebKit
      const handleGestureStart = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
      };
      
      const handleGestureChange = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        
        const gestureEvent = e as any; // WebKit GestureEvent
        if (gestureEvent.scale) {
          if (pendingScaleRef.current === null) {
            pendingScaleRef.current = scale;
          }
          
          pendingScaleRef.current = Math.max(0.5, Math.min(scale * gestureEvent.scale, 3.0));
          
          if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
          }
          
          rafIdRef.current = requestAnimationFrame(() => {
            if (pendingScaleRef.current !== null) {
              setScale(pendingScaleRef.current);
              pendingScaleRef.current = null;
            }
            rafIdRef.current = null;
          });
        }
      };
      
      node.addEventListener('wheel', handleWheelNative, { passive: false });
      node.addEventListener('gesturestart', handleGestureStart, { passive: false });
      node.addEventListener('gesturechange', handleGestureChange, { passive: false });
      
      return () => {
        node.removeEventListener('wheel', handleWheelNative);
        node.removeEventListener('gesturestart', handleGestureStart);
        node.removeEventListener('gesturechange', handleGestureChange);
        // Clean up pending animation frame on unmount
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
        }
      };
    }
  }, [scale]);

  // Load file data when filePath changes
  useEffect(() => {
    if (!filePath) {
      setFileData(null);
      return;
    }

    let cancelled = false;

    const loadFile = async () => {
      try {
        whisper(`[PDFViewer] Reading file from path: ${filePath}`);
        console.log('[PDFViewer] Starting file read:', filePath);
        setLoading(true);
        setError(null);
        
        const data = await readFile(filePath);
        console.log('[PDFViewer] File read complete:', {
          byteLength: data.byteLength,
          constructor: data.constructor.name,
          isUint8Array: data instanceof Uint8Array,
          hasBuffer: !!data.buffer,
          bufferByteLength: data.buffer?.byteLength
        });
        
        if (!cancelled) {
          whisper(`[PDFViewer] File read successfully, size: ${data.byteLength} bytes`);
          
          // Convert to Blob to prevent ArrayBuffer detachment issues
          // Blobs are immutable and safe to pass between threads and store in React state
          console.log('[PDFViewer] Creating Blob from data...');
          
          // Create a standard ArrayBuffer and copy the data
          const buffer = new ArrayBuffer(data.byteLength);
          const view = new Uint8Array(buffer);
          view.set(data);
          
          // Create Blob from the standard ArrayBuffer
          const blob = new Blob([buffer], { type: 'application/pdf' });
          
          console.log('[PDFViewer] Blob created:', {
            size: blob.size,
            type: blob.type,
            constructor: blob.constructor.name
          });
          
          setFileData(blob);
          console.log('[PDFViewer] File data (Blob) set in state');
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[PDFViewer] Error reading PDF file:', err);
          setError(`Failed to read file: ${err?.message ?? 'Unknown error'}`);
          setLoading(false);
        }
      }
    };

    loadFile();

    return () => {
      cancelled = true;
    };
  }, [filePath]);

  // Debug: Log when fileData changes
  useEffect(() => {
    console.log('[PDFViewer] fileData changed:', fileData ? {
      size: fileData.size,
      type: fileData.type,
      isBlob: fileData instanceof Blob,
      constructor: fileData.constructor.name
    } : 'null');
  }, [fileData]);

  // Document loading handlers
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('[PDFViewer] Document loaded successfully, pages:', numPages);
    whisper(`[PDFViewer] Document loaded successfully with ${numPages} pages`);
    setTotalPages(numPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: any) => {
    console.error('[PDFViewer] Error loading PDF document:', error);
    console.error('[PDFViewer] Error details:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack
    });
    setError(`Failed to load PDF: ${error?.message ?? 'Unknown error'}`);
    setLoading(false);
  }, []);

  const onDocumentLoadStart = useCallback(() => {
    console.log('[PDFViewer] Document loading started');
    whisper(`[PDFViewer] Document loading started`);
    setLoading(true);
    setError(null);
  }, []);

  // Zoom handlers
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1.0);
  }, []);

  // Rotation handler
  const rotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  // Fit to container width - simplified for react-pdf
  const fitToWidth = useCallback(() => {
    // With react-pdf, we can use a more standard approach
    // Standard PDF page width is roughly 612 points, container has padding
    const estimatedContainerWidth = 800; // Rough estimation
    const estimatedPageWidth = 612;
    const newScale = estimatedContainerWidth / estimatedPageWidth;
    setScale(Math.max(0.5, Math.min(newScale, 3.0)));
  }, []);

  // Open PDF in iBooks (macOS only)
  const openInIBooks = useCallback(async () => {
    if (!filePath || !isMacOS) return;
    
    try {
      console.log('[PDFViewer] Opening PDF in iBooks:', filePath);
      
      // Use AppleScript to open the file in Books.app
      // This is more reliable than the 'open' command for Books
      const script = `tell application "Books"
        activate
        open POSIX file "${filePath}"
      end tell`;
      
      const command = Command.create('osascript', ['-e', script]);
      const output = await command.execute();
      
      if (output.code !== 0) {
        console.error('[PDFViewer] Failed to open in iBooks:', output.stderr);
        alert(`Failed to open in iBooks: ${output.stderr || 'Unknown error'}`);
      } else {
        console.log('[PDFViewer] Successfully opened in iBooks');
      }
    } catch (error: any) {
      console.error('[PDFViewer] Error opening in iBooks:', error);
      alert(`Failed to open in iBooks: ${error?.message ?? 'Unknown error'}`);
    }
  }, [filePath, isMacOS]);


  // Handle case when no file path is provided
  if (!filePath) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <div className="glass rounded-lg p-8 border border-white/20 backdrop-blur-xl text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No PDF Loaded</h3>
          <p className="text-gray-600 dark:text-gray-300">Select a document to view</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full glass rounded-lg border border-white/20 backdrop-blur-xl relative ${className}`} style={{ minHeight: '400px' }}>
      {/* Loading Overlay - Fixed dimensions to prevent layout shift */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg">
          <div className="glass rounded-lg p-8 border border-white/20 backdrop-blur-xl text-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Loading PDF</h3>
            <p className="text-gray-600 dark:text-gray-300">Processing your document...</p>
          </div>
        </div>
      )}

      {/* Downloading ArXiv Paper Overlay - Fixed dimensions to prevent layout shift */}
      {downloadingArxiv && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg">
          <div className="glass rounded-lg p-8 border border-white/20 backdrop-blur-xl text-center">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Opening ArXiv Paper</h3>
            <p className="text-gray-600 dark:text-gray-300">Downloading and opening the referenced paper...</p>
          </div>
        </div>
      )}

      {/* Error Overlay - Fixed dimensions to prevent layout shift */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg">
          <div className="glass rounded-lg p-8 border border-white/20 backdrop-blur-xl text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading PDF</h3>
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Toolbar - Fixed height to prevent layout shift */}
      <div className="flex items-center justify-between p-4 border-b border-white/20 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-t-2xl flex-shrink-0" style={{ minHeight: '64px' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium text-gray-900 dark:text-white text-sm" style={{ minWidth: '120px' }}>
            PDF Viewer {totalPages > 0 && `(Page ${currentPage} of ${totalPages})`}
          </span>
        </div>

        <TooltipProvider>
          <div className="flex items-center gap-1">
            {/* Zoom Controls */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={zoomOut}
                  disabled={scale <= 0.5}
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom Out (Ctrl/Cmd + Scroll)</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={resetZoom}
                  className="h-8 px-2 text-xs"
                >
                  {Math.round(scale * 100)}%
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset Zoom to 100%</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={zoomIn}
                  disabled={scale >= 3.0}
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom In (Ctrl/Cmd + Scroll)</p>
              </TooltipContent>
            </Tooltip>

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2" />

            {/* Additional Controls */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={rotate}
                  className="h-8 w-8 p-0"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Rotate 90° Clockwise</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={fitToWidth}
                  className="h-8 w-8 p-0"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Fit to Width</p>
              </TooltipContent>
            </Tooltip>

            {/* Open in iBooks (macOS only) */}
            {isMacOS && (
              <>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2" />
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={openInIBooks}
                      className="h-8 w-8 p-0"
                    >
                      <BookOpen className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Open in Books</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* PDF Content - Fixed layout to prevent shifts */}
      <div 
        ref={(node) => {
          pdfContainerRef(node);
          scrollContainerRef.current = node;
          
          // Attach scroll event listener
          if (node) {
            node.addEventListener('scroll', handleScroll, { passive: true });
            return () => {
              node.removeEventListener('scroll', handleScroll);
            };
          }
        }}
        className="flex-1 overflow-auto p-2 bg-gray-50 dark:bg-gray-900/50 custom-scrollbar"
        style={{ minHeight: '300px' }}
      >
        <div className="flex flex-col items-center gap-2 min-h-full">
          {fileData && (() => {
            console.log('[PDFViewer] Rendering Document component with fileData:', {
              size: fileData.size,
              type: fileData.type,
              isBlob: fileData instanceof Blob
            });
            return (
            <Document
              file={fileData}
              onLoadStart={onDocumentLoadStart}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center p-8" style={{ minHeight: '200px' }}>
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mr-3" />
                  <span className="text-gray-600">Loading PDF...</span>
                </div>
              }
              error={
                <div className="flex items-center justify-center p-8 text-red-600" style={{ minHeight: '200px' }}>
                  <FileText className="w-8 h-8 mr-3" />
                  <span>Failed to load PDF</span>
                </div>
              }
            >
              {Array.from(new Array(totalPages), (_, index) => {
                const pageNum = index + 1;
                return (
                  <div key={`page_${pageNum}`} className="mb-4" data-page-number={pageNum} style={{ minHeight: '600px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                    <Page
                      pageNumber={pageNum}
                      scale={scale}
                      rotate={rotation}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      loading={
                        <div className="flex items-center justify-center p-8" style={{ minHeight: '600px', width: '600px' }}>
                          <Loader2 className="w-6 h-6 text-blue-500 animate-spin mr-2" />
                          <span className="text-sm text-gray-600">Rendering page {pageNum}...</span>
                        </div>
                      }
                      error={
                        <div className="flex items-center justify-center p-8 text-red-600" style={{ minHeight: '600px', width: '600px' }}>
                          <span className="text-sm">Failed to render page {pageNum}</span>
                        </div>
                      }
                    />
                  </div>
                );
              })}
            </Document>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

// Custom scrollbar styles for the PDF viewer
export const pdfScrollbarStyles = `
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.custom-scrollbar::-webkit-scrollbar-corner {
  background: rgba(0, 0, 0, 0.1);
}
`;
