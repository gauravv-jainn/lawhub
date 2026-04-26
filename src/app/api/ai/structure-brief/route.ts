import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateCompletion } from '@/lib/ai/provider';
import { BRIEF_STRUCTURE_SYSTEM } from '@/lib/ai/prompts';
import { isAiLimitReached, logAiUsage } from '@/lib/ai/usage';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (await isAiLimitReached(session.user.id)) {
      return NextResponse.json({ error: 'Daily AI limit reached (20 calls/day)' }, { status: 429 });
    }

    const { text } = await req.json();
    if (!text || text.length < 20) {
      return NextResponse.json({ error: 'Text too short' }, { status: 400 });
    }

    const { text: responseText, tokensUsed } = await generateCompletion({
      system: BRIEF_STRUCTURE_SYSTEM,
      userMessage: text,
      maxTokens: 1024,
    });

    let structured: Record<string, unknown>;
    try {
      structured = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      structured = match ? JSON.parse(match[0]) : { summary: responseText };
    }

    await logAiUsage(session.user.id, 'structure-brief', tokensUsed);

    return NextResponse.json({ structured });
  } catch (err) {
    console.error('AI structure-brief error:', err);
    const message = err instanceof Error ? err.message : 'AI service unavailable';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
