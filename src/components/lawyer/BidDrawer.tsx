'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { proposalSubmitSchema } from '@/lib/utils/validators';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import type { Brief } from '@/types';
import { z } from 'zod';

// Form schema — brief_id is added to the payload at submit time, not a form field
const proposalFormSchema = proposalSubmitSchema.omit({ brief_id: true });
type ProposalFormData = z.infer<typeof proposalFormSchema>;

interface Props {
  brief: Brief & { client_name?: string | null };
  lawyerId: string;
  lawyerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const FEE_STRUCTURES = [
  { value: 'flat',      label: 'Flat Fee' },
  { value: 'milestone', label: 'Milestone-based' },
  { value: 'retainer',  label: 'Retainer + Appearance' },
  { value: 'hourly',    label: 'Hourly Rate' },
];

const AVAILABILITY = ['Immediately', 'Within 1 week', 'Within 2 weeks'];

export default function BidDrawer({ brief, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const { register, handleSubmit, formState: { errors }, watch } = useForm<ProposalFormData>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      fee_structure:  'flat',
      milestone_count: 2,
      availability:   'Immediately',
    },
  });

  const feeStructure = watch('fee_structure');

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data: ProposalFormData) => {
    setLoading(true);
    setError('');

    const res = await fetch('/api/proposals', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        brief_id:           brief.id,
        proposed_fee:       data.proposed_fee * 100,   // rupees → paise
        fee_structure:      data.fee_structure,
        milestone_count:    data.fee_structure === 'milestone' ? (data.milestone_count ?? 2) : 1,
        strategy_text:      data.strategy_text,
        cover_letter:       data.strategy_text,         // same content, kept for API compat
        relevant_experience: data.relevant_experience ?? null,
        availability:       data.availability,
        estimated_timeline: data.estimated_timeline,
        status:             'pending',
      }),
    });

    if (!res.ok) {
      const resData = await res.json().catch(() => ({}));
      const msg = resData?.error ?? 'Failed to submit proposal';
      setError(msg.includes('unique') || msg.includes('already') ? 'You have already submitted a proposal for this brief.' : msg);
      setLoading(false);
      return;
    }

    onSuccess();
  };

  const inputStyle = (err?: boolean) => ({
    width:        '100%',
    padding:      '9px 12px',
    border:       `1px solid ${err ? 'var(--rust)' : 'rgba(14,12,10,0.15)'}`,
    borderRadius: '8px',
    fontSize:     '13px',
    background:   'var(--cream)',
    outline:      'none',
    fontFamily:   "'DM Sans', sans-serif",
    boxSizing:    'border-box' as const,
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

          {/* ── Strategy & Cover Letter ───────────────────────────── */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>
              Strategy & Cover Letter <span style={{ color: 'var(--rust)' }}>*</span>
            </label>
            <p style={{ fontSize: '11px', color: 'rgba(14,12,10,0.45)', marginBottom: '8px', lineHeight: 1.5 }}>
              Describe your legal strategy, relevant experience, and why you are the right advocate for this matter. Min. 100 characters.
            </p>
            <textarea
              {...register('strategy_text')}
              rows={10}
              placeholder="Outline your approach to this case, key legal arguments, applicable statutes or precedents, and what the client can expect from working with you…"
              style={{ ...inputStyle(!!errors.strategy_text), resize: 'vertical' }}
            />
            {errors.strategy_text && <p style={{ fontSize: '11px', color: 'var(--rust)', marginTop: '4px' }}>{errors.strategy_text.message}</p>}
          </div>

          {/* ── Proposed Fee ─────────────────────────────────────────── */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>
              Proposed Fee (₹) <span style={{ color: 'var(--rust)' }}>*</span>
            </label>
            <input {...register('proposed_fee')} type="number" placeholder="35000 for ₹35,000" min="1000" style={inputStyle(!!errors.proposed_fee)} />
            {errors.proposed_fee && <p style={{ fontSize: '11px', color: 'var(--rust)', marginTop: '4px' }}>{errors.proposed_fee.message}</p>}
          </div>

          {/* ── Fee Structure ─────────────────────────────────────────── */}
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

          {/* ── Relevant Experience ────────────────────────────────────── */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>Similar Cases Experience</label>
            <input {...register('relevant_experience')} placeholder="E.g. Handled 12 property disputes in Bombay HC, 2019–2024" style={inputStyle()} />
          </div>

          {/* ── Estimated Timeline ─────────────────────────────────────── */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>
              Estimated Timeline <span style={{ color: 'var(--rust)' }}>*</span>
            </label>
            <input {...register('estimated_timeline')} placeholder="E.g. 4–6 months for trial court resolution" style={inputStyle(!!errors.estimated_timeline)} />
            {errors.estimated_timeline && <p style={{ fontSize: '11px', color: 'var(--rust)', marginTop: '4px' }}>{errors.estimated_timeline.message}</p>}
          </div>

          {/* ── Availability ───────────────────────────────────────────── */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>Availability</label>
            <select {...register('availability')} style={inputStyle()}>
              {AVAILABILITY.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* ── Submit ─────────────────────────────────────────────────── */}
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
            You can withdraw your proposal from the My Proposals page before it is accepted.
          </p>
        </form>
      </div>
    </>
  );
}
