import {
  Bot,
  FileText,
  Home,
  Loader2,
  MessageSquare,
  Send,
  Settings,
  Sparkles,
  User,
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { PDFViewer } from '../components/PDFViewer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { ToastContainer, useToast } from '../components/ui/toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { cacheManager } from '../lib/cache';
import { hybridRAG, type HybridRagIndex } from '../lib/hybrid-rag';
import { buildPrompt, chatComplete, listOllamaModels } from '../lib/llm';
import { loggers } from '../lib/logger';
import { extractPdfFromPathWithMeta } from '../lib/pdf';
import { generateFileId } from '../lib/utils';
import { useAppStore } from '../store';

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const { addToast, toasts, removeToast } = useToast();
  const log = loggers.chat;

  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const setCurrentPaper = useAppStore((s) => s.setCurrentPaper);
  const chatHistory = useAppStore((s) => s.chatHistory);
  const currentPaper = useAppStore((s) => s.currentPaper);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);
  const lastSelectedPdfPath = useAppStore((s) => s.lastSelectedPdfPath);
  const setLastSelectedPdfPath = useAppStore((s) => s.setLastSelectedPdfPath);
  const addRecentFile = useAppStore((s) => s.addRecentFile);
  const recentFiles = useAppStore((s) => s.recentFiles);
  const chatSeparatorPosition = useAppStore((s) => s.chatSeparatorPosition);
  const setChatSeparatorPosition = useAppStore((s) => s.setChatSeparatorPosition);

  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [index, setIndex] = useState<HybridRagIndex | null>(null);
  const [question, setQuestion] = useState('');
  const [meta, setMeta] = useState<{
    pages: number;
    chars: number;
    hasSemanticIndex: boolean;
  } | null>(null);
  const [leftWidth, setLeftWidth] = useState(chatSeparatorPosition); // Percentage for left column
  const [isDragging, setIsDragging] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Reference for chat messages container to enable auto-scroll
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const messages = useMemo(() => {
    if (!currentPaper)
      return [] as { role: 'user' | 'assistant'; content: string; timestamp: number }[];
    const chat = chatHistory.find((c) => c.paperId === currentPaper);
    return chat?.messages ?? [];
  }, [chatHistory, currentPaper]);

  // Sync local state with store when chatSeparatorPosition changes
  React.useEffect(() => {
    setLeftWidth(chatSeparatorPosition);
  }, [chatSeparatorPosition]);

  // Fetch available Ollama models on mount
  React.useEffect(() => {
    const fetchModels = async () => {
      setLoadingModels(true);
      try {
        log('Fetching available Ollama models...');
        const models = await listOllamaModels();
        log('Available models:', models);
        setAvailableModels(models);

        // Set default model if current selection is empty or not in the list
        if (models.length > 0 && (!selectedModel || !models.includes(selectedModel))) {
          const defaultModel = models.find((m) => m.includes('llama')) || models[0];
          setSelectedModel(defaultModel);
          log('Set default model:', defaultModel);
        }
      } catch (error) {
        log('Failed to fetch Ollama models:', error);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, [log, selectedModel, setSelectedModel]); // Fixed dependency array

  const loadPdf = useCallback(
    async (pathToLoad: string, existingTitle?: string) => {
      if (!pathToLoad) {
        log('No path provided to loadPdf');
        return;
      }

      setLoading(true);
      try {
        log('Loading PDF from path:', pathToLoad);

        // Validate that this is a PDF path, not a vector storage path
        if (pathToLoad.includes('.cache/redink/vectors')) {
          log('Invalid path - this is a vector storage path, not a PDF path');
          addToast({
            type: 'error',
            title: 'Invalid File Path',
            message: 'Please select a valid PDF file.',
          });
          return;
        }

        // Extract PDF text
        log('Extracting PDF text...');
        const result = await extractPdfFromPathWithMeta(pathToLoad);
        const { text, pageCount, charCount, title, fileSize } = result;

        log('PDF extracted:', { pageCount, charCount, titleLength: title?.length });

        // Generate document ID from path (stable identifier) using hash function
        const documentId = generateFileId(pathToLoad);
        log('Document ID:', documentId);

        // Build hybrid RAG index
        log('Building hybrid RAG index...');
        const idx = await hybridRAG.buildIndex(documentId, text, {
          chunkStrategy: 'semantic',
          forceRebuild: false, // Use cache if available
        });

        setIndex(idx);
        setMeta({
          pages: pageCount,
          chars: charCount,
          hasSemanticIndex: idx.hasSemanticIndex,
        });

        // Store the actual PDF path, not the document ID or vector path
        setCurrentPaper(pathToLoad);
        setLastSelectedPdfPath(pathToLoad);

        log('Index created successfully:', {
          chunks: idx.metadata.chunkCount,
          hasSemanticIndex: idx.hasSemanticIndex,
          model: idx.metadata.embeddingModel,
          pdfPath: pathToLoad,
        });

        // Use existing title if provided, otherwise use extracted title, then fallback to filename
        const preferredTitle = existingTitle || title || pathToLoad.split('/').pop() || 'Untitled';

        // Add to recent files cache
        const recentFile = {
          id: documentId,
          path: pathToLoad, // This is the actual PDF path
          title: preferredTitle,
          lastAccessed: Date.now(),
          addedDate: Date.now(),
          pageCount,
          fileSize,
        };

        // Update both cache manager and store
        await cacheManager.addRecentFile(pathToLoad, recentFile.title, { pageCount, fileSize });
        addRecentFile(recentFile);
      } catch (err: unknown) {
        log('Failed to load PDF:', err);
        log('Error details:', {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          path: pathToLoad,
        });
        addToast({
          type: 'error',
          title: 'Failed to load PDF',
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setLoading(false);
      }
    },
    [addToast, log, setCurrentPaper, setLastSelectedPdfPath, addRecentFile],
  );

  // Check if file exists helper function
  const checkFileExists = useCallback(async (filePath: string): Promise<boolean> => {
    try {
      const { exists } = await import('@tauri-apps/plugin-fs');
      return await exists(filePath);
    } catch {
      return false;
    }
  }, []);

  // Auto-load last selected PDF on component mount or when currentPaper changes
  React.useEffect(() => {
    const autoLoadLastPdf = async () => {
      const pathToLoad = currentPaper || lastSelectedPdfPath;

      // Check if we need to load/reload the PDF
      // Generate documentId from path to compare with current index
      const documentId = pathToLoad ? generateFileId(pathToLoad) : null;
      // Load if: we have a path AND (no index OR index is for a different document)
      const needsLoad =
        pathToLoad && (!index || (index && documentId && index.documentId !== documentId));
      const shouldLoad = needsLoad && !loading && !autoLoading;

      if (shouldLoad && pathToLoad) {
        // Validate path before attempting to load
        if (pathToLoad.includes('.cache/redink/vectors')) {
          log('Invalid path in store - clearing:', pathToLoad);
          setCurrentPaper(null);
          setLastSelectedPdfPath(null);
          navigate('/');
          return;
        }

        setAutoLoading(true);
        try {
          log('Auto-loading PDF from path:', pathToLoad);
          const fileExists = await checkFileExists(pathToLoad);
          if (fileExists) {
            log('Auto-loading PDF for text extraction:', pathToLoad);
            // Find existing title from recent files to preserve clean titles
            const existingFile = recentFiles.find((f) => f.path === pathToLoad);
            await loadPdf(pathToLoad, existingFile?.title);
          } else {
            log('PDF file no longer exists:', pathToLoad);
            // Clear the invalid path and redirect to home
            setCurrentPaper(null);
            setLastSelectedPdfPath(null);
            navigate('/');
          }
        } catch (error) {
          log('Error in auto-load:', error);
          setCurrentPaper(null);
          setLastSelectedPdfPath(null);
          navigate('/');
        } finally {
          setAutoLoading(false);
        }
      } else if (!lastSelectedPdfPath && !currentPaper) {
        // No PDF loaded, redirect to home
        navigate('/');
      }
    };

    autoLoadLastPdf();
  }, [
    lastSelectedPdfPath,
    currentPaper,
    index,
    loading,
    autoLoading,
    checkFileExists,
    loadPdf,
    setCurrentPaper,
    setLastSelectedPdfPath,
    navigate,
    recentFiles,
    log,
  ]);

  const send = useCallback(async () => {
    if (!currentPaper || !index || !question.trim() || sending) return;
    const q = question.trim();
    setQuestion('');
    setSending(true);
    addChatMessage(currentPaper, 'user', q);

    try {
      log('Searching for:', q);

      // Use hybrid RAG search
      const results = await hybridRAG.search(index.documentId, q, {
        topK: 5,
        tfidfWeight: 0.4,
        semanticWeight: 0.6,
        fusionMethod: 'weighted',
      });

      log('Search results:', results.length);

      // Extract context from results
      const contexts = results.map((r) => r.chunk.text);

      // Build prompt and get answer
      const prompt = buildPrompt(q, contexts);
      const answer = await chatComplete(prompt, { provider: 'ollama', model: selectedModel });

      addChatMessage(currentPaper, 'assistant', answer);
    } catch (err: unknown) {
      log('Error:', err);
      addChatMessage(
        currentPaper,
        'assistant',
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSending(false);
    }
  }, [addChatMessage, currentPaper, index, question, selectedModel, sending, log]);

  // Handle resize dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection from starting
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        const containerWidth = window.innerWidth - 48; // Account for padding
        const newLeftWidth = (e.clientX / containerWidth) * 100;
        // Clamp between 30% and 70%
        const clampedWidth = Math.min(Math.max(newLeftWidth, 30), 70);
        setLeftWidth(clampedWidth);
      }
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    // Save the final position to store when drag ends
    setChatSeparatorPosition(leftWidth);
    log('Saved separator position:', leftWidth);
  }, [leftWidth, setChatSeparatorPosition, log]);

  // Prevent selection event during drag
  const preventSelection = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  // Add/remove mouse event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      // Prevent text selection while dragging - use multiple approaches for reliability
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      document.body.style.cursor = 'col-resize';
      // Also add a class to prevent pointer events on child elements
      document.body.classList.add('dragging-separator');

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      // Prevent selection during drag
      window.addEventListener('selectstart', preventSelection);

      return () => {
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        document.body.style.cursor = '';
        document.body.classList.remove('dragging-separator');
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('selectstart', preventSelection);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, preventSelection]);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Get document title for display - look up in recentFiles first, fallback to filename
  const documentTitle = useMemo(() => {
    if (!currentPaper) return 'No Document';

    // Try to find the title from recent files
    const recentFile = recentFiles.find((f) => f.path === currentPaper);
    if (recentFile?.title) {
      return recentFile.title;
    }

    // Fallback to extracting from filename
    return currentPaper.split('/').pop()?.replace('.pdf', '') || 'Document';
  }, [currentPaper, recentFiles]);

  if (autoLoading) {
    return (
      <div className="animate-fade-in flex h-[calc(100vh-48px)] flex-col items-center justify-center">
        <div className="glass rounded-lg border border-white/20 p-8 text-center backdrop-blur-xl">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-500" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            Loading Document
          </h3>
          <p className="text-gray-600 dark:text-gray-300">Processing your PDF for AI chat...</p>
        </div>
      </div>
    );
  }

  if (!currentPaper) {
    return (
      <div className="animate-fade-in flex h-[calc(100vh-48px)] flex-col items-center justify-center">
        <div className="glass max-w-md rounded-lg border border-white/20 p-8 text-center backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            No Document Selected
          </h3>
          <p className="mb-4 text-gray-600 dark:text-gray-300">
            Please select a PDF document to start chatting.
          </p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => navigate('/')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Select Document
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Go to home page to select a PDF</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto h-[calc(100vh-48px)] max-w-full py-4" style={{ minHeight: '600px' }}>
      {/* Header - Fixed height to prevent layout shift */}
      <div
        className="mb-4 flex flex-shrink-0 items-center justify-between"
        style={{ minHeight: '60px' }}
      >
        <div className="flex items-center gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/')}
                  className="p-0 transition-all duration-300 hover:bg-white/20"
                >
                  <img src="/logo.png" alt="Home" className="size-16" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Return to Home</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-3">
            <div style={{ minWidth: '200px' }}>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{documentTitle}</h1>
              <div style={{ minHeight: '20px' }}>
                {meta && (
                  <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span>
                      {meta.pages} pages • {(meta.chars / 1000).toFixed(1)}k chars •{' '}
                      {index?.chunks.length ?? 0} chunks
                    </span>
                    {meta.hasSemanticIndex && (
                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <Sparkles className="h-3 w-3" />
                        <span className="text-xs">Hybrid RAG</span>
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Model Configuration - Fixed dimensions to prevent layout shift */}
        <div className="flex items-center gap-2" style={{ minWidth: '280px' }}>
          <Settings className="h-4 w-4 text-gray-400" />
          <Select value={selectedModel} onValueChange={setSelectedModel} disabled={loadingModels}>
            <SelectTrigger className="glass h-10 w-64 border-white/20 bg-white/10 text-sm text-gray-900 backdrop-blur-xl hover:border-white/30 dark:text-white">
              <SelectValue placeholder={loadingModels ? 'Loading models...' : 'Select a model'} />
            </SelectTrigger>
            <SelectContent className="glass border-white/20 bg-white/95 backdrop-blur-xl dark:bg-gray-800/95 dark:text-white">
              {availableModels.length === 0 && !loadingModels ? (
                <SelectItem value="no-models" disabled className="dark:text-gray-400">
                  No models available
                </SelectItem>
              ) : (
                availableModels.map((model) => (
                  <SelectItem
                    key={model}
                    value={model}
                    className="cursor-pointer dark:text-white dark:focus:bg-gray-700"
                  >
                    {model}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Two Column Layout with Resizable Split - Fixed dimensions to prevent layout shift */}
      <div className="relative flex h-[calc(100%-72px)] gap-0" style={{ minHeight: '500px' }}>
        {/* Left Column - PDF Viewer - Fixed dimensions during transitions */}
        <div
          className="h-full overflow-hidden"
          style={{
            width: `${leftWidth}%`,
            minWidth: '200px',
            transition: isDragging ? 'none' : 'width 0.2s ease-out',
          }}
        >
          <PDFViewer filePath={currentPaper} className="h-full" />
        </div>

        {/* Resize Handle - Fixed dimensions */}
        <div
          role="separator"
          aria-label="Resize panels"
          tabIndex={0}
          className="my-2 w-1.5 flex-shrink-0 cursor-col-resize rounded-sm bg-transparent hover:bg-blue-500"
          onMouseDown={handleMouseDown}
        />

        {/* Right Column - Chat Interface - Fixed dimensions during transitions */}
        <div
          className="flex h-full min-h-0 flex-col"
          style={{
            width: `${100 - leftWidth}%`,
            minWidth: '200px',
            transition: isDragging ? 'none' : 'width 0.2s ease-out',
          }}
        >
          {/* Chat Messages Area - Fixed dimensions to prevent layout shift */}
          <div
            className="glass mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-white/20 backdrop-blur-xl"
            style={{ minHeight: '300px' }}
          >
            <div
              className="flex-shrink-0 rounded-t-2xl border-b border-white/20 bg-gradient-to-r from-blue-50/50 to-purple-50/50 p-4 dark:from-blue-900/20 dark:to-purple-900/20"
              style={{ minHeight: '80px' }}
            >
              <h3 className="font-semibold text-gray-900 dark:text-white">AI Conversation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Ask questions about your research paper
              </p>
            </div>

            <div
              className="min-h-0 flex-1 space-y-4 overflow-auto p-6"
              style={{ minHeight: '200px' }}
            >
              {messages.length === 0 && index && (
                <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                    <MessageSquare className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                      Ready to chat!
                    </h3>
                    <p className="max-w-md text-gray-600 dark:text-gray-300">
                      Your document has been processed. Ask me anything about the content,
                      methodology, findings, or any specific details you'd like to explore.
                    </p>
                  </div>
                </div>
              )}

              {messages.length === 0 && !index && loading && (
                <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                      Processing Document
                    </h3>
                    <p className="max-w-md text-gray-600 dark:text-gray-300">
                      Analyzing your PDF and preparing it for AI conversation...
                    </p>
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                      m.role === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                    }`}
                  >
                    {m.role === 'user' ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-white" />
                    )}
                  </div>

                  {/* Message */}
                  <div
                    className={`max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}
                  >
                    <div
                      className={`animate-fade-in rounded-lg px-4 py-3 shadow-sm ${
                        m.role === 'user'
                          ? 'rounded-tr-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                          : 'glass rounded-tl-lg border border-white/20 text-gray-900 dark:text-white'
                      }`}
                    >
                      {m.role === 'assistant' ? (
                        <div className="markdown-content">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                          >
                            {m.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                    <span className="px-2 text-xs text-gray-500">
                      {new Date(m.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="glass rounded-lg rounded-tl-lg border border-white/20 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Invisible div for auto-scroll */}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input - Fixed dimensions to prevent layout shift */}
          <div
            className="glass flex-shrink-0 rounded-lg border border-white/20 p-4 backdrop-blur-xl"
            style={{ minHeight: '80px' }}
          >
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Input
                  placeholder={index ? 'Ask about the paper...' : 'Processing document...'}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  disabled={!index || sending || loading}
                  className="glass border-white/20 bg-white/10 backdrop-blur-xl"
                  style={{ minHeight: '40px' }}
                />
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={send}
                      disabled={!index || !question.trim() || sending || loading}
                      className="border-0 bg-gradient-to-r from-blue-600 to-purple-600 px-6 text-white transition-all duration-300 hover:scale-105 hover:from-blue-700 hover:to-purple-700"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Send message (Enter)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export { Chat };
