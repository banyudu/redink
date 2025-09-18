import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  theme: 'light' | 'dark';
  language: 'en' | 'zh';
  currentPaper: string | null;
  selectedModel: string;
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
  setSelectedModel: (model: string) => void;
  addChatMessage: (paperId: string, role: 'user' | 'assistant', content: string) => void;
  clearChatHistory: (paperId: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      language: 'en',
      currentPaper: null,
      selectedModel: 'llama2',
      chatHistory: [],
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setCurrentPaper: (paperId) => set({ currentPaper: paperId }),
      setSelectedModel: (model) => set({ selectedModel: model }),
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