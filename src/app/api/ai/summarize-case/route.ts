import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateCompletion } from '@/lib/ai/provider';
import { CASE_SUMMARY_SYSTEM } from '@/lib/ai/prompts';
import { checkAndLogAiUsage } from '@/lib/ai/usage';
import { aiRateLimit } from '@/lib/ratelimit';

const MAX_INPUT_LENGTH = 5000;

export async function POST(req: NextRequest) {
  try {
    const limited = await aiRateLimit(req);
    if (limited) return limited;

    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { briefText, events, documents } = await req.json() as {
      briefText?: string;
      events?: Array<{ title: string; description?: string }>;
      documents?: string[];
    };

    if (!briefText || briefText.length < 20) {
      return NextResponse.json({ error: 'briefText is required (minimum 20 characters)' }, { status: 400 });
    }
    if (briefText.length > MAX_INPUT_LENGTH) {
      return NextResponse.json({ error: `briefText too long (maximum ${MAX_INPUT_LENGTH} characters)` }, { status: 400 });
    }

    const eventsText = events
      ?.map((e) => `- ${e.title}: ${e.description ?? ''}`)
      .join('\n') ?? 'None yet';

    const userMessage = `Brief Description:\n${briefText}\n\nTimeline Events:\n${eventsText}\n\nUploaded Documents: ${documents?.join(', ') ?? 'None'}\n\nPlease analyze this case.`;

    const { text: responseText, tokensUsed } = await generateCompletion({
      system: CASE_SUMMARY_SYSTEM,
      userMessage,
      maxTokens: 1024,
    });

    const { allowed } = await checkAndLogAiUsage(session.user.id, 'summarize-case', tokensUsed);
    if (!allowed) {
      return NextResponse.json({ error: 'Daily AI limit reached (20 calls/day)' }, { status: 429 });
    }

    let analysis: Record<string, unknown>;
    try {
      analysis = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      analysis = match
        ? (JSON.parse(match[0]) as Record<string, unknown>)
        : { summary: responseText, strength: 'Medium' };
    }

    return NextResponse.json({ analysis });
  } catch (err: unknown) {
    console.error('[POST /api/ai/summarize-case]', err);
    const message = err instanceof Error ? err.message : 'AI service unavailable';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
