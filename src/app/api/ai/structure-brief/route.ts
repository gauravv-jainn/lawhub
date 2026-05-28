import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateCompletion } from '@/lib/ai/provider';
import { BRIEF_STRUCTURE_SYSTEM } from '@/lib/ai/prompts';
import { checkAndLogAiUsage } from '@/lib/ai/usage';
import { aiRateLimit } from '@/lib/ratelimit';

const MAX_INPUT_LENGTH = 5000;

export async function POST(req: NextRequest) {
  try {
    const limited = await aiRateLimit(req);
    if (limited) return limited;

    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { text } = await req.json() as { text?: string };
    if (!text || text.length < 20) {
      return NextResponse.json({ error: 'Text too short (minimum 20 characters)' }, { status: 400 });
    }
    if (text.length > MAX_INPUT_LENGTH) {
      return NextResponse.json({ error: `Text too long (maximum ${MAX_INPUT_LENGTH} characters)` }, { status: 400 });
    }

    const { text: responseText, tokensUsed } = await generateCompletion({
      system: BRIEF_STRUCTURE_SYSTEM,
      userMessage: text,
      maxTokens: 1024,
    });

    const { allowed } = await checkAndLogAiUsage(session.user.id, 'structure-brief', tokensUsed);
    if (!allowed) {
      return NextResponse.json({ error: 'Daily AI limit reached (20 calls/day)' }, { status: 429 });
    }

    let structured: Record<string, unknown>;
    try {
      structured = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      structured = match ? (JSON.parse(match[0]) as Record<string, unknown>) : { summary: responseText };
    }

    return NextResponse.json({ structured });
  } catch (err: unknown) {
    console.error('[POST /api/ai/structure-brief]', err);
    const message = err instanceof Error ? err.message : 'AI service unavailable';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
