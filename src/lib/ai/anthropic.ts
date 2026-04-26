/**
 * Anthropic client — kept for direct use / future reference.
 * All API routes should import from '@/lib/ai/provider' instead,
 * which respects the AI_PROVIDER env var and routes to Anthropic or Ollama.
 */
import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
});

export const AI_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';
