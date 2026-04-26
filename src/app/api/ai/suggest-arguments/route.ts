import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateCompletion } from '@/lib/ai/provider';
import { ARGUMENT_SUGGEST_SYSTEM } from '@/lib/ai/prompts';
import { isAiLimitReached, logAiUsage } from '@/lib/ai/usage';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (await isAiLimitReached(session.user.id)) {
      return NextResponse.json({ error: 'Daily AI limit reached' }, { status: 429 });
    }

    const { caseType, facts } = await req.json();

    const { text: responseText, tokensUsed } = await generateCompletion({
      system: ARGUMENT_SUGGEST_SYSTEM,
      userMessage: `Case type: ${caseType}\n\nFacts: ${facts}`,
      maxTokens: 1024,
    });

    let result: { arguments: unknown[] } = { arguments: [] };
    try {
      result = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
    }

    await logAiUsage(session.user.id, 'suggest-arguments', tokensUsed);

    return NextResponse.json(result);
  } catch (err) {
    console.error('AI suggest-arguments error:', err);
    const message = err instanceof Error ? err.message : 'AI service unavailable';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
