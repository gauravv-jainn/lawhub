'use client'

import { useState } from 'react'

interface Props {
  caseType: string
  caseFacts: string
}

interface Argument {
  point: string
  detail: string
  citation: string
}

export default function SuggestArgumentsAI({ caseType, caseFacts }: Props) {
  const [loading, setLoading] = useState(false)
  const [args, setArgs] = useState<Argument[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function run() {
    if (args) { setOpen(o => !o); return }
    setLoading(true)
    setError(null)
    setOpen(true)

    try {
      const res = await fetch('/api/ai/suggest-arguments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseType, facts: caseFacts }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'AI unavailable')
      setArgs(data.arguments ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: open ? '20px' : '0' }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
          AI Legal Arguments
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
          {loading ? '⏳ Generating…' : args ? (open ? '▲ Hide' : '▼ Show') : '✨ Suggest Arguments'}
        </button>
      </div>

      {open && (
        <>
          {error && (
            <div style={{ padding: '12px', background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: '8px', fontSize: '13px', color: 'var(--rust)' }}>
              {error}
            </div>
          )}

          {loading && !args && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(14,12,10,0.4)', fontSize: '13px' }}>
              AI is researching legal arguments…
            </div>
          )}

          {args && args.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {args.map((arg, i) => (
                <div key={i} style={{
                  padding: '16px',
                  border: '1px solid rgba(14,12,10,0.08)',
                  borderLeft: '3px solid var(--teal)',
                  borderRadius: '0 8px 8px 0',
                  background: i === 0 ? 'rgba(13,115,119,0.02)' : 'transparent',
                }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <span style={{
                      width: '22px', height: '22px', borderRadius: '50%',
                      background: 'var(--teal)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 700, flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)', lineHeight: 1.3 }}>
                      {arg.point}
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: 'rgba(14,12,10,0.65)', lineHeight: 1.6, marginLeft: '32px', marginBottom: '8px' }}>
                    {arg.detail}
                  </p>
                  <div style={{ marginLeft: '32px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', background: 'rgba(13,115,119,0.08)', borderRadius: '100px' }}>
                    <span style={{ fontSize: '10px' }}>⚖️</span>
                    <span style={{ fontSize: '11px', color: 'var(--teal)', fontWeight: 500 }}>{arg.citation}</span>
                  </div>
                </div>
              ))}

              <p style={{ fontSize: '11px', color: 'rgba(14,12,10,0.3)', textAlign: 'center', marginTop: '4px' }}>
                Verify citations with official sources before court submission.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
