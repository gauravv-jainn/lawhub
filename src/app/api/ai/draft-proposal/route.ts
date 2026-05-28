import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateCompletion } from '@/lib/ai/provider';
import { PROPOSAL_DRAFT_SYSTEM } from '@/lib/ai/prompts';
import { checkAndLogAiUsage } from '@/lib/ai/usage';
import { aiRateLimit } from '@/lib/ratelimit';

const MAX_INPUT_LENGTH = 5000;

export async function POST(req: NextRequest) {
  try {
    const limited = await aiRateLimit(req);
    if (limited) return limited;

    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { briefText, category, practiceAreas, winRate, lawyerName, clientName } = await req.json() as {
      briefText?: string;
      category?: string;
      practiceAreas?: string;
      winRate?: number;
      lawyerName?: string;
      clientName?: string;
    };

    if (!briefText || briefText.length < 20) {
      return NextResponse.json({ error: 'briefText is required (minimum 20 characters)' }, { status: 400 });
    }
    if (briefText.length > MAX_INPUT_LENGTH) {
      return NextResponse.json({ error: `briefText too long (maximum ${MAX_INPUT_LENGTH} characters)` }, { status: 400 });
    }

    const advocateName = lawyerName ?? 'the Advocate';
    const client = clientName ?? 'the Client';

    const userMessage = `Client Name: ${client}
Advocate Name: ${advocateName}
Category: ${category ?? 'General'}
${practiceAreas ? `Advocate's Practice Areas: ${practiceAreas}` : ''}
${winRate != null ? `Advocate's Win Rate: ${winRate}%` : ''}

Client Brief:
${briefText}

Draft a professional proposal using the names provided. Output only JSON.`;

    const { text: raw, tokensUsed } = await generateCompletion({
      system: PROPOSAL_DRAFT_SYSTEM,
      userMessage,
      maxTokens: 1024,
    });

    const { allowed } = await checkAndLogAiUsage(session.user.id, 'draft-proposal', tokensUsed);
    if (!allowed) {
      return NextResponse.json({ error: 'Daily AI limit reached (20 calls/day)' }, { status: 429 });
    }

    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    let sections: Record<string, string>;
    try {
      sections = JSON.parse(cleaned) as Record<string, string>;
    } catch {
      return NextResponse.json({ sections: null, proposal: raw });
    }

    const keys = ['opening', 'understanding', 'strategy', 'why_me', 'closing'];
    for (const k of keys) {
      if (!sections[k]) sections[k] = '';
    }

    const proposal = [
      sections.opening, '',
      sections.understanding, '',
      sections.strategy, '',
      sections.why_me, '',
      sections.closing,
    ].join('\n');

    return NextResponse.json({ sections, proposal });
  } catch (err: unknown) {
    console.error('[POST /api/ai/draft-proposal]', err);
    const message = err instanceof Error ? err.message : 'AI service unavailable';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
