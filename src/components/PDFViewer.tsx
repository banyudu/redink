import { loggers } from '@/lib/logger';
import { openArxivPaper } from '@/lib/pdf-opener';
import { showError } from '@/lib/toast-manager';
import { useAppStore } from '@/store';
import { readFile } from '@tauri-apps/plugin-fs';
import { Command } from '@tauri-apps/plugin-shell';
import { BookOpen, FileText, Loader2, Maximize2, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

// Configure PDF.js worker
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Use the same worker setup as in pdf.ts
import { whisper } from '@/lib/utils';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
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
  const urlMatch = text.match(
    /arxiv\.org\/(?:abs|pdf)\/([a-zA-Z-]+\/\d+|\d+\.\d+)(?:v\d+)?(?:\.pdf)?/i,
  );
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
  const {
    pdfViewerScale,
    setPdfViewerScale,
    setReadingProgress,
    getReadingProgress,
    addRecentFile,
    setCurrentPaper,
    setLastSelectedPdfPath,
  } = useAppStore();
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(pdfViewerScale);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileData, setFileData] = useState<Blob | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingArxiv, setDownloadingArxiv] = useState(false);

  // Detect if we're on macOS
  const isMacOS =
    typeof window !== 'undefined' && window.navigator?.platform.toUpperCase().indexOf('MAC') >= 0;

  // Use refs to throttle zoom updates and prevent flickering
  const pendingScaleRef = React.useRef<number | null>(null);
  const rafIdRef = React.useRef<number | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const saveProgressTimeoutRef = React.useRef<number | null>(null);
  const hasRestoredProgressRef = React.useRef(false);

  // Handle arXiv paper click
  const handleArxivPaperClick = useCallback(
    async (arxivId: string) => {
      if (downloadingArxiv) {
        loggers.pdf('Already downloading a paper, ignoring click');
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
            showError(`Failed to open paper: ${error.message ?? 'Unknown error'}`);
          },
        });
      } catch {
        // Error already handled in onError callback
      }
    },
    [downloadingArxiv, navigate, addRecentFile, setCurrentPaper, setLastSelectedPdfPath],
  );

  // Persist scale changes to store
  useEffect(() => {
    setPdfViewerScale(scale);
  }, [scale, setPdfViewerScale]);

  // Save reading progress (debounced)
  const saveProgress = useCallback(
    (scrollTop: number, scrollLeft: number, page: number) => {
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
        loggers.pdf('Saved reading progress:', { scrollTop, scrollLeft, page });
      }, 500);
    },
    [filePath, setReadingProgress],
  );

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
  const handleScroll = useCallback(
    (e: Event) => {
      const container = e.target as HTMLDivElement;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const scrollLeft = container.scrollLeft;
      const page = detectCurrentPage(container);

      setCurrentPage(page);
      saveProgress(scrollTop, scrollLeft, page);
    },
    [detectCurrentPage, saveProgress],
  );

  // Restore reading progress after PDF is loaded
  useEffect(() => {
    if (
      !scrollContainerRef.current ||
      !filePath ||
      totalPages === 0 ||
      hasRestoredProgressRef.current
    ) {
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
          loggers.pdf(' Restored reading progress:', savedProgress);
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
          loggers.pdf(' Clicked arXiv link:', arxivId);
          handleArxivPaperClick(arxivId);
        } else {
          loggers.pdf(' Blocked non-arXiv link:', link.href);
        }
      }
    };

    // Handle clicks on text layer to detect arXiv references
    const handleTextLayerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if clicked on a span within text content
      if (target.tagName === 'SPAN' && target.closest('.react-pdf__Page__textContent')) {
        // Try to get arXiv ID from the span itself
        const text = target.textContent || '';
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
            const combinedText =
              (prevSibling.textContent || '') + text + (nextSibling.textContent || '');
            arxivId = extractArxivId(combinedText);
          }
        }

        if (arxivId) {
          loggers.pdf(' Clicked arXiv reference in text:', arxivId);
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
          loggers.pdf(' Styled arXiv link:', arxivId);
        } else {
          // Non-arXiv link - remove link styling
          link.classList.add('non-arxiv-link');
          (link as HTMLElement).style.color = 'inherit';
          (link as HTMLElement).style.textDecoration = 'none';
          (link as HTMLElement).style.cursor = 'default';
          (link as HTMLElement).title = 'External links are disabled';
          loggers.pdf(' Removed styling from non-arXiv link:', href);
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
            loggers.pdf(' Styled arXiv text reference:', combinedText.substring(0, 50));
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
          loggers.pdf(' Styled arXiv text reference:', text.substring(0, 50));
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
              return (
                node.classList.contains('react-pdf__Page__textContent') ||
                node.querySelector('.react-pdf__Page__textContent') ||
                node.classList.contains('react-pdf__Page__annotations') ||
                node.querySelector('.react-pdf__Page__annotations') ||
                node.tagName === 'A'
              );
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
      subtree: true,
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
  }, [handleArxivPaperClick, totalPages]);

  const pdfContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
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
              window.window.cancelAnimationFrame(rafIdRef.current);
            }

            // Schedule update for next animation frame
            // This batches all zoom updates from rapid gestures into a single re-render
            rafIdRef.current = window.requestAnimationFrame(() => {
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

          const gestureEvent = e as unknown as { scale: number }; // WebKit GestureEvent
          if (gestureEvent.scale) {
            if (pendingScaleRef.current === null) {
              pendingScaleRef.current = scale;
            }

            pendingScaleRef.current = Math.max(0.5, Math.min(scale * gestureEvent.scale, 3.0));

            if (rafIdRef.current !== null) {
              window.cancelAnimationFrame(rafIdRef.current);
            }

            rafIdRef.current = window.requestAnimationFrame(() => {
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
            window.cancelAnimationFrame(rafIdRef.current);
          }
        };
      }
    },
    [scale],
  );

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
        loggers.pdf(' Starting file read:', filePath);
        setLoading(true);
        setError(null);

        const data = await readFile(filePath);
        loggers.pdf(' File read complete:', {
          byteLength: data.byteLength,
          constructor: data.constructor.name,
          isUint8Array: data instanceof Uint8Array,
          hasBuffer: !!data.buffer,
          bufferByteLength: data.buffer?.byteLength,
        });

        if (!cancelled) {
          whisper(`[PDFViewer] File read successfully, size: ${data.byteLength} bytes`);

          // Convert to Blob to prevent ArrayBuffer detachment issues
          // Blobs are immutable and safe to pass between threads and store in React state
          loggers.pdf(' Creating Blob from data...');

          // Create a standard ArrayBuffer and copy the data
          const buffer = new ArrayBuffer(data.byteLength);
          const view = new Uint8Array(buffer);
          view.set(data);

          // Create Blob from the standard ArrayBuffer
          const blob = new Blob([buffer], { type: 'application/pdf' });

          loggers.pdf(' Blob created:', {
            size: blob.size,
            type: blob.type,
            constructor: blob.constructor.name,
          });

          setFileData(blob);
          loggers.pdf(' File data (Blob) set in state');
        }
      } catch (err: unknown) {
        if (!cancelled) {
          loggers.pdf(' Error reading PDF file:', err);
          setError(`Failed to read file: ${(err as Error)?.message ?? 'Unknown error'}`);
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
    loggers.pdf(
      ' fileData changed:',
      fileData
        ? {
            size: fileData.size,
            type: fileData.type,
            isBlob: fileData instanceof Blob,
            constructor: fileData.constructor.name,
          }
        : 'null',
    );
  }, [fileData]);

  // Document loading handlers
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    loggers.pdf(' Document loaded successfully, pages:', numPages);
    whisper(`[PDFViewer] Document loaded successfully with ${numPages} pages`);
    setTotalPages(numPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: unknown) => {
    loggers.pdf(' Error loading PDF document:', error);
    loggers.pdf(' Error details:', {
      message: (error as Error)?.message,
      name: (error as Error)?.name,
      stack: (error as Error)?.stack,
    });
    setError(`Failed to load PDF: ${(error as Error)?.message ?? 'Unknown error'}`);
    setLoading(false);
  }, []);

  const onDocumentLoadStart = useCallback(() => {
    loggers.pdf(' Document loading started');
    whisper('[PDFViewer] Document loading started');
    setLoading(true);
    setError(null);
  }, []);

  // Zoom handlers
  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1.0);
  }, []);

  // Rotation handler
  const rotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
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
      loggers.pdf(' Opening PDF in iBooks:', filePath);

      // Use AppleScript to open the file in Books.app
      // This is more reliable than the 'open' command for Books
      const script = `tell application "Books"
        activate
        open POSIX file "${filePath}"
      end tell`;

      const command = Command.create('osascript', ['-e', script]);
      const output = await command.execute();

      if (output.code !== 0) {
        loggers.pdf(' Failed to open in iBooks:', output.stderr);
        showError(`Failed to open in iBooks: ${output.stderr || 'Unknown error'}`);
      } else {
        loggers.pdf(' Successfully opened in iBooks');
      }
    } catch (error: unknown) {
      loggers.pdf(' Error opening in iBooks:', error);
      showError(`Failed to open in iBooks: ${(error as Error)?.message ?? 'Unknown error'}`);
    }
  }, [filePath, isMacOS]);

  // Handle case when no file path is provided
  if (!filePath) {
    return (
      <div className={`flex h-full flex-col items-center justify-center ${className}`}>
        <div className='glass rounded-lg border border-white/20 p-8 text-center backdrop-blur-xl'>
          <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-gray-400 to-gray-500'>
            <FileText className='h-8 w-8 text-white' />
          </div>
          <h3 className='mb-2 text-lg font-semibold text-gray-900 dark:text-white'>
            No PDF Loaded
          </h3>
          <p className='text-gray-600 dark:text-gray-300'>Select a document to view</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`glass relative flex h-full flex-col rounded-lg border border-white/20 backdrop-blur-xl ${className}`}
      style={{ minHeight: '400px' }}
    >
      {/* Loading Overlay - Fixed dimensions to prevent layout shift */}
      {loading && (
        <div className='absolute inset-0 z-50 flex flex-col items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm dark:bg-gray-900/90'>
          <div className='glass rounded-lg border border-white/20 p-8 text-center backdrop-blur-xl'>
            <Loader2 className='mx-auto mb-4 h-12 w-12 animate-spin text-blue-500' />
            <h3 className='mb-2 text-lg font-semibold text-gray-900 dark:text-white'>
              Loading PDF
            </h3>
            <p className='text-gray-600 dark:text-gray-300'>Processing your document...</p>
          </div>
        </div>
      )}

      {/* Downloading ArXiv Paper Overlay - Fixed dimensions to prevent layout shift */}
      {downloadingArxiv && (
        <div className='absolute inset-0 z-50 flex flex-col items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm dark:bg-gray-900/90'>
          <div className='glass rounded-lg border border-white/20 p-8 text-center backdrop-blur-xl'>
            <Loader2 className='mx-auto mb-4 h-12 w-12 animate-spin text-purple-500' />
            <h3 className='mb-2 text-lg font-semibold text-gray-900 dark:text-white'>
              Opening ArXiv Paper
            </h3>
            <p className='text-gray-600 dark:text-gray-300'>
              Downloading and opening the referenced paper...
            </p>
          </div>
        </div>
      )}

      {/* Error Overlay - Fixed dimensions to prevent layout shift */}
      {error && (
        <div className='absolute inset-0 z-50 flex flex-col items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm dark:bg-gray-900/90'>
          <div className='glass rounded-lg border border-white/20 p-8 text-center backdrop-blur-xl'>
            <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-pink-600'>
              <FileText className='h-8 w-8 text-white' />
            </div>
            <h3 className='mb-2 text-lg font-semibold text-gray-900 dark:text-white'>
              Error Loading PDF
            </h3>
            <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
          </div>
        </div>
      )}

      {/* Toolbar - Fixed height to prevent layout shift */}
      <div
        className='flex flex-shrink-0 items-center justify-between rounded-t-2xl border-b border-white/20 bg-gradient-to-r from-blue-50/50 to-purple-50/50 p-4 dark:from-blue-900/20 dark:to-purple-900/20'
        style={{ minHeight: '64px' }}
      >
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-purple-600'>
            <FileText className='h-4 w-4 text-white' />
          </div>
          <span
            className='text-sm font-medium text-gray-900 dark:text-white'
            style={{ minWidth: '120px' }}
          >
            PDF Viewer {totalPages > 0 && `(Page ${currentPage} of ${totalPages})`}
          </span>
        </div>

        <TooltipProvider>
          <div className='flex items-center gap-1'>
            {/* Zoom Controls */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={zoomOut}
                  disabled={scale <= 0.5}
                  className='h-8 w-8 p-0'
                >
                  <ZoomOut className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom Out (Ctrl/Cmd + Scroll)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size='sm' variant='ghost' onClick={resetZoom} className='h-8 px-2 text-xs'>
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
                  size='sm'
                  variant='ghost'
                  onClick={zoomIn}
                  disabled={scale >= 3.0}
                  className='h-8 w-8 p-0'
                >
                  <ZoomIn className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom In (Ctrl/Cmd + Scroll)</p>
              </TooltipContent>
            </Tooltip>

            <div className='mx-2 h-6 w-px bg-gray-300 dark:bg-gray-600' />

            {/* Additional Controls */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size='sm' variant='ghost' onClick={rotate} className='h-8 w-8 p-0'>
                  <RotateCw className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Rotate 90° Clockwise</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size='sm' variant='ghost' onClick={fitToWidth} className='h-8 w-8 p-0'>
                  <Maximize2 className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Fit to Width</p>
              </TooltipContent>
            </Tooltip>

            {/* Open in iBooks (macOS only) */}
            {isMacOS && (
              <>
                <div className='mx-2 h-6 w-px bg-gray-300 dark:bg-gray-600' />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={openInIBooks}
                      className='h-8 w-8 p-0'
                    >
                      <BookOpen className='h-4 w-4' />
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
        className='custom-scrollbar flex-1 overflow-auto bg-gray-50 p-2 dark:bg-gray-900/50'
        style={{ minHeight: '300px' }}
      >
        <div className='flex min-h-full flex-col items-center gap-2'>
          {fileData &&
            (() => {
              loggers.pdf(' Rendering Document component with fileData:', {
                size: fileData.size,
                type: fileData.type,
                isBlob: fileData instanceof Blob,
              });
              return (
                <Document
                  file={fileData}
                  onLoadStart={onDocumentLoadStart}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div
                      className='flex items-center justify-center p-8'
                      style={{ minHeight: '200px' }}
                    >
                      <Loader2 className='mr-3 h-8 w-8 animate-spin text-blue-500' />
                      <span className='text-gray-600'>Loading PDF...</span>
                    </div>
                  }
                  error={
                    <div
                      className='flex items-center justify-center p-8 text-red-600'
                      style={{ minHeight: '200px' }}
                    >
                      <FileText className='mr-3 h-8 w-8' />
                      <span>Failed to load PDF</span>
                    </div>
                  }
                >
                  {Array.from(new Array(totalPages), (_, index) => {
                    const pageNum = index + 1;
                    return (
                      <div
                        key={`page_${pageNum}`}
                        className='mb-4'
                        data-page-number={pageNum}
                        style={{
                          minHeight: '600px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'flex-start',
                        }}
                      >
                        <Page
                          pageNumber={pageNum}
                          scale={scale}
                          rotate={rotation}
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                          loading={
                            <div
                              className='flex items-center justify-center p-8'
                              style={{ minHeight: '600px', width: '600px' }}
                            >
                              <Loader2 className='mr-2 h-6 w-6 animate-spin text-blue-500' />
                              <span className='text-sm text-gray-600'>
                                Rendering page {pageNum}...
                              </span>
                            </div>
                          }
                          error={
                            <div
                              className='flex items-center justify-center p-8 text-red-600'
                              style={{ minHeight: '600px', width: '600px' }}
                            >
                              <span className='text-sm'>Failed to render page {pageNum}</span>
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
