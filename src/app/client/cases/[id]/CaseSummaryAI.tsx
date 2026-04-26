'use client'

import { useState } from 'react'

interface Event {
  title: string
  description?: string | null
}

interface Props {
  caseTitle: string
  caseCategory: string
  events: Event[]
}

interface Analysis {
  summary: string
  strength: 'High' | 'Medium' | 'Low'
  strength_rationale: string
  key_arguments: string[]
  next_steps: string[]
}

const strengthStyle: Record<string, { bg: string; color: string }> = {
  High:   { bg: 'rgba(26,107,58,0.1)',   color: '#1A6B3A' },
  Medium: { bg: 'rgba(184,134,11,0.1)',  color: '#9a710a' },
  Low:    { bg: 'rgba(192,57,43,0.1)',   color: 'var(--rust)' },
}

export default function CaseSummaryAI({ caseTitle, caseCategory, events }: Props) {
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function run() {
    if (analysis) { setOpen(o => !o); return }
    setLoading(true)
    setError(null)
    setOpen(true)

    try {
      const res = await fetch('/api/ai/summarize-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefText: `${caseTitle} (${caseCategory})`,
          events,
          documents: [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'AI unavailable')
      setAnalysis(data.analysis)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const s = analysis ? (strengthStyle[analysis.strength] ?? strengthStyle.Medium) : null

  return (
    <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: open ? '20px' : '0' }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
          AI Case Analysis
        </h2>
        <button
          onClick={run}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px',
            background: loading ? 'rgba(184,134,11,0.06)' : 'rgba(184,134,11,0.1)',
            border: '1px solid rgba(184,134,11,0.25)',
            borderRadius: '8px',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '13px', fontWeight: 500, color: 'var(--gold)',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? '⏳ Analysing…' : analysis ? (open ? '▲ Hide' : '▼ Show') : '✨ Analyse with AI'}
        </button>
      </div>

      {open && (
        <>
          {error && (
            <div style={{ padding: '12px', background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: '8px', fontSize: '13px', color: 'var(--rust)' }}>
              {error}
            </div>
          )}

          {loading && !analysis && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(14,12,10,0.4)', fontSize: '13px' }}>
              AI is analysing your case…
            </div>
          )}

          {analysis && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Strength */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: s!.bg, borderRadius: '8px' }}>
                <div style={{ fontSize: '24px' }}>
                  {analysis.strength === 'High' ? '💪' : analysis.strength === 'Medium' ? '⚖️' : '⚠️'}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: s!.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                    Case Strength: {analysis.strength}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.6)', lineHeight: 1.5 }}>
                    {analysis.strength_rationale}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(14,12,10,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Summary
                </div>
                <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'rgba(14,12,10,0.7)' }}>
                  {analysis.summary}
                </p>
              </div>

              {/* Key Arguments */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(14,12,10,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                  Key Arguments in Your Favour
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {analysis.key_arguments.map((arg, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'rgba(14,12,10,0.7)' }}>
                      <span style={{ color: 'var(--teal)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                      <span style={{ lineHeight: 1.5 }}>{arg}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Steps */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(14,12,10,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                  Recommended Next Steps
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {analysis.next_steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', padding: '10px 12px', background: 'var(--cream)', borderRadius: '8px', fontSize: '13px', color: 'rgba(14,12,10,0.7)' }}>
                      <span style={{ color: 'var(--gold)', fontWeight: 700, flexShrink: 0 }}>→</span>
                      <span style={{ lineHeight: 1.5 }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p style={{ fontSize: '11px', color: 'rgba(14,12,10,0.3)', textAlign: 'center', marginTop: '4px' }}>
                AI analysis is indicative only — consult your advocate for legal advice.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
