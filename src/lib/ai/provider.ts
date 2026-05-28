/**
 * AI Provider Abstraction
 *
 * Switch between Anthropic (Claude) and Ollama (local models) via env var:
 *   AI_PROVIDER=anthropic  → uses ANTHROPIC_API_KEY + ANTHROPIC_MODEL
 *   AI_PROVIDER=ollama     → uses OLLAMA_BASE_URL + OLLAMA_MODEL
 */
import Anthropic from '@anthropic-ai/sdk';

export interface CompletionRequest {
  system: string;
  userMessage: string;
  maxTokens?: number;
}

export interface CompletionResponse {
  text: string;
  tokensUsed: number;
}

// ─── Anthropic singleton (reuse connection pool across requests) ──────────────

const globalForAnthropicAI = globalThis as unknown as { _anthropicClient?: Anthropic };

function getAnthropicClient(): Anthropic {
  if (!globalForAnthropicAI._anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');
    globalForAnthropicAI._anthropicClient = new Anthropic({ apiKey });
  }
  return globalForAnthropicAI._anthropicClient;
}

async function callAnthropic(req: CompletionRequest): Promise<CompletionResponse> {
  const client = getAnthropicClient();
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';

  const message = await client.messages.create({
    model,
    max_tokens: req.maxTokens ?? 1024,
    system: req.system,
    messages: [{ role: 'user', content: req.userMessage }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected Anthropic response type');

  return {
    text: content.text,
    tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
  };
}

// ─── Ollama provider ──────────────────────────────────────────────────────────

async function callOllama(req: CompletionRequest): Promise<CompletionResponse> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL ?? 'qwen2.5:1.5b';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        options: { num_ctx: 1024, num_predict: req.maxTokens ?? 1024 },
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.userMessage },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (body.includes('memory') || body.includes('RAM')) {
        throw new Error(
          `Not enough RAM to load ${model}. Try a smaller model or set AI_PROVIDER=anthropic.`
        );
      }
      if (body.toLowerCase().includes('runner process has terminated')) {
        throw new Error(
          `Ollama runner crashed loading ${model}. Close other models/apps and retry, or set AI_PROVIDER=anthropic.`
        );
      }
      throw new Error(`Ollama error ${res.status}: ${body}`);
    }

    const data = await res.json() as { message?: { content?: string } };
    return { text: data?.message?.content ?? '', tokensUsed: 0 };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function generateCompletion(
  req: CompletionRequest,
): Promise<CompletionResponse> {
  const provider = (process.env.AI_PROVIDER ?? 'ollama').toLowerCase();
  return provider === 'anthropic' ? callAnthropic(req) : callOllama(req);
}
