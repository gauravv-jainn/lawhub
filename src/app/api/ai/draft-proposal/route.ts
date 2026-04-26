import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateCompletion } from '@/lib/ai/provider';
import { PROPOSAL_DRAFT_SYSTEM } from '@/lib/ai/prompts';
import { isAiLimitReached, logAiUsage } from '@/lib/ai/usage';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (await isAiLimitReached(session.user.id)) {
      return NextResponse.json({ error: 'Daily AI limit reached' }, { status: 429 });
    }

    const { briefText, category, practiceAreas, winRate, lawyerName, clientName } = await req.json();

    const advocateName = lawyerName || 'the Advocate';
    const client = clientName || 'the Client';

    const userMessage = `Client Name: ${client}
Advocate Name: ${advocateName}
Category: ${category || 'General'}
${practiceAreas ? `Advocate's Practice Areas: ${practiceAreas}` : ''}
${winRate ? `Advocate's Win Rate: ${winRate}%` : ''}

Client Brief:
${briefText}

Draft a professional proposal using the names provided. Output only JSON.`;

    const { text: raw, tokensUsed } = await generateCompletion({
      system: PROPOSAL_DRAFT_SYSTEM,
      userMessage,
      maxTokens: 1024,
    });

    await logAiUsage(session.user.id, 'draft-proposal', tokensUsed);

    // Parse JSON — strip markdown fences if the model added them
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    let sections: Record<string, string>;
    try {
      sections = JSON.parse(cleaned);
    } catch {
      // Fallback: return as a single blob so UI can still show something
      return NextResponse.json({ sections: null, proposal: raw });
    }

    // Validate all five keys exist
    const keys = ['opening', 'understanding', 'strategy', 'why_me', 'closing'];
    for (const k of keys) {
      if (!sections[k]) sections[k] = '';
    }

    // Also build a merged plain-text version for the single-textarea fallback
    const proposal = [
      sections.opening,
      '',
      sections.understanding,
      '',
      sections.strategy,
      '',
      sections.why_me,
      '',
      sections.closing,
    ].join('\n');

    return NextResponse.json({ sections, proposal });
  } catch (err) {
    console.error('AI draft-proposal error:', err);
    const message = err instanceof Error ? err.message : 'AI service unavailable';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
