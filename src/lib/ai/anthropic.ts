/**
 * Anthropic client — kept for direct use / future reference.
 * All API routes should import from '@/lib/ai/provider' instead,
 * which respects the AI_PROVIDER env var and routes to Anthropic or Ollama.
 */
import Anthropic from '@anthropic-ai/sdk';

function getEnv(name: string): string | undefined {
  return process.env[name];
}

export const anthropic = new Anthropic({
  apiKey: getEnv('ANTHROPIC_API_KEY') ?? '',
});

export const AI_MODEL = getEnv('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-5';
