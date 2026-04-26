/**
 * AI Provider Abstraction
 *
 * Switch between Anthropic (Claude) and Ollama (local models) via env var:
 *   AI_PROVIDER=anthropic  → uses ANTHROPIC_API_KEY + ANTHROPIC_MODEL (default: claude-sonnet-4-5)
 *   AI_PROVIDER=ollama     → uses OLLAMA_BASE_URL + OLLAMA_MODEL (default: qwen2.5:1.5b)
 *
 * To switch to Claude: set AI_PROVIDER=anthropic and fill ANTHROPIC_API_KEY in .env.local
 */

export interface CompletionRequest {
  system: string;
  userMessage: string;
  maxTokens?: number;
}

export interface CompletionResponse {
  text: string;
  tokensUsed: number; // 0 for Ollama (free/local)
}

// ─────────────────────────────────────────────
// Anthropic provider
// ─────────────────────────────────────────────
async function callAnthropic(req: CompletionRequest): Promise<CompletionResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_anthropic_api_key') {
    throw new Error('ANTHROPIC_API_KEY is not configured in .env.local');
  }

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });
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

// ─────────────────────────────────────────────
// Ollama provider  (with 60s timeout + clear memory error)
// ─────────────────────────────────────────────
async function callOllama(req: CompletionRequest): Promise<CompletionResponse> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL ?? 'qwen2.5:1.5b';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000); // 60s timeout

  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        options: {
          // Keep context smaller on low-memory machines to reduce runner crashes.
          num_ctx: 1024,
          num_predict: req.maxTokens ?? 1024,
        },
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.userMessage },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      // Surface the real Ollama error (e.g. "model requires more system memory")
      if (body.includes('memory') || body.includes('RAM')) {
        throw new Error(
          `Not enough RAM to load ${model}. ` +
          `Try a smaller model (e.g. qwen2.5:1.5b) or set AI_PROVIDER=anthropic.`
        );
      }
      if (body.toLowerCase().includes('runner process has terminated')) {
        throw new Error(
          `Ollama runner crashed while loading ${model}. ` +
          `Close heavy apps/models and retry, or switch AI_PROVIDER=anthropic.`
        );
      }
      throw new Error(`Ollama error ${res.status}: ${body}`);
    }

    const data = await res.json();
    const text: string = data?.message?.content ?? '';

    return { text, tokensUsed: 0 };
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────
// Public entry point — picks provider from env
// ─────────────────────────────────────────────
export async function generateCompletion(
  req: CompletionRequest,
): Promise<CompletionResponse> {
  const provider = (process.env.AI_PROVIDER ?? 'ollama').toLowerCase();

  if (provider === 'anthropic') {
    return callAnthropic(req);
  }
  // default: ollama
  return callOllama(req);
}
