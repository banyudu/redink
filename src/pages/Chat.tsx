import React, { useCallback, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useAppStore } from "../store";
import { generateFileId } from "../lib/utils";
import { extractPdfFromPathWithMeta } from "../lib/pdf";
import { hybridRAG, type HybridRagIndex } from "../lib/hybrid-rag";
import { buildPrompt, chatComplete, listOllamaModels } from "../lib/llm";
import { cacheManager } from "../lib/cache";
import { PDFViewer } from "../components/PDFViewer";
import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Settings, 
  MessageSquare,
  ArrowLeft,
  Home,
  Sparkles
} from "lucide-react";

const Chat: React.FC = () => {
  const navigate = useNavigate();
  
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const setCurrentPaper = useAppStore((s) => s.setCurrentPaper);
  const chatHistory = useAppStore((s) => s.chatHistory);
  const currentPaper = useAppStore((s) => s.currentPaper);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);
  const lastSelectedPdfPath = useAppStore((s) => s.lastSelectedPdfPath);
  const setLastSelectedPdfPath = useAppStore((s) => s.setLastSelectedPdfPath);
  const addRecentFile = useAppStore((s) => s.addRecentFile);
  const chatSeparatorPosition = useAppStore((s) => s.chatSeparatorPosition);
  const setChatSeparatorPosition = useAppStore((s) => s.setChatSeparatorPosition);

  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [index, setIndex] = useState<HybridRagIndex | null>(null);
  const [question, setQuestion] = useState("");
  const [meta, setMeta] = useState<{ pages: number; chars: number; hasSemanticIndex: boolean } | null>(null);
  const [leftWidth, setLeftWidth] = useState(chatSeparatorPosition); // Percentage for left column
  const [isDragging, setIsDragging] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  
  // Reference for chat messages container to enable auto-scroll
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const messages = useMemo(() => {
    if (!currentPaper) return [] as { role: "user" | "assistant"; content: string; timestamp: number }[];
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
        console.log('[Chat] Fetching available Ollama models...');
        const models = await listOllamaModels();
        console.log('[Chat] Available models:', models);
        setAvailableModels(models);
        
        // Set default model if current selection is empty or not in the list
        if (models.length > 0 && (!selectedModel || !models.includes(selectedModel))) {
          const defaultModel = models.find(m => m.includes('llama')) || models[0];
          setSelectedModel(defaultModel);
          console.log('[Chat] Set default model:', defaultModel);
        }
      } catch (error) {
        console.error('[Chat] Failed to fetch Ollama models:', error);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, []); // Run only on mount

  const loadPdf = useCallback(async (pathToLoad: string) => {
    if (!pathToLoad) {
      console.error('[Chat] No path provided to loadPdf');
      return;
    }
    
    setLoading(true);
    try {
      console.log('[Chat] Loading PDF from path:', pathToLoad);
      
      // Validate that this is a PDF path, not a vector storage path
      if (pathToLoad.includes('.cache/redink/vectors')) {
        console.error('[Chat] Invalid path - this is a vector storage path, not a PDF path');
        alert('Error: Invalid file path. Please select a valid PDF file.');
        return;
      }
      
      // Extract PDF text
      console.log('[Chat] Extracting PDF text...');
      const result = await extractPdfFromPathWithMeta(pathToLoad);
      const { text, pageCount, charCount, title, fileSize } = result;
      
      console.log('[Chat] PDF extracted:', { pageCount, charCount, titleLength: title?.length });
      
      // Generate document ID from path (stable identifier) using hash function
      const documentId = generateFileId(pathToLoad);
      console.log('[Chat] Document ID:', documentId);
      
      // Build hybrid RAG index
      console.log('[Chat] Building hybrid RAG index...');
      const idx = await hybridRAG.buildIndex(documentId, text, {
        chunkStrategy: 'semantic',
        forceRebuild: false, // Use cache if available
      });
      
      setIndex(idx);
      setMeta({ 
        pages: pageCount, 
        chars: charCount,
        hasSemanticIndex: idx.hasSemanticIndex
      });
      
      // Store the actual PDF path, not the document ID or vector path
      setCurrentPaper(pathToLoad);
      setLastSelectedPdfPath(pathToLoad);
      
      console.log('[Chat] Index created successfully:', {
        chunks: idx.metadata.chunkCount,
        hasSemanticIndex: idx.hasSemanticIndex,
        model: idx.metadata.embeddingModel,
        pdfPath: pathToLoad
      });
      
      // Add to recent files cache
      const recentFile = {
        id: documentId,
        path: pathToLoad, // This is the actual PDF path
        title: title || pathToLoad.split('/').pop() || 'Untitled',
        lastAccessed: Date.now(),
        addedDate: Date.now(),
        pageCount,
        fileSize
      };
      
      // Update both cache manager and store
      await cacheManager.addRecentFile(pathToLoad, recentFile.title, { pageCount, fileSize });
      addRecentFile(recentFile);
      
    } catch (err: any) {
      console.error('[Chat] Failed to load PDF:', err);
      console.error('[Chat] Error details:', {
        message: err?.message,
        stack: err?.stack,
        path: pathToLoad
      });
      alert(`Failed to load PDF: ${err?.message ?? String(err)}\n\nPath: ${pathToLoad}`);
    } finally {
      setLoading(false);
    }
  }, [setCurrentPaper, setLastSelectedPdfPath, addRecentFile]);

  // Check if file exists helper function
  const checkFileExists = useCallback(async (filePath: string): Promise<boolean> => {
    try {
      const { exists } = await import("@tauri-apps/plugin-fs");
      return await exists(filePath);
    } catch (error) {
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
      const needsLoad = pathToLoad && (!index || (index && documentId && index.documentId !== documentId));
      const shouldLoad = needsLoad && !loading && !autoLoading;
      
      if (shouldLoad && pathToLoad) {
        // Validate path before attempting to load
        if (pathToLoad.includes('.cache/redink/vectors')) {
          console.error('[Chat] Invalid path in store - clearing:', pathToLoad);
          setCurrentPaper(null);
          setLastSelectedPdfPath(null);
          navigate('/');
          return;
        }
        
        setAutoLoading(true);
        try {
          console.log('[Chat] Auto-loading PDF from path:', pathToLoad);
          const fileExists = await checkFileExists(pathToLoad);
          if (fileExists) {
            console.log("[Chat] Auto-loading PDF for text extraction:", pathToLoad);
            await loadPdf(pathToLoad);
          } else {
            console.log("[Chat] PDF file no longer exists:", pathToLoad);
            // Clear the invalid path and redirect to home
            setCurrentPaper(null);
            setLastSelectedPdfPath(null);
            navigate('/');
          }
        } catch (error) {
          console.error('[Chat] Error in auto-load:', error);
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
  }, [lastSelectedPdfPath, currentPaper, index, loading, autoLoading, checkFileExists, loadPdf, setCurrentPaper, setLastSelectedPdfPath, navigate]);

  const send = useCallback(async () => {
    if (!currentPaper || !index || !question.trim() || sending) return;
    const q = question.trim();
    setQuestion("");
    setSending(true);
    addChatMessage(currentPaper, "user", q);
    
    try {
      console.log('[Chat] Searching for:', q);
      
      // Use hybrid RAG search
      const results = await hybridRAG.search(index.documentId, q, {
        topK: 5,
        tfidfWeight: 0.4,
        semanticWeight: 0.6,
        fusionMethod: 'weighted',
      });
      
      console.log('[Chat] Search results:', results.length);
      
      // Extract context from results
      const contexts = results.map(r => r.chunk.text);
      
      // Build prompt and get answer
      const prompt = buildPrompt(q, contexts);
      const answer = await chatComplete(prompt, { provider: 'ollama', model: selectedModel });
      
      addChatMessage(currentPaper, "assistant", answer);
    } catch (err: any) {
      console.error('[Chat] Error:', err);
      addChatMessage(currentPaper, "assistant", `Error: ${err?.message ?? String(err)}`);
    } finally {
      setSending(false);
    }
  }, [addChatMessage, currentPaper, index, question, selectedModel, sending]);

  // Handle resize dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection from starting
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const containerWidth = window.innerWidth - 48; // Account for padding
      const newLeftWidth = (e.clientX / containerWidth) * 100;
      // Clamp between 30% and 70%
      const clampedWidth = Math.min(Math.max(newLeftWidth, 30), 70);
      setLeftWidth(clampedWidth);
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    // Save the final position to store when drag ends
    setChatSeparatorPosition(leftWidth);
    console.log('[Chat] Saved separator position:', leftWidth);
  }, [leftWidth, setChatSeparatorPosition]);

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
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  // Prevent selection event during drag
  const preventSelection = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Get document title for display
  const documentTitle = currentPaper ? 
    currentPaper.split('/').pop()?.replace('.pdf', '') || 'Document' : 
    'No Document';

  if (autoLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] animate-fade-in">
        <div className="glass rounded-lg p-8 border border-white/20 backdrop-blur-xl text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Loading Document</h3>
          <p className="text-gray-600 dark:text-gray-300">Processing your PDF for AI chat...</p>
        </div>
      </div>
    );
  }

  if (!currentPaper) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] animate-fade-in">
        <div className="glass rounded-lg p-8 border border-white/20 backdrop-blur-xl text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Document Selected</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Please select a PDF document to start chatting.</p>
          <Button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            <Home className="w-4 h-4 mr-2" />
            Select Document
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] animate-fade-in px-6 py-4 max-w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{documentTitle}</h1>
              {meta && (
                <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <span>{meta.pages} pages • {(meta.chars / 1000).toFixed(1)}k chars • {index?.chunks.length ?? 0} chunks</span>
                  {meta.hasSemanticIndex && (
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <Sparkles className="w-3 h-3" />
                      <span className="text-xs">Hybrid RAG</span>
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Model Configuration */}
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-400" />
          <Select
            value={selectedModel}
            onValueChange={setSelectedModel}
            disabled={loadingModels}
          >
            <SelectTrigger className="w-64 h-10 glass border-white/20 bg-white/10 backdrop-blur-xl text-sm text-gray-900 dark:text-white hover:border-white/30 transition-colors">
              <SelectValue placeholder={loadingModels ? "Loading models..." : "Select a model"} />
            </SelectTrigger>
            <SelectContent className="glass border-white/20 backdrop-blur-xl bg-white/95 dark:bg-gray-800/95 dark:text-white">
              {availableModels.length === 0 && !loadingModels ? (
                <SelectItem value="no-models" disabled className="dark:text-gray-400">
                  No models available
                </SelectItem>
              ) : (
                availableModels.map((model) => (
                  <SelectItem 
                    key={model} 
                    value={model}
                    className="cursor-pointer dark:focus:bg-gray-700 dark:text-white"
                  >
                    {model}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Two Column Layout with Resizable Split */}
      <div className="flex gap-0 h-[calc(100%-72px)] relative">
        {/* Left Column - PDF Viewer */}
        <div 
          className="h-full overflow-hidden transition-all"
          style={{ width: `${leftWidth}%` }}
        >
          <PDFViewer filePath={currentPaper} className="h-full" />
        </div>

        {/* Resize Handle */}
        <div
          className={`w-1.5 cursor-col-resize transition-all`}
          onMouseDown={handleMouseDown}
        />

        {/* Right Column - Chat Interface */}
        <div 
          className="flex flex-col h-full min-h-0 transition-all"
          style={{ width: `${100 - leftWidth}%` }}
        >
          {/* Chat Messages Area */}
          <div className="flex-1 glass rounded-lg border border-white/20 backdrop-blur-xl overflow-hidden mb-4 flex flex-col min-h-0">
            <div className="p-4 border-b border-white/20 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-t-2xl flex-shrink-0">
              <h3 className="font-semibold text-gray-900 dark:text-white">AI Conversation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Ask questions about your research paper</p>
            </div>
            
            <div className="flex-1 p-6 overflow-auto space-y-4 min-h-0">
                {messages.length === 0 && index && (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Ready to chat!
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 max-w-md">
                        Your document has been processed. Ask me anything about the content, 
                        methodology, findings, or any specific details you'd like to explore.
                      </p>
                    </div>
                  </div>
                )}

                {messages.length === 0 && !index && loading && (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Processing Document
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 max-w-md">
                        Analyzing your PDF and preparing it for AI conversation...
                      </p>
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} className={`flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      m.role === "user" 
                        ? "bg-gradient-to-br from-blue-500 to-purple-600" 
                        : "bg-gradient-to-br from-emerald-500 to-teal-600"
                    }`}>
                      {m.role === "user" ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>

                    {/* Message */}
                    <div className={`max-w-[85%] ${m.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      <div className={`px-4 py-3 rounded-lg shadow-sm animate-fade-in ${
                        m.role === "user"
                          ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-tr-lg"
                          : "glass border border-white/20 text-gray-900 dark:text-white rounded-tl-lg"
                      }`}>
                        {m.role === "assistant" ? (
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
                      <span className="text-xs text-gray-500 px-2">
                        {new Date(m.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}

                {sending && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="glass border border-white/20 px-4 py-3 rounded-lg rounded-tl-lg">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Invisible div for auto-scroll */}
                <div ref={messagesEndRef} />
              </div>
          </div>

          {/* Message Input */}
          <div className="glass rounded-lg p-4 border border-white/20 backdrop-blur-xl flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Input
                  placeholder={index ? "Ask about the paper..." : "Processing document..."}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  disabled={!index || sending || loading}
                  className="glass border-white/20 bg-white/10 backdrop-blur-xl"
                />
              </div>
              
              <Button 
                onClick={send} 
                disabled={!index || !question.trim() || sending || loading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 px-6 transition-all duration-300 hover:scale-105"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { Chat };