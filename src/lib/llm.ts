import axios from 'axios';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type LlmConfig = {
  provider?: 'ollama' | 'openai' | 'none';
  apiKey?: string;
  baseUrl?: string; // allow custom endpoints
  model?: string;
};

export async function chatComplete(messages: ChatMessage[], config?: LlmConfig): Promise<string> {
  const provider = config?.provider ?? 'ollama';

  if (provider === 'ollama') {
    const baseUrl = (config?.baseUrl ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
    const model = config?.model ?? 'llama3.2:latest';
    try {
      const { data } = await axios.post(`${baseUrl}/api/chat`, {
        model,
        messages,
        stream: false,
        options: { temperature: 0.2 },
      });
      const content: string = data?.message?.content ?? '';
      return content.trim();
    } catch (e: any) {
      const last = messages[messages.length - 1];
      return `Ollama request failed (${e?.message ?? 'unknown error'}). Question: "${last?.content ?? ''}".`;
    }
  }

  if (provider === 'openai') {
    const apiKey = config?.apiKey;
    const baseUrl = (config?.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    const model = config?.model ?? 'gpt-4o-mini';
    if (!apiKey) throw new Error('Missing OpenAI API key');

    const { data } = await axios.post(
      `${baseUrl}/chat/completions`,
      { model, messages, temperature: 0.2 },
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    const content: string = data.choices?.[0]?.message?.content ?? '';
    return content.trim();
  }

  // Fallback: simple deterministic template response for MVP
  const last = messages[messages.length - 1];
  return `No LLM provider configured. Your question was: "${last?.content ?? ''}".`;
}

export function buildPrompt(question: string, contexts: string[]): ChatMessage[] {
  const system: ChatMessage = {
    role: 'system',
    content:
      'You are a helpful research assistant. Answer concisely based only on the provided context. If unsure, say you are unsure.',
  };
  const contextBlock = contexts
    .map((c, i) => `Context ${i + 1}:\n${c}`)
    .join('\n\n');
  const user: ChatMessage = {
    role: 'user',
    content: `Context:\n${contextBlock}\n\nQuestion: ${question}`,
  };
  return [system, user];
}

/**
 * List available Ollama models
 * @param config Optional configuration for Ollama base URL
 * @returns Array of model names
 */
export async function listOllamaModels(config?: { baseUrl?: string }): Promise<string[]> {
  const baseUrl = (config?.baseUrl ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
  
  try {
    const { data } = await axios.get(`${baseUrl}/api/tags`);
    const models = data?.models ?? [];
    return models.map((model: any) => model.name);
  } catch (e: any) {
    console.error('[LLM] Failed to list Ollama models:', e?.message ?? 'unknown error');
    return [];
  }
}


