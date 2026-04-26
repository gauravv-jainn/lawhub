'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bidSubmitSchema, BidSubmitData } from '@/lib/utils/validators';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import type { Brief } from '@/types';

interface Props {
  brief: Brief & { client_name?: string | null };
  lawyerId: string;
  lawyerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProposalSections {
  opening: string;
  understanding: string;
  strategy: string;
  why_me: string;
  closing: string;
}

const SECTION_META: { key: keyof ProposalSections; label: string; hint: string }[] = [
  { key: 'opening',       label: 'Opening & Salutation',       hint: 'Address the client, introduce yourself briefly.' },
  { key: 'understanding', label: 'Understanding of the Matter', hint: 'Show that you understand the client\'s legal situation.' },
  { key: 'strategy',      label: 'Proposed Legal Strategy',     hint: 'Legal approach, key arguments, relevant statutes or case law.' },
  { key: 'why_me',        label: 'Why I\'m the Right Advocate', hint: 'Your specific experience, specialisation, or win rate.' },
  { key: 'closing',       label: 'Professional Closing',        hint: 'Call to action, sign-off with your name.' },
];

const FEE_STRUCTURES = [
  { value: 'flat',      label: 'Flat Fee' },
  { value: 'milestone', label: 'Milestone-based' },
  { value: 'retainer',  label: 'Retainer + Appearance' },
  { value: 'hourly',    label: 'Hourly Rate' },
];

const AVAILABILITY = ['Immediately', 'Within 1 week', 'Within 2 weeks'];

export default function BidDrawer({ brief, lawyerId, lawyerName, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  // AI sections state
  const [sections, setSections] = useState<ProposalSections | null>(null);
  const [showMerged, setShowMerged] = useState(false);
  const [mergedText, setMergedText] = useState('');

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<BidSubmitData>({
    resolver: zodResolver(bidSubmitSchema),
    defaultValues: {
      fee_structure: 'flat',
      milestone_count: 2,
      availability: 'Immediately',
    },
  });

  const feeStructure = watch('fee_structure');

  // ── AI Draft ──────────────────────────────────────────────────────────────
  const handleAIDraft = async () => {
    setAiLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/draft-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefText: brief.description,
          category: brief.category,
          lawyerName,
          clientName: brief.client_name ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'AI unavailable');

      if (data.sections) {
        setSections(data.sections);
        setMergedText(data.proposal ?? '');
        setValue('strategy_text', data.proposal ?? '');
        setValue('cover_letter', data.proposal ?? '');
        setShowMerged(false);
      } else if (data.proposal) {
        // Fallback: no structured sections
        setMergedText(data.proposal);
        setValue('strategy_text', data.proposal);
        setValue('cover_letter', data.proposal);
        setShowMerged(true);
      }
    } catch (e: any) {
      setError(e.message ?? 'AI failed — please try again');
    }
    setAiLoading(false);
  };

  // Update a single section and re-merge
  const updateSection = (key: keyof ProposalSections, val: string) => {
    const updated = { ...sections!, [key]: val };
    setSections(updated);
    const merged = SECTION_META.map(s => updated[s.key]).filter(Boolean).join('\n\n');
    setMergedText(merged);
    setValue('strategy_text', merged);
    setValue('cover_letter', merged);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (data: BidSubmitData) => {
    setLoading(true);
    setError('');

    const res = await fetch('/api/bids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief_id: brief.id,
        lawyer_id: lawyerId,
        proposed_fee: data.proposed_fee * 100,
        fee_structure: data.fee_structure,
        milestone_count: data.fee_structure === 'milestone' ? (data.milestone_count ?? 2) : 1,
        strategy_text: data.strategy_text,
        cover_letter: data.cover_letter,
        relevant_experience: data.relevant_experience ?? null,
        availability: data.availability,
        estimated_timeline: data.estimated_timeline,
        status: 'pending',
      }),
    });

    if (!res.ok) {
      const resData = await res.json().catch(() => ({}));
      const msg = resData?.error ?? 'Failed to submit proposal';
      setError(msg.includes('unique') ? 'You have already submitted a proposal for this brief.' : msg);
      setLoading(false);
      return;
    }

    onSuccess();
  };

  const inputStyle = (err?: boolean) => ({
    width: '100%',
    padding: '9px 12px',
    border: `1px solid ${err ? 'var(--rust)' : 'rgba(14,12,10,0.15)'}`,
    borderRadius: '8px',
    fontSize: '13px',
    background: 'var(--cream)',
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: 'border-box' as const,
  });

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(14,12,10,0.4)', zIndex: 200 }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '520px', maxWidth: '100vw',
        background: 'var(--cream)', zIndex: 201,
        overflowY: 'auto',
        boxShadow: '-4px 0 24px rgba(14,12,10,0.12)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(14,12,10,0.08)', background: 'white', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Submitting Proposal For
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '2px' }}>
                {brief.title}
              </h2>
              <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>
                {brief.category} · {formatCurrency(brief.budget_min)} – {formatCurrency(brief.budget_max)}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: 'rgba(14,12,10,0.4)', padding: '4px', lineHeight: 1 }}>
              ×
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: '8px', fontSize: '13px', color: 'var(--rust)' }}>
              {error}
            </div>
          )}

          {/* ── AI DRAFT BUTTON ─────────────────────────────────── */}
          <button type="button" onClick={handleAIDraft} disabled={aiLoading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '11px', background: aiLoading ? 'rgba(184,134,11,0.06)' : 'rgba(184,134,11,0.1)',
              border: '1px solid rgba(184,134,11,0.25)',
              borderRadius: '8px', cursor: aiLoading ? 'wait' : 'pointer',
              fontSize: '13px', fontWeight: 600, color: 'var(--gold)',
              opacity: aiLoading ? 0.7 : 1,
            }}>
            {aiLoading
              ? '⏳ Drafting proposal with AI…'
              : sections
                ? '↺ Re-draft with AI'
                : '✨ Draft Proposal with AI'}
          </button>

          {/* ── AI SECTIONS (after draft) ───────────────────────── */}
          {sections && !showMerged && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>✨ AI Drafted — edit each section below</span>
                <button
                  type="button"
                  onClick={() => setShowMerged(true)}
                  style={{ fontSize: '11px', color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, textDecoration: 'underline' }}
                >
                  Switch to single text
                </button>
              </div>

              {SECTION_META.map((sm, i) => (
                <div key={sm.key} style={{
                  background: 'white',
                  border: '1px solid rgba(14,12,10,0.08)',
                  borderLeft: '3px solid var(--teal)',
                  borderRadius: '0 8px 8px 0',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '8px 12px',
                    background: 'rgba(13,115,119,0.04)',
                    borderBottom: '1px solid rgba(14,12,10,0.06)',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    <span style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: 'var(--teal)', color: 'white',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 700, flexShrink: 0,
                    }}>{i + 1}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {sm.label}
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginLeft: 'auto' }}>
                      {sm.hint}
                    </span>
                  </div>
                  <textarea
                    value={sections[sm.key]}
                    onChange={e => updateSection(sm.key, e.target.value)}
                    rows={sm.key === 'strategy' ? 5 : 3}
                    style={{
                      width: '100%', padding: '10px 12px',
                      border: 'none', outline: 'none',
                      fontSize: '13px', lineHeight: 1.65,
                      color: 'var(--ink)', background: 'white',
                      resize: 'vertical', fontFamily: "'DM Sans', sans-serif",
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── MERGED / MANUAL TEXT AREA ──────────────────────── */}
          {(!sections || showMerged) && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink)' }}>
                  Strategy & Cover Letter <span style={{ color: 'var(--rust)' }}>*</span>
                </label>
                {sections && showMerged && (
                  <button
                    type="button"
                    onClick={() => setShowMerged(false)}
                    style={{ fontSize: '11px', color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, textDecoration: 'underline' }}
                  >
                    Back to sections
                  </button>
                )}
              </div>
              <textarea
                {...register('strategy_text')}
                value={mergedText}
                onChange={e => {
                  setMergedText(e.target.value);
                  setValue('strategy_text', e.target.value);
                  setValue('cover_letter', e.target.value);
                }}
                rows={10}
                placeholder="Describe your legal strategy, relevant experience, and why you are the right advocate for this matter…"
                style={{ ...inputStyle(!!errors.strategy_text), resize: 'vertical' }}
              />
              {errors.strategy_text && <p style={{ fontSize: '11px', color: 'var(--rust)', marginTop: '4px' }}>{errors.strategy_text.message}</p>}
            </div>
          )}

          {/* ── FEE ──────────────────────────────────────────────── */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>
              Proposed Fee (₹) <span style={{ color: 'var(--rust)' }}>*</span>
            </label>
            <input {...register('proposed_fee')} type="number" placeholder="35000 (₹35,000)" min="1000" style={inputStyle(!!errors.proposed_fee)} />
            {errors.proposed_fee && <p style={{ fontSize: '11px', color: 'var(--rust)', marginTop: '4px' }}>{errors.proposed_fee.message}</p>}
          </div>

          {/* ── FEE STRUCTURE ────────────────────────────────────── */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>Fee Structure</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {FEE_STRUCTURES.map(fs => {
                const selected = feeStructure === fs.value;
                return (
                  <label key={fs.value} style={{
                    padding: '9px 12px',
                    border: `1px solid ${selected ? 'var(--gold)' : 'rgba(14,12,10,0.12)'}`,
                    borderRadius: '8px', cursor: 'pointer',
                    background: selected ? 'rgba(184,134,11,0.06)' : 'white',
                    fontSize: '12px', fontWeight: selected ? 600 : 400,
                    color: selected ? 'var(--gold)' : 'var(--ink)',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <input type="radio" {...register('fee_structure')} value={fs.value} style={{ display: 'none' }} />
                    {fs.label}
                  </label>
                );
              })}
            </div>
          </div>

          {feeStructure === 'milestone' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>Number of Milestones</label>
              <input {...register('milestone_count')} type="number" min="2" max="10" style={inputStyle()} />
            </div>
          )}

          {/* ── RELEVANT EXPERIENCE ──────────────────────────────── */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>Similar Cases Experience</label>
            <input {...register('relevant_experience')} placeholder="E.g. Handled 12 property disputes in Bombay HC, 2019–2024" style={inputStyle()} />
          </div>

          {/* ── TIMELINE ─────────────────────────────────────────── */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>
              Estimated Timeline <span style={{ color: 'var(--rust)' }}>*</span>
            </label>
            <input {...register('estimated_timeline')} placeholder="E.g. 4–6 months for trial court resolution" style={inputStyle(!!errors.estimated_timeline)} />
            {errors.estimated_timeline && <p style={{ fontSize: '11px', color: 'var(--rust)', marginTop: '4px' }}>{errors.estimated_timeline.message}</p>}
          </div>

          {/* ── AVAILABILITY ─────────────────────────────────────── */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>Availability</label>
            <select {...register('availability')} style={inputStyle()}>
              {AVAILABILITY.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* ── SUBMIT ───────────────────────────────────────────── */}
          <button type="submit" disabled={loading}
            style={{
              background: 'var(--gold)', color: 'white', border: 'none',
              padding: '13px', borderRadius: '8px', cursor: 'pointer',
              fontSize: '14px', fontWeight: 600, opacity: loading ? 0.6 : 1,
              marginTop: '4px',
            }}>
            {loading ? 'Submitting…' : '📤 Submit Proposal'}
          </button>

          <p style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', textAlign: 'center' }}>
            Proposals can be withdrawn within 1 hour if the client hasn&apos;t viewed it.
          </p>
        </form>
      </div>
    </>
  );
}
