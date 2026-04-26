import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateCompletion } from '@/lib/ai/provider';
import { CASE_SUMMARY_SYSTEM } from '@/lib/ai/prompts';
import { isAiLimitReached, logAiUsage } from '@/lib/ai/usage';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (await isAiLimitReached(session.user.id)) {
      return NextResponse.json({ error: 'Daily AI limit reached' }, { status: 429 });
    }

    const { briefText, events, documents } = await req.json();

    const userMessage = `Brief Description:
${briefText}

Timeline Events:
${events?.map((e: { title: string; description?: string }) => `- ${e.title}: ${e.description || ''}`).join('\n') || 'None yet'}

Uploaded Documents: ${documents?.join(', ') || 'None'}

Please analyze this case.`;

    const { text: responseText, tokensUsed } = await generateCompletion({
      system: CASE_SUMMARY_SYSTEM,
      userMessage,
      maxTokens: 1024,
    });

    let analysis: Record<string, unknown>;
    try {
      analysis = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      analysis = match ? JSON.parse(match[0]) : { summary: responseText, strength: 'Medium' };
    }

    await logAiUsage(session.user.id, 'summarize-case', tokensUsed);

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error('AI summarize-case error:', err);
    const message = err instanceof Error ? err.message : 'AI service unavailable';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
