import React, { useCallback, useMemo, useState } from "react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { useAppStore } from "../store";
import { extractPdfFromPathWithMeta } from "../lib/pdf";
import { buildIndex, chunkText, retrieve, type RagIndex } from "../lib/rag";
import { buildPrompt, chatComplete } from "../lib/llm";
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
  Home
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

  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [index, setIndex] = useState<RagIndex | null>(null);
  const [question, setQuestion] = useState("");
  const [meta, setMeta] = useState<{ pages: number; chars: number } | null>(null);

  const messages = useMemo(() => {
    if (!currentPaper) return [] as { role: "user" | "assistant"; content: string; timestamp: number }[];
    const chat = chatHistory.find((c) => c.paperId === currentPaper);
    return chat?.messages ?? [];
  }, [chatHistory, currentPaper]);

  const loadPdf = useCallback(async (pathToLoad: string) => {
    if (!pathToLoad) return;
    
    setLoading(true);
    try {
      const result = await extractPdfFromPathWithMeta(pathToLoad);
      const { text, pageCount, charCount, title, fileSize } = result;
      const chunks = chunkText(text);
      const idx = buildIndex(chunks);
      setIndex(idx);
      setMeta({ pages: pageCount, chars: charCount });
      setCurrentPaper(pathToLoad);
      setLastSelectedPdfPath(pathToLoad);
      
      // Add to recent files cache
      const recentFile = {
        id: btoa(pathToLoad).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16),
        path: pathToLoad,
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
      console.error('Failed to load PDF:', err);
      alert(`Failed to load PDF: ${err?.message ?? String(err)}`);
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

  // Auto-load last selected PDF on component mount
  React.useEffect(() => {
    const autoLoadLastPdf = async () => {
      // Load PDF if we have a path and either no current paper or current paper but no index
      const shouldLoad = (lastSelectedPdfPath || currentPaper) && !index && !loading && !autoLoading;
      const pathToLoad = currentPaper || lastSelectedPdfPath;
      
      if (shouldLoad && pathToLoad) {
        setAutoLoading(true);
        try {
          const fileExists = await checkFileExists(pathToLoad);
          if (fileExists) {
            console.log("Auto-loading PDF for text extraction:", pathToLoad);
            await loadPdf(pathToLoad);
          } else {
            console.log("PDF file no longer exists:", pathToLoad);
            // Clear the invalid path and redirect to home
            setCurrentPaper(null);
            setLastSelectedPdfPath(null);
            navigate('/');
          }
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
      const top = retrieve(index, q, 3);
      const contexts = top.map((t) => t.chunk.text);
      const prompt = buildPrompt(q, contexts);
      const answer = await chatComplete(prompt, { provider: 'ollama', model: selectedModel });
      addChatMessage(currentPaper, "assistant", answer);
    } catch (err: any) {
      addChatMessage(currentPaper, "assistant", `Error: ${err?.message ?? String(err)}`);
    } finally {
      setSending(false);
    }
  }, [addChatMessage, currentPaper, index, question, selectedModel, sending]);

  // Get document title for display
  const documentTitle = currentPaper ? 
    currentPaper.split('/').pop()?.replace('.pdf', '') || 'Document' : 
    'No Document';

  if (autoLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] animate-fade-in">
        <div className="glass rounded-2xl p-8 border border-white/20 backdrop-blur-xl text-center">
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
        <div className="glass rounded-2xl p-8 border border-white/20 backdrop-blur-xl text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
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
    <div className="h-[calc(100vh-140px)] animate-fade-in px-6 py-4 max-w-[1800px] mx-auto">
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
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{documentTitle}</h1>
              {meta && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {meta.pages} pages • {(meta.chars / 1000).toFixed(1)}k chars • {index?.chunks.length ?? 0} chunks indexed
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Model Configuration */}
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-400" />
          <Input
            placeholder="ollama model (e.g., llama3.2:latest)"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-64 glass border-white/20 bg-white/10 backdrop-blur-xl text-sm"
          />
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-12 gap-6 h-[calc(100%-72px)]">
        {/* Left Column - PDF Viewer */}
        <div className="col-span-6 h-full overflow-hidden">
          <PDFViewer filePath={currentPaper} className="h-full" />
        </div>

        {/* Right Column - Chat Interface */}
        <div className="col-span-6 flex flex-col h-full min-h-0">
          {/* Chat Messages Area */}
          <div className="flex-1 glass rounded-2xl border border-white/20 backdrop-blur-xl overflow-hidden mb-4 flex flex-col min-h-0">
            <div className="p-4 border-b border-white/20 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-t-2xl flex-shrink-0">
              <h3 className="font-semibold text-gray-900 dark:text-white">AI Conversation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Ask questions about your research paper</p>
            </div>
            
            <div className="flex-1 p-6 overflow-auto space-y-4 min-h-0">
                {messages.length === 0 && index && (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
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
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
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
                      <div className={`px-4 py-3 rounded-2xl shadow-sm animate-fade-in ${
                        m.role === "user"
                          ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-tr-lg"
                          : "glass border border-white/20 text-gray-900 dark:text-white rounded-tl-lg"
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                      </div>
                      <span className="text-xs text-gray-500 px-2">
                        {new Date(m.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}

                {sending && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="glass border border-white/20 px-4 py-3 rounded-2xl rounded-tl-lg">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
          </div>

          {/* Message Input */}
          <div className="glass rounded-2xl p-4 border border-white/20 backdrop-blur-xl flex-shrink-0">
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
            
            {index && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  💡 Tip: Ask specific questions about methodology, findings, or request summaries of specific sections
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { Chat };