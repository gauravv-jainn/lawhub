import OpenAI from 'openai';

export async function generateCaseSummary(input: string) {
  if (!process.env.OPENAI_API_KEY) {
    return { summary: 'AI key missing. Fallback summary generated from provided facts.', risks: ['Manual review pending'], nextSteps: ['Verify pleadings timeline'] };
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });
  const resp = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Return strict JSON: {summary:string,risks:string[],nextSteps:string[]} for Indian civil litigation.' },
      { role: 'user', content: input }
    ]
  });
  return JSON.parse(resp.choices[0]?.message?.content || '{}');
}
