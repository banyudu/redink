import React, { useCallback, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store";
import { extractPdfFromPathWithMeta } from "../lib/pdf";
import { cacheManager } from "../lib/cache";
import { storageManager } from "../lib/storage";
import type { RecentFile } from "../lib/cache";
import { 
  searchArxivPapersCached,
  getPapersByCategoriesCached,
  arxivCache,
  ARXIV_CATEGORIES,
  type ArxivPaper
} from "../lib/arxiv";
import { 
  FileText, 
  Upload, 
  Search,
  Clock,
  BookOpen,
  Download,
  Loader2,
  FolderOpen,
  AlertCircle,
  Settings2,
  X,
  Check,
  Trash2,
  MessageSquare
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { whisper, generateFileId } from "@/lib/utils";

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
  const [arxivQuery, setArxivQuery] = useState("");
  const [arxivPapers, setArxivPapers] = useState<ArxivPaper[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<ArxivPaper[]>([]);
  const [downloadingPaper, setDownloadingPaper] = useState<string | null>(null);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [papersError, setPapersError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [downloadedPapers, setDownloadedPapers] = useState<Set<string>>(new Set());
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent files, preferences, and initialize storage on mount
  React.useEffect(() => {
    const initialize = async () => {
      try {
        await cacheManager.initialize();
        await storageManager.initialize();
        const cachedFiles = cacheManager.getRecentFiles().slice(0, 5); // Limit to 5
        setRecentFiles(cachedFiles);
        
        // Load user preferences for arXiv categories
        const prefs = storageManager.getPreferences();
        console.log('[Home] Loaded user preferences:', prefs);
        
        // Set categories - ensure we have at least default categories
        if (prefs.arxivCategories && prefs.arxivCategories.length > 0) {
          setSelectedCategories(prefs.arxivCategories);
          console.log('[Home] Using saved categories:', prefs.arxivCategories);
        } else {
          // Fallback to defaults if no preferences saved
          const defaultCategories = ['cs.AI', 'cs.LG', 'cs.CL', 'cs.CV'];
          setSelectedCategories(defaultCategories);
          console.log('[Home] Using default categories:', defaultCategories);
        }
      } catch (error) {
        console.error('Failed to initialize:', error);
        // Set default categories on error
        setSelectedCategories(['cs.AI', 'cs.LG', 'cs.CL', 'cs.CV']);
      }
    };
    initialize();
  }, [setRecentFiles]);

  // Load ArXiv papers based on selected categories
  React.useEffect(() => {
    const loadPapers = async () => {
      if (selectedCategories.length === 0) return; // Wait for categories to load
      
      setPapersError(null);
      let hasCachedData = false;
      
      try {
        // First, try to load cached data immediately (don't show loading if we have cached data)
        const sortedCategories = [...selectedCategories].sort();
        const cacheKey = `categories_${sortedCategories.join('_')}_20`;
        const cached = await arxivCache.get(cacheKey);
        
        if (cached && cached.length > 0) {
          // Show cached data immediately
          setArxivPapers(cached);
          setFilteredPapers(cached);
          hasCachedData = true;
          console.log('[Home] Showing cached papers while fetching fresh data:', cached.length);
        } else {
          // No cached data, show loading indicator
          setLoadingPapers(true);
          console.log('[Home] No cached data, fetching from ArXiv...');
        }
        
        // Then fetch fresh data in the background (this will use cache if available and valid)
        const papers = await getPapersByCategoriesCached(selectedCategories, 20);
        setArxivPapers(papers);
        setFilteredPapers(papers);
        console.log('[Home] Updated with papers for categories:', selectedCategories, 'count:', papers.length);
      } catch (error: any) {
        console.error('[Home] Failed to load papers:', error);
        setPapersError('Failed to load ArXiv papers. Please try again later.');
        // Only clear data if we don't have cached data
        if (!hasCachedData) {
          setArxivPapers([]);
          setFilteredPapers([]);
        }
      } finally {
        setLoadingPapers(false);
      }
    };
    
    loadPapers();
  }, [selectedCategories]);

  // Search ArXiv papers with debouncing
  React.useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // If query is empty, show featured papers
    if (!arxivQuery.trim()) {
      setFilteredPapers(arxivPapers);
      return;
    }
    
    // Debounce search - wait 500ms after user stops typing
    searchTimeoutRef.current = setTimeout(async () => {
      setLoadingPapers(true);
      setPapersError(null);
      
      try {
        // Build search query for title, author, or abstract
        const searchQuery = `all:${arxivQuery}`;
        const papers = await searchArxivPapersCached(searchQuery, { maxResults: 20 });
        setFilteredPapers(papers);
        console.log('[Home] Search results:', papers.length);
      } catch (error: any) {
        console.error('[Home] Search failed:', error);
        setPapersError('Search failed. Please try again.');
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
  }, [arxivQuery, arxivPapers]);

  // Process PDF file and navigate to chat
  const processPdfFile = useCallback(async (filePath: string) => {
    whisper('filePath is: ', filePath)
    setLoading(true);
    setLoadingFile(filePath);
    
    try {
      const result = await extractPdfFromPathWithMeta(filePath);
      const { title, pageCount, fileSize } = result;
      
      // Add to recent files
      const recentFile: RecentFile = {
        id: generateFileId(filePath),
        path: filePath,
        title: title || filePath.split('/').pop() || 'Untitled',
        lastAccessed: Date.now(),
        addedDate: Date.now(),
        pageCount,
        fileSize
      };
      
      await cacheManager.addRecentFile(filePath, recentFile.title, { pageCount, fileSize });
      addRecentFile(recentFile);
      
      // Set current paper and navigate
      setCurrentPaper(filePath);
      setLastSelectedPdfPath(filePath);
      navigate('/chat');
      
    } catch (err: any) {
      console.error('Failed to process PDF:', err);
      alert(`Failed to load PDF: ${err?.message ?? String(err)}`);
    } finally {
      setLoading(false);
      setLoadingFile(null);
    }
  }, [navigate, setCurrentPaper, setLastSelectedPdfPath, addRecentFile]);

  // Handle file selection via Tauri dialog
  const handleFileSelect = useCallback(async () => {
    console.log('[DEBUG] handleFileSelect called - opening Tauri file dialog');
    
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      console.log('[DEBUG] Tauri dialog imported successfully');
      
      const filePath = await open({ 
        multiple: false, 
        title: "Select a PDF", 
        filters: [{ name: "PDF", extensions: ["pdf"] }] 
      });
      
      console.log('[DEBUG] Dialog result:', filePath);
      
      if (typeof filePath === "string" && filePath.endsWith(".pdf")) {
        console.log('[DEBUG] Valid PDF selected, processing:', filePath);
        await processPdfFile(filePath);
      } else if (filePath) {
        console.warn('[DEBUG] Invalid file selected:', filePath);
        alert('Please select a PDF file');
      } else {
        console.log('[DEBUG] File selection cancelled by user');
      }
    } catch (err: any) {
      console.error('[DEBUG] File selection error:', err);
      alert(`Failed to select file: ${err?.message ?? String(err)}`);
    }
  }, [processPdfFile]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    console.log('[DEBUG] File dropped');
    // Note: In Tauri, drag & drop may not work the same as web
    // For now, open file dialog as fallback
    handleFileSelect();
  }, [handleFileSelect]);

  // Recent file selection
  const handleRecentFileSelect = useCallback(async (file: RecentFile) => {
    await processPdfFile(file.path);
    await cacheManager.updateLastAccessed(file.path);
  }, [processPdfFile]);

  // Remove recent file
  const handleRemoveRecentFile = useCallback(async (file: RecentFile, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent file selection when clicking delete
    
    try {
      await cacheManager.removeRecentFile(file.path);
      // Update the UI by removing from the list
      const updatedFiles = recentFiles.filter(f => f.id !== file.id);
      setRecentFiles(updatedFiles);
      console.log('[Home] Removed recent file:', file.path);
    } catch (error) {
      console.error('[Home] Failed to remove recent file:', error);
      alert('Failed to remove file from recent list');
    }
  }, [recentFiles, setRecentFiles]);

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
  const checkDownloadedPapers = useCallback(async (papers: ArxivPaper[]) => {
    const { exists } = await import("@tauri-apps/plugin-fs");
    const downloaded = new Set<string>();
    
    for (const paper of papers) {
      const filePath = getPaperFilePath(paper);
      if (filePath) {
        try {
          if (await exists(filePath)) {
            downloaded.add(paper.id);
          }
        } catch (error) {
          // File doesn't exist or error checking
        }
      }
    }
    
    setDownloadedPapers(downloaded);
  }, [getPaperFilePath]);

  // ArXiv paper download handler
  const handleArxivDownload = useCallback(async (paper: ArxivPaper) => {
    setDownloadingPaper(paper.id);
    
    try {
      const filePath = await storageManager.downloadArxivPaper(
        paper.id,
        paper.title,
        paper.pdfUrl
      );
      
      // Mark as downloaded
      setDownloadedPapers(prev => new Set(prev).add(paper.id));
      
      // Process the downloaded PDF and navigate to chat
      await processPdfFile(filePath);
      
    } catch (error: any) {
      console.error('Failed to download arXiv paper:', error);
      alert(`Failed to download paper: ${error?.message ?? 'Unknown error'}`);
    } finally {
      setDownloadingPaper(null);
    }
  }, [processPdfFile, getPaperFilePath]);

  // Handle continuing chat with an already-downloaded paper
  const handleContinueChat = useCallback(async (paper: ArxivPaper) => {
    const filePath = getPaperFilePath(paper);
    if (filePath) {
      await processPdfFile(filePath);
    }
  }, [getPaperFilePath, processPdfFile]);

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
    setSelectedCategories(prev => {
      const newCategories = prev.includes(category)
        ? prev.filter(c => c !== category)
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

  return (
    <div className="space-y-8 animate-fade-in px-6 py-4 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="text-center space-y-4 py-8">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <img src="/logo.png" alt="Logo" className="w-12 h-12" />
            <div className="absolute inset-0 w-12 h-12 bg-blue-600/20 rounded-full blur-xl"></div>
          </div>
        </div>
        
        <h1 className="text-4xl font-bold text-gradient bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          Select a Document
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Choose a PDF file to start chatting with your research papers using AI
        </p>
      </div>

      {/* Conditional Layout based on recent files */}
      {recentFiles.length === 0 ? (
        /* No Recent Files - Compact File Picker */
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-2xl p-8 border border-white/20 backdrop-blur-xl">
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 ${
                dragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              } ${loading ? 'pointer-events-none opacity-50' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={() => {
                  console.log('[DEBUG] File input onChange triggered');
                  handleFileSelect();
                }}
                className="hidden"
              />
              
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Processing PDF...</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <FolderOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      Drop your PDF here or click to browse
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Start chatting with your research papers using AI
                    </p>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('[DEBUG] Browse Files button clicked');
                      handleFileSelect();
                    }}
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Browse
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ArXiv Section when no recent files - Full Width */}
          <div className="mt-8">
            <div className="glass rounded-2xl p-6 border border-white/20 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Or browse ArXiv Papers</h2>
                  {loadingPapers && (
                    <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCategorySelector(!showCategorySelector)}
                  className="glass border-white/20 bg-white/10 backdrop-blur-xl"
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  Categories ({selectedCategories.length})
                </Button>
              </div>
              
              {/* Category Selector */}
              {showCategorySelector && (
                <div className="mb-6 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-white/20">
                  <div className="flex items-center justify-between mb-3">
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
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {Object.entries(ARXIV_CATEGORIES).map(([code, name]) => (
                      <button
                        key={code}
                        onClick={() => toggleCategory(code)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-between ${
                          selectedCategories.includes(code)
                            ? 'bg-orange-500 text-white'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-gray-600'
                        }`}
                      >
                        <span className="truncate">{name}</span>
                        {selectedCategories.includes(code) && (
                          <Check className="w-4 h-4 ml-1 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search papers by title, author, or category..."
                  value={arxivQuery}
                  onChange={(e) => setArxivQuery(e.target.value)}
                  className="pl-10 glass border-white/20 bg-white/10 backdrop-blur-xl"
                  disabled={loadingPapers}
                />
              </div>

              {/* Error Message */}
              {papersError && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-800 dark:text-red-200">{papersError}</p>
                </div>
              )}

              {/* Papers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[200px]">
                {loadingPapers && filteredPapers.length === 0 ? (
                  <div className="col-span-full flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-300">Loading papers from ArXiv...</p>
                    </div>
                  </div>
                ) : filteredPapers.length === 0 ? (
                  <div className="col-span-full flex items-center justify-center py-12">
                    <div className="text-center">
                      <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-300">
                        {arxivQuery ? 'No papers found. Try a different search.' : 'No papers available.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  filteredPapers.map((paper) => (
                  <div
                    key={paper.id}
                    className={`p-4 border border-white/20 rounded-xl hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-900/20 transition-all duration-200 group ${
                      downloadingPaper === paper.id ? 'opacity-75' : ''
                    }`}
                  >
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2 mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400">
                      {paper.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                      <strong>Authors:</strong> {paper.authors}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                      {paper.abstract}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500">
                          {new Date(paper.publishedDate).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-orange-600 font-medium">
                          {paper.category}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadedPapers.has(paper.id) ? handleContinueChat(paper) : handleArxivDownload(paper)}
                        disabled={downloadingPaper === paper.id || loading}
                        className="text-xs h-7 px-3 glass border-white/20 bg-white/10 backdrop-blur-xl hover:bg-orange-50 dark:hover:bg-orange-900/30 disabled:opacity-50"
                      >
                        {downloadingPaper === paper.id ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Downloading...
                          </>
                        ) : downloadedPapers.has(paper.id) ? (
                          <>
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Continue Chat
                          </>
                        ) : (
                          <>
                            <Download className="w-3 h-3 mr-1" />
                            Download & Chat
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  ))
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-white/20">
                <p className="text-xs text-gray-500 text-center">
                  💡 Papers will be saved to your {storageManager.getStoragePath()?.includes('iBooks') ? 'iBooks library' : 'Documents folder'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Has Recent Files - Stacked Layout */
        <div className="space-y-6">
          {/* Recent Files - Full Width */}
          <div className="glass rounded-2xl p-6 border border-white/20 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Files</h2>
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                {recentFiles.length}
              </span>
            </div>

            {/* Recent files grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {recentFiles.map((file) => (
                <div
                  key={file.id}
                  className={`relative p-4 border border-white/20 rounded-xl cursor-pointer transition-all duration-200 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 group ${
                    loadingFile === file.path ? 'opacity-50 pointer-events-none' : ''
                  }`}
                  onClick={() => handleRecentFileSelect(file)}
                >
                  {/* Delete button - top right corner */}
                  <button
                    onClick={(e) => handleRemoveRecentFile(file, e)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-200 dark:hover:border-red-800"
                    title="Remove from recent"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
                  </button>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-base line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 mb-1">
                        {file.title || file.path.split('/').pop() || 'Untitled'}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        {file.pageCount && <span>{file.pageCount} pages</span>}
                        {file.fileSize && <span>• {formatFileSize(file.fileSize)}</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{formatDate(file.lastAccessed)}</div>
                    </div>
                    {loadingFile === file.path && (
                      <Loader2 className="w-5 h-5 text-emerald-500 animate-spin flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}

              {/* Compact File Uploader Card */}
              <div
                className={`p-4 border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 flex items-center justify-center ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                } ${loading ? 'pointer-events-none opacity-50' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={() => {
                    console.log('[DEBUG] File input onChange triggered (compact view)');
                    handleFileSelect();
                  }}
                  className="hidden"
                />
                
                <div className="text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm mb-1">Add PDF</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">Drop or browse</p>
                </div>
              </div>
            </div>
          </div>

          {/* ArXiv Browser - Full Width */}
          <div className="glass rounded-2xl p-6 border border-white/20 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Latest ArXiv Papers</h2>
                {loadingPapers && (
                  <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCategorySelector(!showCategorySelector)}
                className="glass border-white/20 bg-white/10 backdrop-blur-xl"
              >
                <Settings2 className="w-4 h-4 mr-2" />
                Categories ({selectedCategories.length})
              </Button>
            </div>
            
            {/* Category Selector */}
            {showCategorySelector && (
              <div className="mb-6 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-white/20">
                <div className="flex items-center justify-between mb-3">
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
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {Object.entries(ARXIV_CATEGORIES).map(([code, name]) => (
                    <button
                      key={code}
                      onClick={() => toggleCategory(code)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-between ${
                        selectedCategories.includes(code)
                          ? 'bg-orange-500 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span className="truncate">{name}</span>
                      {selectedCategories.includes(code) && (
                        <Check className="w-4 h-4 ml-1 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search papers by title, author, or category..."
                value={arxivQuery}
                onChange={(e) => setArxivQuery(e.target.value)}
                className="pl-10 glass border-white/20 bg-white/10 backdrop-blur-xl"
                disabled={loadingPapers}
              />
            </div>

            {/* Error Message */}
            {papersError && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-200">{papersError}</p>
              </div>
            )}

            {/* Papers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[300px]">
              {loadingPapers && filteredPapers.length === 0 ? (
                <div className="col-span-full flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300">Loading latest papers from ArXiv...</p>
                  </div>
                </div>
              ) : filteredPapers.length === 0 ? (
                <div className="col-span-full flex items-center justify-center py-12">
                  <div className="text-center">
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300">
                      {arxivQuery ? 'No papers found. Try a different search.' : 'No papers available.'}
                    </p>
                  </div>
                </div>
              ) : (
                filteredPapers.map((paper) => (
                  <div
                    key={paper.id}
                    className={`p-4 border border-white/20 rounded-xl hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-900/20 transition-all duration-200 group flex flex-col ${
                      downloadingPaper === paper.id ? 'opacity-75' : ''
                    }`}
                  >
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2 mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400">
                      {paper.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 line-clamp-1">
                      <strong>Authors:</strong> {paper.authors}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-3 flex-grow">
                      {paper.abstract}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500">
                          {new Date(paper.publishedDate).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-orange-600 font-medium">
                          {paper.category}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadedPapers.has(paper.id) ? handleContinueChat(paper) : handleArxivDownload(paper)}
                        disabled={downloadingPaper === paper.id || loading}
                        className="text-xs h-7 px-3 glass border-white/20 bg-white/10 backdrop-blur-xl hover:bg-orange-50 dark:hover:bg-orange-900/30 disabled:opacity-50"
                      >
                        {downloadingPaper === paper.id ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Downloading...
                          </>
                        ) : downloadedPapers.has(paper.id) ? (
                          <>
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Continue Chat
                          </>
                        ) : (
                          <>
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/20">
              <p className="text-xs text-gray-500 text-center">
                💡 Papers will be saved to your {storageManager.getStoragePath()?.includes('iBooks') ? 'iBooks library' : 'Documents folder'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};