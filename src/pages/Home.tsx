import { whisper } from '@/lib/utils';
import {
  AlertCircle,
  BookOpen,
  Check,
  ChevronDown,
  Clock,
  Download,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ToastContainer, useToast } from '../components/ui/toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import {
  ARXIV_CATEGORIES,
  arxivCache,
  getPapersByCategoriesCached,
  searchArxivPapersCached,
  type ArxivPaper,
} from '../lib/arxiv';
import { cacheManager, type RecentFile } from '../lib/cache';
import { loggers } from '../lib/logger';
import { openArxivPaperFromObject, openPdfByPath } from '../lib/pdf-opener';
import { storageManager } from '../lib/storage';
import { showError } from '../lib/toast-manager';
import { useAppStore } from '../store';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store hooks
  const recentFiles = useAppStore((s) => s.recentFiles);
  const setRecentFiles = useAppStore((s) => s.setRecentFiles);
  const addRecentFile = useAppStore((s) => s.addRecentFile);
  const setCurrentPaper = useAppStore((s) => s.setCurrentPaper);
  const setLastSelectedPdfPath = useAppStore((s) => s.setLastSelectedPdfPath);

  // State
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [arxivQuery, setArxivQuery] = useState('');
  const [arxivPapers, setArxivPapers] = useState<ArxivPaper[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<ArxivPaper[]>([]);
  const [downloadingPaper, setDownloadingPaper] = useState<string | null>(null);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [papersError, setPapersError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [downloadedPapers, setDownloadedPapers] = useState<Set<string>>(new Set());
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [visibleRecentFilesCount, setVisibleRecentFilesCount] = useState(5);
  const [isSearching, setIsSearching] = useState(false); // Track if we're currently searching

  // Toast notifications
  const { toasts, addToast, removeToast } = useToast();
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;
  const arxivPapersRef = useRef(arxivPapers);
  arxivPapersRef.current = arxivPapers;

  // Load recent files, preferences, and initialize storage on mount
  React.useEffect(() => {
    const initialize = async () => {
      try {
        await cacheManager.initialize();
        await storageManager.initialize();
        const cachedFiles = cacheManager.getRecentFiles(); // Get all recent files
        setRecentFiles(cachedFiles);

        // Load user preferences for arXiv categories
        const prefs = storageManager.getPreferences();
        loggers.app(' Loaded user preferences:', prefs);

        // Set categories - ensure we have at least default categories
        if (prefs.arxivCategories && prefs.arxivCategories.length > 0) {
          setSelectedCategories(prefs.arxivCategories);
          loggers.app(' Using saved categories:', prefs.arxivCategories);
        } else {
          // Fallback to defaults if no preferences saved
          const defaultCategories = ['cs.AI', 'cs.LG', 'cs.CL', 'cs.CV'];
          setSelectedCategories(defaultCategories);
          loggers.app(' Using default categories:', defaultCategories);
        }
      } catch (error) {
        loggers.app('Failed to initialize:', error);
        // Set default categories on error
        setSelectedCategories(['cs.AI', 'cs.LG', 'cs.CL', 'cs.CV']);
      }
    };
    initialize();
  }, [setRecentFiles]);

  // Function to load ArXiv papers
  const loadPapers = useCallback(
    async (forceRefresh = false) => {
      if (selectedCategories.length === 0) return; // Wait for categories to load

      setPapersError(null);
      let hasCachedData = false;

      if (forceRefresh) {
        setIsRefreshing(true);
        setLoadingPapers(true);
      }

      try {
        if (!forceRefresh) {
          // First, try to load cached data immediately (don't show loading if we have cached data)
          const sortedCategories = [...selectedCategories].sort();
          const cacheKey = `categories_${sortedCategories.join('_')}_20`;
          const cached = await arxivCache.get(cacheKey);

          if (cached && cached.length > 0) {
            // Show cached data immediately
            setArxivPapers(cached);

            // Only update filtered papers if we're not currently searching
            if (!isSearching && !arxivQuery.trim()) {
              setFilteredPapers(cached);
            }

            hasCachedData = true;
            loggers.app(' Showing cached papers while fetching fresh data:', cached.length);
          } else {
            // No cached data, show loading indicator
            setLoadingPapers(true);
            loggers.app(' No cached data, fetching from ArXiv...');
          }
        }

        // Fetch fresh data (this will use cache if available and valid, unless forceRefresh is true)
        const papers = await getPapersByCategoriesCached(selectedCategories, 20);
        setArxivPapers(papers);

        // Only update filtered papers if we're not currently searching
        if (!isSearching && !arxivQuery.trim()) {
          setFilteredPapers(papers);
          loggers.app(
            ' 📑 SETTING CATEGORY RESULTS - papers count:',
            papers.length,
            'isSearching:',
            isSearching,
            'query:',
            arxivQuery.trim(),
          );
        } else {
          loggers.app(
            ' ⚠️ SKIPPING category result update - isSearching:',
            isSearching,
            'query:',
            arxivQuery.trim(),
          );
        }

        loggers.app(
          ' Updated with papers for categories:',
          selectedCategories,
          'count:',
          papers.length,
          'isSearching:',
          isSearching,
          'arxivQuery:',
          arxivQuery.trim(),
          '✅ Should update filtered:',
          !isSearching && !arxivQuery.trim(),
        );
      } catch (error: unknown) {
        loggers.app(' Failed to load papers:', error);
        const errorMessage = (error as Error).message || 'Unknown error occurred';
        loggers.app(' Detailed error info:', {
          originalError: error,
          message: errorMessage,
          stack: (error as Error).stack,
          selectedCategories,
          forceRefresh,
        });
        setPapersError(
          `Failed to load ArXiv papers: ${errorMessage}. Please check your internet connection and try again.`,
        );

        // Show error toast notification
        addToast({
          title: 'Failed to load papers',
          message: `Error: ${errorMessage}. Please check your internet connection and try again.`,
          type: 'error',
          duration: 8000,
          actions: [
            {
              label: 'Retry',
              onClick: async () => {
                try {
                  arxivCache.clear();
                } catch (error) {
                  loggers.app('Failed to clear cache:', error);
                }
                await loadPapers(true);
              },
            },
          ],
        });

        // Only clear data if we don't have cached data
        if (!hasCachedData) {
          setArxivPapers([]);
          setFilteredPapers([]);
        }
      } finally {
        setLoadingPapers(false);
        if (forceRefresh) {
          setIsRefreshing(false);
        }
      }
    },
    [selectedCategories, addToast, isSearching, arxivQuery],
  );

  // Handle refresh button click
  const handleRefreshPapers = useCallback(async () => {
    // Force reload by clearing all cache and fetching fresh data
    try {
      arxivCache.clear(); // Clear memory cache
      loggers.app(' Cleared cache before refresh');
    } catch (error) {
      loggers.app(' Failed to clear cache:', error);
    }

    await loadPapers(true);
  }, [loadPapers]);

  // Load ArXiv papers based on selected categories
  React.useEffect(() => {
    loadPapers();
  }, [loadPapers]);

  // Combined effect to manage filtered papers (search vs category results)
  React.useEffect(() => {
    loggers.app(
      ' 🎯 MASTER EFFECT: Managing filtered papers - isSearching:',
      isSearching,
      'query:',
      arxivQuery.trim(),
    );

    if (arxivQuery.trim()) {
      // User is typing/has typed a search query
      if (!isSearching) {
        // User just started typing, set searching state
        loggers.app(' 🔍 MASTER EFFECT: Setting searching state');
        setIsSearching(true);
      }
      // When actively searching, don't override with category papers
      loggers.app(' ⏳ MASTER EFFECT: Search mode - waiting for search results');
      return;
    } else {
      // Query is empty - show category papers
      if (isSearching) {
        loggers.app(' 🔄 MASTER EFFECT: Clearing search state');
        setIsSearching(false);
      }
      loggers.app(' 📑 MASTER EFFECT: Setting category papers:', arxivPapers.length);
      setFilteredPapers(arxivPapers);
    }
  }, [arxivQuery, arxivPapers, isSearching]);

  // Search ArXiv papers with debouncing (only handles search requests)
  React.useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Only search if we have a query
    if (!arxivQuery.trim()) {
      return;
    }

    loggers.app(' ⏰ SEARCH EFFECT: Scheduling search for:', arxivQuery);

    // Debounce search - wait 500ms after user stops typing
    searchTimeoutRef.current = setTimeout(async () => {
      setLoadingPapers(true);
      setPapersError(null);

      try {
        loggers.app(' 🔍 SEARCH EFFECT: Executing search for:', arxivQuery);
        // Build search query for title, author, or abstract
        const searchQuery = `all:${arxivQuery}`;
        const papers = await searchArxivPapersCached(searchQuery, { maxResults: 20 });

        loggers.app(` 🔍 SETTING SEARCH RESULTS for "${arxivQuery}":`, papers.length, 'papers');
        if (papers.length > 0) {
          loggers.app(
            ' 📊 First few search result titles:',
            papers.slice(0, 3).map((p) => p.title),
          );
        }
        setFilteredPapers(papers);
      } catch (error: unknown) {
        loggers.app(' ❌ SEARCH EFFECT: Search failed:', error);
        const errorMessage = (error as Error).message || 'Unknown search error';
        setPapersError(`Search failed: ${errorMessage}. Please try again with different keywords.`);

        // Show search error toast notification
        addToastRef.current({
          title: 'Search failed',
          message: `Error: ${errorMessage}. Please try different keywords or check your connection.`,
          type: 'error',
          duration: 6000,
        });

        setFilteredPapers([]);
      } finally {
        setLoadingPapers(false);
      }
    }, 500);

    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [arxivQuery]); // Only depend on the search query

  // Process PDF file and navigate to chat
  const processPdfFile = useCallback(
    async (filePath: string) => {
      whisper('filePath is: ', filePath);

      try {
        await openPdfByPath(filePath, {
          addRecentFile,
          setCurrentPaper,
          setLastSelectedPdfPath,
          navigate,
          onStart: () => {
            setLoading(true);
            setLoadingFile(filePath);
          },
          onComplete: () => {
            setLoading(false);
            setLoadingFile(null);
          },
          onError: (err) => {
            setLoading(false);
            setLoadingFile(null);
            showError(`Failed to load PDF: ${err.message ?? String(err)}`);
          },
        });
      } catch {
        // Error already handled in onError callback
      }
    },
    [navigate, setCurrentPaper, setLastSelectedPdfPath, addRecentFile],
  );

  // Handle file selection via Tauri dialog
  const handleFileSelect = useCallback(async () => {
    loggers.app(' handleFileSelect called - opening Tauri file dialog');

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      loggers.app(' Tauri dialog imported successfully');

      const filePath = await open({
        multiple: false,
        title: 'Select a PDF',
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });

      loggers.app(' Dialog result:', filePath);

      if (typeof filePath === 'string' && filePath.endsWith('.pdf')) {
        loggers.app(' Valid PDF selected, processing:', filePath);
        await processPdfFile(filePath);
      } else if (filePath) {
        loggers.app(' Invalid file selected:', filePath);
        showError('Please select a PDF file');
      } else {
        loggers.app(' File selection cancelled by user');
      }
    } catch (err: unknown) {
      loggers.app(' File selection error:', err);
      showError(`Failed to select file: ${(err as Error)?.message ?? String(err)}`);
    }
  }, [processPdfFile]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      loggers.app(' File dropped');
      // Note: In Tauri, drag & drop may not work the same as web
      // For now, open file dialog as fallback
      handleFileSelect();
    },
    [handleFileSelect],
  );

  // Recent file selection
  const handleRecentFileSelect = useCallback(
    async (file: RecentFile) => {
      await processPdfFile(file.path);
      await cacheManager.updateLastAccessed(file.path);
    },
    [processPdfFile],
  );

  // Remove recent file
  const handleRemoveRecentFile = useCallback(
    async (file: RecentFile, e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent file selection when clicking delete

      try {
        await cacheManager.removeRecentFile(file.path);
        // Update the UI by removing from the list
        const updatedFiles = recentFiles.filter((f) => f.id !== file.id);
        setRecentFiles(updatedFiles);
        loggers.app(' Removed recent file:', file.path);
      } catch (error) {
        loggers.app(' Failed to remove recent file:', error);
        showError('Failed to remove file from recent list');
      }
    },
    [recentFiles, setRecentFiles],
  );

  // Helper function to get paper file path
  const getPaperFilePath = useCallback((paper: ArxivPaper): string => {
    const storagePath = storageManager.getStoragePath();
    if (!storagePath) return '';

    const sanitizedArxivId = paper.id.replace(/\//g, '_');
    const sanitizedTitle = paper.title
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 100)
      .replace(/^_+|_+$/g, '');
    const fileName = `${sanitizedArxivId}_${sanitizedTitle}.pdf`;
    return `${storagePath}/${fileName}`;
  }, []);

  // Check if papers are already downloaded
  const checkDownloadedPapers = useCallback(
    async (papers: ArxivPaper[]) => {
      const { exists } = await import('@tauri-apps/plugin-fs');
      const downloaded = new Set<string>();

      for (const paper of papers) {
        const filePath = getPaperFilePath(paper);
        if (filePath) {
          try {
            if (await exists(filePath)) {
              downloaded.add(paper.id);
            }
          } catch {
            // File doesn't exist or error checking
          }
        }
      }

      setDownloadedPapers(downloaded);
    },
    [getPaperFilePath],
  );

  // ArXiv paper download handler
  const handleArxivDownload = useCallback(
    async (paper: ArxivPaper) => {
      try {
        await openArxivPaperFromObject(paper, {
          addRecentFile,
          setCurrentPaper,
          setLastSelectedPdfPath,
          navigate,
          onStart: () => setDownloadingPaper(paper.id),
          onComplete: () => {
            setDownloadingPaper(null);
            // Mark as downloaded
            setDownloadedPapers((prev) => new Set(prev).add(paper.id));
          },
          onError: (error) => {
            setDownloadingPaper(null);
            showError(`Failed to download paper: ${error.message ?? 'Unknown error'}`);
          },
        });
      } catch {
        // Error already handled in onError callback
      }
    },
    [navigate, setCurrentPaper, setLastSelectedPdfPath, addRecentFile],
  );

  // Handle continuing chat with an already-downloaded paper
  const handleContinueChat = useCallback(
    async (paper: ArxivPaper) => {
      const filePath = getPaperFilePath(paper);
      if (filePath) {
        await processPdfFile(filePath);
      }
    },
    [getPaperFilePath, processPdfFile],
  );

  // Check which papers are already downloaded whenever papers change
  React.useEffect(() => {
    if (filteredPapers.length > 0) {
      checkDownloadedPapers(filteredPapers);
    }
  }, [filteredPapers, checkDownloadedPapers]);

  // Format file size helper
  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  // Format date helper
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  // Category selection handlers
  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories((prev) => {
      const newCategories = prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category];

      // Save to preferences
      storageManager.updateArxivCategories(newCategories);

      return newCategories;
    });
  }, []);

  const handleResetCategories = useCallback(() => {
    const defaultCategories = ['cs.AI', 'cs.LG', 'cs.CL', 'cs.CV'];
    setSelectedCategories(defaultCategories);
    storageManager.updateArxivCategories(defaultCategories);
  }, []);

  const handleShowMoreRecentFiles = useCallback(() => {
    setVisibleRecentFilesCount((prevCount) => Math.min(prevCount * 2, recentFiles.length));
  }, [recentFiles.length]);

  return (
    <div className="animate-fade-in mx-auto max-w-[1920px] space-y-6 px-6 py-4">
      {/* File Upload Section - Always visible */}
      <div className="glass rounded-lg border border-white/20 p-6 backdrop-blur-xl">
        <div
          className={`mb-6 w-full cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-all duration-300 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 ${
            dragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600'
          } ${loading ? 'pointer-events-none opacity-50' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={() => {
              loggers.app(' File input onChange triggered');
              handleFileSelect();
            }}
            className="hidden"
          />

          {loading ? (
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Processing PDF...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="relative">
                  <img src="/logo.png" alt="Logo" className="h-12 w-12" />
                  <div className="absolute inset-0 h-12 w-12 rounded-full bg-blue-600/20 blur-xl" />
                </div>
              </div>

              <h1 className="text-gradient bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-4xl font-bold text-transparent">
                Select a Document
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
                Choose a PDF file to start chatting with your research papers using AI
              </p>
            </div>
          )}
        </div>

        {/* Recent Files Section - Only shown when there are recent files */}
        {recentFiles.length > 0 && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Files</h2>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                {recentFiles.length}
              </span>
            </div>

            <div className="space-y-1">
              {recentFiles.slice(0, visibleRecentFilesCount).map((file) => (
                <div
                  key={file.id}
                  className={`group flex cursor-pointer items-center gap-4 rounded-lg border-zinc-100 px-2 py-2 transition-all duration-200 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 ${
                    loadingFile === file.path ? 'pointer-events-none opacity-50' : ''
                  }`}
                  onClick={() => handleRecentFileSelect(file)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRecentFileSelect(file);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {/* File Icon */}
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded">
                    <img src="/arxiv.png" alt="ArXiv" className="h-4 w-4" />
                  </div>

                  {/* File Info - main content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="truncate text-sm font-semibold text-gray-900 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
                        {file.title || file.path.split('/').pop() || 'Untitled'}
                      </h4>
                      <div className="flex flex-shrink-0 items-center gap-3 text-xs text-gray-500">
                        {file.pageCount && <span>{file.pageCount} pages</span>}
                        {file.fileSize && <span>• {formatFileSize(file.fileSize)}</span>}
                        <span>• {formatDate(file.lastAccessed)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {loadingFile === file.path && (
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                    )}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => handleRemoveRecentFile(file, e)}
                            className="rounded-md border border-white/20 bg-white/20 p-1 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 hover:border-red-200 hover:bg-red-50 dark:bg-gray-800/20 dark:hover:border-red-800 dark:hover:bg-red-900/30"
                          >
                            <Trash2 className="h-3 w-3 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Remove from recent files</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>

            {/* Show More Button */}
            {visibleRecentFilesCount < recentFiles.length && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShowMoreRecentFiles}
                  className="glass border-white/20 bg-white/10 backdrop-blur-xl"
                >
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Show More ({recentFiles.length - visibleRecentFilesCount} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ArXiv Browser Section - Always visible */}
      <div className="glass rounded-lg border border-white/20 p-6 backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-pink-600">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {recentFiles.length === 0 ? 'Or browse ArXiv Papers' : 'Latest ArXiv Papers'}
            </h2>
            {(loadingPapers || isRefreshing) && (
              <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshPapers}
                    disabled={loadingPapers || isRefreshing}
                    className="glass border-white/20 bg-white/10 backdrop-blur-xl"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh papers</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCategorySelector(!showCategorySelector)}
                    className="glass border-white/20 bg-white/10 backdrop-blur-xl"
                  >
                    <Settings2 className="mr-2 h-4 w-4" />
                    Categories ({selectedCategories.length})
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Filter papers by ArXiv categories</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Category Selector */}
        {showCategorySelector && (
          <div className="mb-6 rounded-lg border border-white/20 bg-white/50 p-4 dark:bg-gray-800/50">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select categories to see the latest papers:
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetCategories}
                  className="text-xs"
                >
                  Reset to Defaults
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCategorySelector(false)}
                  className="text-xs"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Object.entries(ARXIV_CATEGORIES).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => toggleCategory(code)}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    selectedCategories.includes(code)
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-orange-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="truncate">{name}</span>
                  {selectedCategories.includes(code) && (
                    <Check className="ml-1 h-4 w-4 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            placeholder="Search papers by title, author, or category..."
            value={arxivQuery}
            onChange={(e) => setArxivQuery(e.target.value)}
            className="glass border-white/20 bg-white/10 pl-10 backdrop-blur-xl"
            disabled={loadingPapers}
          />
        </div>

        {/* Error Message */}
        {papersError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="mb-3 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
              <p className="flex-grow text-sm text-red-800 dark:text-red-200">{papersError}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshPapers}
              disabled={loadingPapers || isRefreshing}
              className="border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-900/30"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Try Again'}
            </Button>
          </div>
        )}

        {/* Papers Grid */}
        <div
          className={`grid min-h-[300px] gap-4 ${recentFiles.length === 0 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}
        >
          {loadingPapers && filteredPapers.length === 0 ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-orange-500" />
                <p className="text-gray-600 dark:text-gray-300">Loading papers from ArXiv...</p>
              </div>
            </div>
          ) : filteredPapers.length === 0 ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <div className="text-center">
                <Search className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-300">
                  {arxivQuery ? 'No papers found. Try a different search.' : 'No papers available.'}
                </p>
              </div>
            </div>
          ) : (
            filteredPapers.map((paper) => (
              <div
                key={paper.id}
                className={`group flex flex-col rounded-lg border border-white/20 p-4 transition-all duration-200 hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-900/20 ${
                  downloadingPaper === paper.id ? 'opacity-75' : ''
                }`}
              >
                <h4 className="mb-2 line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-orange-600 dark:text-white dark:group-hover:text-orange-400">
                  {paper.title}
                </h4>
                <p className="mb-2 line-clamp-1 text-xs text-gray-600 dark:text-gray-300">
                  <strong>Authors:</strong> {paper.authors}
                </p>
                <p className="mb-3 line-clamp-3 flex-grow text-xs text-gray-500 dark:text-gray-400">
                  {paper.abstract}
                </p>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">
                      {new Date(paper.publishedDate).toLocaleDateString()}
                    </span>
                    <span className="text-xs font-medium text-orange-600">{paper.category}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      downloadedPapers.has(paper.id)
                        ? handleContinueChat(paper)
                        : handleArxivDownload(paper)
                    }
                    disabled={downloadingPaper === paper.id || loading}
                    className="glass h-7 border-white/20 bg-white/10 px-3 text-xs backdrop-blur-xl hover:bg-orange-50 disabled:opacity-50 dark:hover:bg-orange-900/30"
                  >
                    {downloadingPaper === paper.id ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Downloading...
                      </>
                    ) : downloadedPapers.has(paper.id) ? (
                      <>
                        <MessageSquare className="mr-1 h-3 w-3" />
                        Continue Chat
                      </>
                    ) : (
                      <>
                        <Download className="mr-1 h-3 w-3" />
                        Download
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 border-t border-white/20 pt-4">
          <p className="text-center text-xs text-gray-500">
            💡 Papers will be saved to your{' '}
            {storageManager.getStoragePath()?.includes('iBooks')
              ? 'iBooks library'
              : 'Documents folder'}
          </p>
        </div>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};
