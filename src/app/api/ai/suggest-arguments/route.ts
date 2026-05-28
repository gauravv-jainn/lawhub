import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateCompletion } from '@/lib/ai/provider';
import { ARGUMENT_SUGGEST_SYSTEM } from '@/lib/ai/prompts';
import { checkAndLogAiUsage } from '@/lib/ai/usage';
import { aiRateLimit } from '@/lib/ratelimit';

const MAX_INPUT_LENGTH = 3000;

export async function POST(req: NextRequest) {
  try {
    const limited = await aiRateLimit(req);
    if (limited) return limited;

    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { caseType, facts } = await req.json() as { caseType?: string; facts?: string };
    if (!caseType || !facts) {
      return NextResponse.json({ error: 'caseType and facts are required' }, { status: 400 });
    }
    if (facts.length > MAX_INPUT_LENGTH) {
      return NextResponse.json({ error: `facts too long (maximum ${MAX_INPUT_LENGTH} characters)` }, { status: 400 });
    }

    const { text: responseText, tokensUsed } = await generateCompletion({
      system: ARGUMENT_SUGGEST_SYSTEM,
      userMessage: `Case type: ${caseType}\n\nFacts: ${facts}`,
      maxTokens: 1024,
    });

    const { allowed } = await checkAndLogAiUsage(session.user.id, 'suggest-arguments', tokensUsed);
    if (!allowed) {
      return NextResponse.json({ error: 'Daily AI limit reached (20 calls/day)' }, { status: 429 });
    }

    let result: { arguments: unknown[] } = { arguments: [] };
    try {
      result = JSON.parse(responseText) as { arguments: unknown[] };
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]) as { arguments: unknown[] };
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[POST /api/ai/suggest-arguments]', err);
    const message = err instanceof Error ? err.message : 'AI service unavailable';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
