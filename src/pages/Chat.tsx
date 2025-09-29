import React, { useCallback, useMemo, useState } from "react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { RecentFiles } from "../components/RecentFiles";
import { useAppStore } from "../store";
import { extractPdfFromPathWithMeta } from "../lib/pdf";
import { buildIndex, chunkText, retrieve, type RagIndex } from "../lib/rag";
import { buildPrompt, chatComplete } from "../lib/llm";
import { cacheManager } from "../lib/cache";
import type { RecentFile } from "../lib/cache";
import { 
  FileText, 
  Send, 
  Upload, 
  Bot, 
  User, 
  Loader2, 
  Settings, 
  MessageSquare,
  Sparkles,
  History,
  ChevronDown,
  ChevronUp
} from "lucide-react";

const Chat: React.FC = () => {
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const setCurrentPaper = useAppStore((s) => s.setCurrentPaper);
  const chatHistory = useAppStore((s) => s.chatHistory);
  const currentPaper = useAppStore((s) => s.currentPaper);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);
  const lastSelectedPdfPath = useAppStore((s) => s.lastSelectedPdfPath);
  const setLastSelectedPdfPath = useAppStore((s) => s.setLastSelectedPdfPath);
  const recentFiles = useAppStore((s) => s.recentFiles);
  const setRecentFiles = useAppStore((s) => s.setRecentFiles);
  const addRecentFile = useAppStore((s) => s.addRecentFile);
  const removeRecentFile = useAppStore((s) => s.removeRecentFile);

  const [pdfPath, setPdfPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [index, setIndex] = useState<RagIndex | null>(null);
  const [question, setQuestion] = useState("");
  const [meta, setMeta] = useState<{ pages: number; chars: number } | null>(null);
  const [showRecentFiles, setShowRecentFiles] = useState(true);

  const messages = useMemo(() => {
    if (!currentPaper) return [] as { role: "user" | "assistant"; content: string; timestamp: number }[];
    const chat = chatHistory.find((c) => c.paperId === currentPaper);
    return chat?.messages ?? [];
  }, [chatHistory, currentPaper]);

  const loadPdf = useCallback(async (pathToLoad?: string) => {
    const targetPath = pathToLoad || pdfPath;
    if (!targetPath) return;
    
    setLoading(true);
    try {
      const result = await extractPdfFromPathWithMeta(targetPath);
      const { text, pageCount, charCount, title, author, fileSize } = result;
      const chunks = chunkText(text);
      const idx = buildIndex(chunks);
      setIndex(idx);
      setMeta({ pages: pageCount, chars: charCount });
      setCurrentPaper(targetPath);
      setLastSelectedPdfPath(targetPath);
      
      if (!pathToLoad) {
        // Only update the input field if this was triggered by the user
        setPdfPath(targetPath);
      }
      
      // Add to recent files cache
      const recentFile: RecentFile = {
        id: btoa(targetPath).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16),
        path: targetPath,
        title: title || targetPath.split('/').pop() || 'Untitled',
        lastAccessed: Date.now(),
        addedDate: Date.now(),
        pageCount,
        fileSize
      };
      
      // Update both cache manager and store
      await cacheManager.addRecentFile(targetPath, recentFile.title, { pageCount, fileSize });
      addRecentFile(recentFile);
      
    } catch (err: any) {
      console.error(err);
      // Only show alert for user-initiated loads
      if (!pathToLoad) {
        // eslint-disable-next-line no-alert
        alert(`Failed to load PDF: ${err?.message ?? String(err)}`);
      }
    } finally {
      setLoading(false);
    }
  }, [pdfPath, setCurrentPaper, setLastSelectedPdfPath, addRecentFile]);

  // Handle recent file selection
  const handleRecentFileSelect = useCallback(async (file: RecentFile) => {
    setPdfPath(file.path);
    await loadPdf(file.path);
    await cacheManager.updateLastAccessed(file.path);
  }, [loadPdf]);

  // Handle recent file removal
  const handleRemoveRecentFile = useCallback(async (path: string) => {
    await cacheManager.removeRecentFile(path);
    removeRecentFile(path);
  }, [removeRecentFile]);

  // Check if file exists helper function
  const checkFileExists = useCallback(async (filePath: string): Promise<boolean> => {
    try {
      const { exists } = await import("@tauri-apps/plugin-fs");
      return await exists(filePath);
    } catch (error) {
      return false;
    }
  }, []);

  // Load recent files on component mount
  React.useEffect(() => {
    const loadRecentFilesFromCache = async () => {
      try {
        await cacheManager.initialize();
        const cachedFiles = cacheManager.getRecentFiles();
        setRecentFiles(cachedFiles);
      } catch (error) {
        console.error('Failed to load recent files:', error);
      }
    };

    loadRecentFilesFromCache();
  }, [setRecentFiles]);

  // Auto-load last selected PDF on component mount
  React.useEffect(() => {
    const autoLoadLastPdf = async () => {
      if (lastSelectedPdfPath && !currentPaper && !loading && !autoLoading) {
        setAutoLoading(true);
        try {
          const fileExists = await checkFileExists(lastSelectedPdfPath);
          if (fileExists) {
            console.log("Auto-loading last selected PDF:", lastSelectedPdfPath);
            setPdfPath(lastSelectedPdfPath);
            await loadPdf(lastSelectedPdfPath);
          } else {
            console.log("Last selected PDF no longer exists:", lastSelectedPdfPath);
            // Clear the invalid path
            setLastSelectedPdfPath(null);
          }
        } finally {
          setAutoLoading(false);
        }
      }
    };

    autoLoadLastPdf();
  }, [lastSelectedPdfPath, currentPaper, loading, autoLoading, checkFileExists, loadPdf, setLastSelectedPdfPath]);

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

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-7xl mx-auto animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Left Sidebar - Recent Files */}
        <div className="lg:col-span-1 flex flex-col">
          <div className="glass rounded-2xl p-4 mb-4 border border-white/20 backdrop-blur-xl">
            <button
              onClick={() => setShowRecentFiles(!showRecentFiles)}
              className="w-full flex items-center justify-between p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
            >
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-500" />
                <span className="font-semibold text-gray-900 dark:text-white">Recent Files</span>
              </div>
              {showRecentFiles ? 
                <ChevronUp className="w-4 h-4 text-gray-600" /> : 
                <ChevronDown className="w-4 h-4 text-gray-600" />
              }
            </button>
          </div>

          {showRecentFiles && (
            <div className="flex-1 min-h-0">
              <RecentFiles
                recentFiles={recentFiles}
                onFileSelect={handleRecentFileSelect}
                onRemoveFile={handleRemoveRecentFile}
                loading={loading || autoLoading}
              />
            </div>
          )}
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-2 flex flex-col">
          {/* Header with PDF loading */}
          <div className="glass rounded-2xl p-6 mb-6 border border-white/20 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Research Assistant</h1>
              {autoLoading && (
                <div className="flex items-center gap-2 ml-auto">
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  <span className="text-sm text-blue-600 font-medium">Auto-loading last PDF...</span>
                </div>
              )}
              {!autoLoading && index && (
                <div className="flex items-center gap-2 ml-auto">
                  <Sparkles className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600 font-medium">Ready to chat</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* PDF Path Input */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="/absolute/path/to/paper.pdf"
                    value={pdfPath}
                    onChange={(e) => setPdfPath(e.target.value)}
                    className="pl-10 glass border-white/20 bg-white/10 backdrop-blur-xl"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  disabled={loading || autoLoading || !pdfPath} 
                  onClick={() => loadPdf()}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {loading ? "Loading..." : "Load PDF"}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const { open } = await import("@tauri-apps/plugin-dialog");
                      const file = await open({ multiple: false, title: "Select a PDF", filters: [{ name: "PDF", extensions: ["pdf"] }] });
                      if (typeof file === "string" && file.endsWith(".pdf")) {
                        setPdfPath(file);
                        setLastSelectedPdfPath(file);
                      }
                    } catch (err: any) {
                      console.error(err);
                      alert(`Failed to open file dialog: ${err?.message ?? String(err)}`);
                    }
                  }}
                  className="glass border-white/20 bg-white/10 backdrop-blur-xl hover:bg-white/20"
                >
                  <FileText className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Model Configuration and Metadata */}
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-400" />
                <Input
                  placeholder="ollama model (e.g., llama3.2:latest)"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-60 glass border-white/20 bg-white/10 backdrop-blur-xl text-sm"
                />
              </div>
              
              {meta && (
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 ml-auto">
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {meta.pages} pages
                  </span>
                  <span>{(meta.chars / 1000).toFixed(1)}k chars</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg font-medium">
                    {index?.chunks.length ?? 0} chunks indexed
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 glass rounded-2xl border border-white/20 backdrop-blur-xl overflow-hidden mb-6">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-white/20 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20">
                <h3 className="font-semibold text-gray-900 dark:text-white">Conversation</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Ask questions about your research paper</p>
              </div>
              
              <div className="flex-1 p-6 overflow-auto space-y-4 min-h-0">
                {messages.length === 0 && !index && (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No document loaded
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 max-w-md">
                        Upload a PDF document to start chatting with your research papers. 
                        I'll help you understand and explore the content.
                      </p>
                    </div>
                  </div>
                )}

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
                    <div className={`max-w-[70%] ${m.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
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
          </div>

          {/* Message Input */}
          <div className="glass rounded-2xl p-4 border border-white/20 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Input
                  placeholder={index ? "Ask about the paper..." : "Load a PDF first to start chatting"}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  disabled={!index || sending}
                  className="glass border-white/20 bg-white/10 backdrop-blur-xl pr-12"
                />
              </div>
              
              <Button 
                onClick={send} 
                disabled={!index || !question.trim() || sending}
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