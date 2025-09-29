import React, { useCallback, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store";
import { extractPdfFromPathWithMeta } from "../lib/pdf";
import { cacheManager } from "../lib/cache";
import { storageManager } from "../lib/storage";
import type { RecentFile } from "../lib/cache";
import { 
  FileText, 
  Upload, 
  Search,
  Clock,
  BookOpen,
  Download,
  Loader2,
  FolderOpen,
  Sparkles
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

// Mock ArXiv data
const mockArxivPapers = [
  {
    id: "2301.07041",
    title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
    authors: "Jason Wei, Xuezhi Wang, Dale Schuurmans",
    category: "Machine Learning",
    publishedDate: "2023-01-17",
    abstract: "We explore how generating a chain of thought—a series of intermediate reasoning steps—significantly improves the ability of large language models to perform complex reasoning...",
    downloadUrl: "https://arxiv.org/pdf/2301.07041.pdf"
  },
  {
    id: "2305.10403", 
    title: "Tree of Thoughts: Deliberate Problem Solving with Large Language Models",
    authors: "Shunyu Yao, Dian Yu, Jeffrey Zhao",
    category: "Artificial Intelligence",
    publishedDate: "2023-05-17",
    abstract: "Language models are increasingly being deployed for general problem solving across a wide range of tasks, but are still confined to token-level, left-to-right decision-making processes...",
    downloadUrl: "https://arxiv.org/pdf/2305.10403.pdf"
  },
  {
    id: "2303.08774",
    title: "GPT-4 Technical Report", 
    authors: "OpenAI",
    category: "Machine Learning",
    publishedDate: "2023-03-15",
    abstract: "We report the development of GPT-4, a large-scale, multimodal model which can accept image and text inputs and produce text outputs...",
    downloadUrl: "https://arxiv.org/pdf/2303.08774.pdf"
  }
];

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
  const [filteredPapers, setFilteredPapers] = useState(mockArxivPapers);
  const [downloadingPaper, setDownloadingPaper] = useState<string | null>(null);

  // Load recent files and initialize storage on mount
  React.useEffect(() => {
    const initialize = async () => {
      try {
        await cacheManager.initialize();
        await storageManager.initialize();
        const cachedFiles = cacheManager.getRecentFiles().slice(0, 5); // Limit to 5
        setRecentFiles(cachedFiles);
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    };
    initialize();
  }, [setRecentFiles]);

  // Filter ArXiv papers based on search
  React.useEffect(() => {
    if (!arxivQuery.trim()) {
      setFilteredPapers(mockArxivPapers);
    } else {
      const filtered = mockArxivPapers.filter(paper => 
        paper.title.toLowerCase().includes(arxivQuery.toLowerCase()) ||
        paper.authors.toLowerCase().includes(arxivQuery.toLowerCase()) ||
        paper.category.toLowerCase().includes(arxivQuery.toLowerCase())
      );
      setFilteredPapers(filtered);
    }
  }, [arxivQuery]);

  // Process PDF file and navigate to chat
  const processPdfFile = useCallback(async (filePath: string) => {
    setLoading(true);
    setLoadingFile(filePath);
    
    try {
      const result = await extractPdfFromPathWithMeta(filePath);
      const { title, pageCount, fileSize } = result;
      
      // Add to recent files
      const recentFile: RecentFile = {
        id: btoa(filePath).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16),
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

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please select a PDF file');
      return;
    }
    
    // For Tauri, we need to get the file path
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const filePath = await open({ 
        multiple: false, 
        title: "Select a PDF", 
        filters: [{ name: "PDF", extensions: ["pdf"] }] 
      });
      
      if (typeof filePath === "string" && filePath.endsWith(".pdf")) {
        await processPdfFile(filePath);
      }
    } catch (err: any) {
      console.error('File selection error:', err);
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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  // Recent file selection
  const handleRecentFileSelect = useCallback(async (file: RecentFile) => {
    await processPdfFile(file.path);
    await cacheManager.updateLastAccessed(file.path);
  }, [processPdfFile]);

  // ArXiv paper download handler
  const handleArxivDownload = useCallback(async (paper: typeof mockArxivPapers[0]) => {
    setDownloadingPaper(paper.id);
    
    try {
      const filePath = await storageManager.downloadArxivPaper(
        paper.id,
        paper.title,
        paper.downloadUrl
      );
      
      // Process the downloaded PDF and navigate to chat
      await processPdfFile(filePath);
      
    } catch (error: any) {
      console.error('Failed to download arXiv paper:', error);
      alert(`Failed to download paper: ${error?.message ?? 'Unknown error'}`);
    } finally {
      setDownloadingPaper(null);
    }
  }, [processPdfFile]);

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

  return (
    <div className="space-y-8 animate-fade-in p-4">
      {/* Header */}
      <div className="text-center space-y-4 py-8">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Sparkles className="w-12 h-12 text-blue-600 animate-glow" />
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
        /* No Recent Files - Full Width Big Dropzone */
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-2xl p-12 border border-white/20 backdrop-blur-xl">
            <div
              className={`relative border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 ${
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
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              
              {loading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                  <div>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Processing PDF...</p>
                    <p className="text-gray-600 dark:text-gray-300">Preparing your document for AI chat</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center">
                    <FolderOpen className="w-12 h-12 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                      Drop your PDF here to get started
                    </p>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                      or click anywhere to browse and select a file
                    </p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg"
                    >
                      <Upload className="w-5 h-5 mr-2" />
                      Browse Files
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ArXiv Section when no recent files */}
          <div className="mt-8">
            <div className="glass rounded-2xl p-6 border border-white/20 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Or browse ArXiv Papers</h2>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search papers by title, author, or category..."
                  value={arxivQuery}
                  onChange={(e) => setArxivQuery(e.target.value)}
                  className="pl-10 glass border-white/20 bg-white/10 backdrop-blur-xl"
                />
              </div>

              {/* Papers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPapers.map((paper) => (
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
                        onClick={() => handleArxivDownload(paper)}
                        disabled={downloadingPaper === paper.id || loading}
                        className="text-xs h-7 px-3 glass border-white/20 bg-white/10 backdrop-blur-xl hover:bg-orange-50 dark:hover:bg-orange-900/30 disabled:opacity-50"
                      >
                        {downloadingPaper === paper.id ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Downloading...
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
                ))}
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
        /* Has Recent Files - Compact Layout */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Recent Files - Takes up 2 columns */}
          <div className="lg:col-span-2">
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

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => handleRecentFileSelect(file)}
                    className={`p-4 border border-white/20 rounded-xl cursor-pointer transition-all duration-200 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 group ${
                      loadingFile === file.path ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-base line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 mb-1">
                          {file.title || file.path.split('/').pop() || 'Untitled'}
                        </h4>
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                          {file.pageCount && <span>{file.pageCount} pages</span>}
                          {file.fileSize && <span>{formatFileSize(file.fileSize)}</span>}
                          <span>{formatDate(file.lastAccessed)}</span>
                        </div>
                      </div>
                      {loadingFile === file.path && (
                        <Loader2 className="w-5 h-5 text-emerald-500 animate-spin flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}

                {/* Compact File Uploader at the end */}
                <div className="border-t border-white/20 pt-4 mt-4">
                  <div
                    className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 ${
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
                      onChange={(e) => handleFileSelect(e.target.files)}
                      className="hidden"
                    />
                    
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <Upload className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Add another PDF</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Drop here or click to browse</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ArXiv Browser - Takes up 2 columns */}
          <div className="lg:col-span-2">
            <div className="glass rounded-2xl p-6 border border-white/20 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">ArXiv Papers</h2>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search papers..."
                  value={arxivQuery}
                  onChange={(e) => setArxivQuery(e.target.value)}
                  className="pl-10 glass border-white/20 bg-white/10 backdrop-blur-xl"
                />
              </div>

              {/* Papers List */}
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {filteredPapers.map((paper) => (
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
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
                        onClick={() => handleArxivDownload(paper)}
                        disabled={downloadingPaper === paper.id || loading}
                        className="text-xs h-7 px-3 glass border-white/20 bg-white/10 backdrop-blur-xl hover:bg-orange-50 dark:hover:bg-orange-900/30 disabled:opacity-50"
                      >
                        {downloadingPaper === paper.id ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Downloading...
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
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-xs text-gray-500 text-center">
                  💡 Papers will be saved to your {storageManager.getStoragePath()?.includes('iBooks') ? 'iBooks library' : 'Documents folder'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};