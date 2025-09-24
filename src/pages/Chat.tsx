import React, { useCallback, useMemo, useState } from "react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { useAppStore } from "../store";
import { extractPdfFromPathWithMeta } from "../lib/pdf";
import { buildIndex, chunkText, retrieve, type RagIndex } from "../lib/rag";
import { buildPrompt, chatComplete } from "../lib/llm";

const Chat: React.FC = () => {
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const setCurrentPaper = useAppStore((s) => s.setCurrentPaper);
  const chatHistory = useAppStore((s) => s.chatHistory);
  const currentPaper = useAppStore((s) => s.currentPaper);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);

  const [pdfPath, setPdfPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState<RagIndex | null>(null);
  const [question, setQuestion] = useState("");
  const [meta, setMeta] = useState<{ pages: number; chars: number } | null>(null);

  const messages = useMemo(() => {
    if (!currentPaper) return [] as { role: "user" | "assistant"; content: string; timestamp: number }[];
    const chat = chatHistory.find((c) => c.paperId === currentPaper);
    return chat?.messages ?? [];
  }, [chatHistory, currentPaper]);

  const loadPdf = useCallback(async () => {
    if (!pdfPath) return;
    setLoading(true);
    try {
      const { text, pageCount, charCount } = await extractPdfFromPathWithMeta(pdfPath);
      const chunks = chunkText(text);
      const idx = buildIndex(chunks);
      setIndex(idx);
      setMeta({ pages: pageCount, chars: charCount });
      setCurrentPaper(pdfPath);
    } catch (err: any) {
      console.error(err);
      // eslint-disable-next-line no-alert
      alert(`Failed to load PDF: ${err?.message ?? String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [pdfPath, setCurrentPaper]);

  const send = useCallback(async () => {
    if (!currentPaper || !index || !question.trim()) return;
    const q = question.trim();
    setQuestion("");
    addChatMessage(currentPaper, "user", q);
    const top = retrieve(index, q, 3);
    const contexts = top.map((t) => t.chunk.text);
    const prompt = buildPrompt(q, contexts);
    const answer = await chatComplete(prompt, { provider: 'ollama', model: selectedModel });
    addChatMessage(currentPaper, "assistant", answer);
  }, [addChatMessage, currentPaper, index, question, selectedModel]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border p-4 flex items-center gap-2">
        <Input
          placeholder="/absolute/path/to/paper.pdf"
          value={pdfPath}
          onChange={(e) => setPdfPath(e.target.value)}
        />
        <Button disabled={loading || !pdfPath} onClick={loadPdf}>
          {loading ? "Loading..." : "Load PDF"}
        </Button>
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              const { open } = await import("@tauri-apps/plugin-dialog");
              const file = await open({ multiple: false, title: "Select a PDF", filters: [{ name: "PDF", extensions: ["pdf"] }] });
              if (typeof file === "string" && file.endsWith(".pdf")) {
                setPdfPath(file);
              }
            } catch (err: any) {
              console.error(err);
              // eslint-disable-next-line no-alert
              alert(`Failed to open file dialog: ${err?.message ?? String(err)}`);
            }
          }}
        >
          Pick PDF
        </Button>
        <Input
          className="max-w-[220px]"
          placeholder="ollama model (e.g., llama3.2:latest)"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        />
        {meta && (
          <div className="text-zinc-500 text-sm ml-2">
            {meta.pages} pages, {meta.chars} chars, {index?.chunks.length ?? 0} chunks
          </div>
        )}
      </div>

      <div className="flex-1 min-h-[300px] rounded-xl border p-4 space-y-3 overflow-auto bg-white text-zinc-900">
        {messages.length === 0 && (
          <div className="text-zinc-500 text-sm">No messages yet. Load a PDF and ask a question.</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={
                m.role === "user"
                  ? "inline-block rounded-lg px-3 py-2 bg-zinc-900 text-white"
                  : "inline-block rounded-lg px-3 py-2 bg-zinc-100 text-zinc-900"
              }
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-3 flex items-center gap-2">
        <Input
          placeholder="Ask about the paper..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          disabled={!index}
        />
        <Button onClick={send} disabled={!index || !question.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
};

export { Chat };