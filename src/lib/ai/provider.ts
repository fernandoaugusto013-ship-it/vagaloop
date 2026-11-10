import "server-only";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export interface LlmProvider {
  readonly name: string;
  complete(input: { system: string; messages: ChatMessage[]; maxTokens?: number }): Promise<string>;
}

class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  constructor(private apiKey: string, private model: string) {}

  async complete({ system, messages, maxTokens = 2000 }: { system: string; messages: ChatMessage[]; maxTokens?: number }) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": this.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: this.model, max_tokens: maxTokens, system, messages }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    return data.content.filter((c) => c.type === "text").map((c) => c.text).join("");
  }
}

/** null = sem provedor configurado; quem chama cai no modo heurístico. */
export function getLlm(): LlmProvider | null {
  const provider = process.env.AI_PROVIDER ?? "anthropic";
  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider(process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5");
  }
  return null;
}

/** Extrai o primeiro objeto JSON de uma resposta de texto. */
export function parseJson<T>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Resposta da IA sem JSON");
  return JSON.parse(text.slice(start, end + 1)) as T;
}

/** Embeddings via qualquer API compatível com /v1/embeddings. null quando não configurado. */
export async function embed(text: string): Promise<number[] | null> {
  const url = process.env.EMBEDDINGS_API_URL;
  const key = process.env.EMBEDDINGS_API_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: process.env.EMBEDDINGS_MODEL, input: text.slice(0, 24_000) }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data: { embedding: number[] }[] };
    return data.data[0]?.embedding ?? null;
  } catch {
    return null;
  }
}
