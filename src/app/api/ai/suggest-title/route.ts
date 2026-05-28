import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateCompletion } from '@/lib/ai/provider';
import { TITLE_SUGGEST_SYSTEM } from '@/lib/ai/prompts';
import { checkAndLogAiUsage } from '@/lib/ai/usage';
import { aiRateLimit } from '@/lib/ratelimit';

const MAX_INPUT_LENGTH = 2000;

export async function POST(req: NextRequest) {
  try {
    const limited = await aiRateLimit(req);
    if (limited) return limited;

    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { description } = await req.json() as { description?: string };
    if (!description || description.length < 20) return NextResponse.json({ titles: [] });
    if (description.length > MAX_INPUT_LENGTH) {
      return NextResponse.json({ error: `description too long (maximum ${MAX_INPUT_LENGTH} characters)` }, { status: 400 });
    }

    const { text: responseText, tokensUsed } = await generateCompletion({
      system: TITLE_SUGGEST_SYSTEM,
      userMessage: description,
      maxTokens: 256,
    });

    const { allowed } = await checkAndLogAiUsage(session.user.id, 'suggest-title', tokensUsed);
    if (!allowed) {
      return NextResponse.json({ error: 'Daily AI limit reached (20 calls/day)' }, { status: 429 });
    }

    let result: { titles: string[] } = { titles: [] };
    try {
      result = JSON.parse(responseText) as { titles: string[] };
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]) as { titles: string[] };
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[POST /api/ai/suggest-title]', err);
    return NextResponse.json({ titles: [] });
  }
}
