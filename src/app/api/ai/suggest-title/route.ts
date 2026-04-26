import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateCompletion } from '@/lib/ai/provider';
import { TITLE_SUGGEST_SYSTEM } from '@/lib/ai/prompts';
import { logAiUsage } from '@/lib/ai/usage';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { description } = await req.json();
    if (!description || description.length < 20) return NextResponse.json({ titles: [] });

    const { text: responseText, tokensUsed } = await generateCompletion({
      system: TITLE_SUGGEST_SYSTEM,
      userMessage: description,
      maxTokens: 256,
    });

    let result: { titles: string[] } = { titles: [] };
    try {
      result = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
    }

    await logAiUsage(session.user.id, 'suggest-title', tokensUsed);

    return NextResponse.json(result);
  } catch (err) {
    console.error('AI suggest-title error:', err);
    return NextResponse.json({ titles: [] });
  }
}
