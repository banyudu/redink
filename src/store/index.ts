import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RecentFile } from '../lib/cache';

interface AppState {
  theme: 'light' | 'dark';
  language: 'en' | 'zh';
  currentPaper: string | null;
  lastSelectedPdfPath: string | null;
  selectedModel: string;
  pdfViewerScale: number;
  recentFiles: RecentFile[];
  chatHistory: Array<{
    id: string;
    paperId: string;
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: number;
    }>;
  }>;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: 'en' | 'zh') => void;
  setCurrentPaper: (paperId: string | null) => void;
  setLastSelectedPdfPath: (path: string | null) => void;
  setSelectedModel: (model: string) => void;
  setPdfViewerScale: (scale: number) => void;
  setRecentFiles: (files: RecentFile[]) => void;
  addRecentFile: (file: RecentFile) => void;
  removeRecentFile: (path: string) => void;
  clearRecentFiles: () => void;
  addChatMessage: (paperId: string, role: 'user' | 'assistant', content: string) => void;
  clearChatHistory: (paperId: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      language: 'en',
      currentPaper: null,
      lastSelectedPdfPath: null,
      selectedModel: 'llama3.2:latest',
      pdfViewerScale: 1.0,
      recentFiles: [],
      chatHistory: [],
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setCurrentPaper: (paperId) => set({ currentPaper: paperId }),
      setLastSelectedPdfPath: (path) => set({ lastSelectedPdfPath: path }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setPdfViewerScale: (scale) => set({ pdfViewerScale: scale }),
      setRecentFiles: (files) => set({ recentFiles: files }),
      addRecentFile: (file) => set((state) => {
        const existing = state.recentFiles.filter(f => f.id !== file.id);
        return { recentFiles: [file, ...existing] };
      }),
      removeRecentFile: (path) => set((state) => ({
        recentFiles: state.recentFiles.filter(f => f.path !== path)
      })),
      clearRecentFiles: () => set({ recentFiles: [] }),
      addChatMessage: (paperId, role, content) =>
        set((state) => {
          const chatIndex = state.chatHistory.findIndex((chat) => chat.paperId === paperId);
          const newMessage = {
            role,
            content,
            timestamp: Date.now(),
          };

          if (chatIndex === -1) {
            return {
              chatHistory: [
                ...state.chatHistory,
                {
                  id: Date.now().toString(),
                  paperId,
                  messages: [newMessage],
                },
              ],
            };
          }

          const updatedChatHistory = [...state.chatHistory];
          updatedChatHistory[chatIndex] = {
            ...updatedChatHistory[chatIndex],
            messages: [...updatedChatHistory[chatIndex].messages, newMessage],
          };

          return { chatHistory: updatedChatHistory };
        }),
      clearChatHistory: (paperId) =>
        set((state) => ({
          chatHistory: state.chatHistory.filter((chat) => chat.paperId !== paperId),
        })),
    }),
    {
      name: 'redink-storage',
    }
  )
); 