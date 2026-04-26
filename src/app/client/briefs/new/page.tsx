'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { briefStep1Schema, BriefStep1Data } from '@/lib/utils/validators';
import { LEGAL_CATEGORIES, COURTS, STATES } from '@/types';

const STEPS = ['Basic Info', 'Details', 'Documents', 'Review & Post'];

const URGENCY_OPTIONS = [
  { value: 'standard', label: 'Standard', desc: 'Bidding open for 48 hours', color: 'var(--ink)' },
  { value: 'urgent', label: 'Urgent', desc: 'Bidding open for 24 hours', color: '#9a710a' },
  { value: 'emergency', label: 'Emergency', desc: 'Bidding open for 6 hours', color: 'var(--rust)' },
];

export default function NewBriefPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  // Form data across steps
  const [step1, setStep1] = useState<BriefStep1Data | null>(null);
  const [description, setDescription] = useState('');
  const [budgetMin, setBudgetMin] = useState(500000); // paise
  const [budgetMax, setBudgetMax] = useState(5000000);
  const [aiSummary, setAiSummary] = useState('');
  const [aiStructured, setAiStructured] = useState<Record<string, unknown> | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [suggestedTitle, setSuggestedTitle] = useState('');

  const form1 = useForm<BriefStep1Data>({ resolver: zodResolver(briefStep1Schema) });

  const inputClass = `w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all`;
  const inputStyle = (err: boolean) => ({
    borderColor: err ? 'var(--rust)' : 'rgba(14,12,10,0.15)',
    background: 'var(--cream)',
    fontFamily: "'DM Sans', sans-serif",
  });

  const handleStep1 = (data: BriefStep1Data) => {
    setStep1(data);
    setStep(2);
  };

  const handleAIStructure = async () => {
    if (!description || description.length < 30) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/structure-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: description }),
      });
      const data = await res.json();
      if (data.structured) {
        setAiSummary(data.structured.summary || '');
        setAiStructured(data.structured);
        if (data.structured.suggested_title) setSuggestedTitle(data.structured.suggested_title);
      }
    } catch {
      // silently fail
    }
    setAiLoading(false);
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setUploadedFiles(prev => [...prev, ...files].slice(0, 10));
  };

  const handlePost = async () => {
    if (!step1) return;
    setLoading(true);
    setError('');

    // Create brief via API
    const briefRes = await fetch('/api/briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: step1.title,
        category: step1.category,
        court: step1.court,
        city: step1.city,
        state: step1.state,
        urgency: step1.urgency,
        description,
        structured_summary: aiStructured || (aiSummary ? { summary: aiSummary } : null),
        budget_min: budgetMin,
        budget_max: budgetMax,
      }),
    });

    if (!briefRes.ok) {
      const data = await briefRes.json();
      setError(data.error ?? 'Failed to post brief');
      setLoading(false);
      return;
    }

    const { brief } = await briefRes.json();

    // Upload documents if any
    if (uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('briefId', brief.id);
        await fetch('/api/briefs/upload-document', {
          method: 'POST',
          body: formData,
        });
      }
    }

    router.push(`/client/briefs/${brief.id}`);
  };

  const formatRupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
          Post a New Brief
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
          Describe your matter — verified advocates will send competitive proposals
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '40px', background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '4px', overflow: 'hidden' }}>
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <div key={n} style={{
              flex: 1,
              padding: '10px 8px',
              textAlign: 'center',
              borderRadius: '8px',
              background: active ? 'var(--gold)' : done ? 'rgba(184,134,11,0.08)' : 'transparent',
              transition: 'all 0.2s ease',
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: active ? 'white' : done ? 'var(--gold)' : 'rgba(14,12,10,0.35)',
              }}>
                {done ? '✓ ' : ''}{label}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: 'var(--rust)' }}>
          {error}
        </div>
      )}

      {/* ─── STEP 1: Basic Info ─── */}
      {step === 1 && (
        <form onSubmit={form1.handleSubmit(handleStep1)}
          style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '16px', padding: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>
                Brief Title
              </label>
              <input {...form1.register('title')} placeholder="e.g. Property Boundary Dispute — Thane"
                className={inputClass} style={inputStyle(!!form1.formState.errors.title)} />
              {suggestedTitle && (
                <button type="button" onClick={() => form1.setValue('title', suggestedTitle)}
                  style={{ marginTop: '6px', fontSize: '12px', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Use AI suggestion: &ldquo;{suggestedTitle}&rdquo;
                </button>
              )}
              {form1.formState.errors.title && <p style={{ fontSize: '11px', color: 'var(--rust)', marginTop: '4px' }}>{form1.formState.errors.title.message}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>Legal Category</label>
                <select {...form1.register('category')} className={inputClass} style={inputStyle(!!form1.formState.errors.category)}>
                  <option value="">Select category</option>
                  {LEGAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {form1.formState.errors.category && <p style={{ fontSize: '11px', color: 'var(--rust)', marginTop: '4px' }}>{form1.formState.errors.category.message}</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>Court / Forum</label>
                <select {...form1.register('court')} className={inputClass} style={inputStyle(!!form1.formState.errors.court)}>
                  <option value="">Select court</option>
                  {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>State</label>
                <select {...form1.register('state')} className={inputClass} style={inputStyle(!!form1.formState.errors.state)}>
                  <option value="">Select state</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>City</label>
                <input {...form1.register('city')} placeholder="Mumbai" className={inputClass} style={inputStyle(!!form1.formState.errors.city)} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '10px' }}>Urgency Level</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {URGENCY_OPTIONS.map(opt => {
                  const selected = form1.watch('urgency') === opt.value;
                  return (
                    <label key={opt.value} style={{
                      flex: 1,
                      border: `1px solid ${selected ? opt.color : 'rgba(14,12,10,0.12)'}`,
                      borderRadius: '10px',
                      padding: '12px',
                      cursor: 'pointer',
                      background: selected ? `rgba(${opt.value === 'emergency' ? '192,57,43' : opt.value === 'urgent' ? '212,160,23' : '14,12,10'},0.06)` : 'transparent',
                      transition: 'all 0.15s ease',
                    }}>
                      <input type="radio" {...form1.register('urgency')} value={opt.value} style={{ display: 'none' }} />
                      <div style={{ fontSize: '13px', fontWeight: 600, color: opt.color, marginBottom: '2px' }}>{opt.label}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>{opt.desc}</div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '28px' }}>
            <button type="submit" style={{
              background: 'var(--gold)', color: 'white', padding: '11px 28px',
              borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
            }}>
              Continue →
            </button>
          </div>
        </form>
      )}

      {/* ─── STEP 2: Details ─── */}
      {step === 2 && (
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '16px', padding: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>
                  Describe your legal matter <span style={{ color: 'var(--rust)' }}>*</span>
                </label>
                <button type="button" onClick={handleAIStructure} disabled={aiLoading || description.length < 30}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '12px', fontWeight: 500, color: 'var(--gold)',
                    background: 'rgba(184,134,11,0.08)',
                    border: '1px solid rgba(184,134,11,0.2)',
                    borderRadius: '6px', padding: '6px 12px', cursor: 'pointer',
                    opacity: description.length < 30 ? 0.5 : 1,
                  }}>
                  {aiLoading ? '⏳ Structuring…' : '✨ Structure with AI'}
                </button>
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={8}
                placeholder="Describe your situation in plain language. Include key facts, what happened, what you need, and any important dates or amounts."
                style={{
                  width: '100%', padding: '12px', border: '1px solid rgba(14,12,10,0.15)',
                  borderRadius: '8px', fontSize: '14px', lineHeight: 1.65,
                  background: 'var(--cream)', resize: 'vertical', outline: 'none',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
              <p style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginTop: '6px' }}>
                {description.length} characters · Min. 50 required
              </p>
            </div>

            {aiSummary && (
              <div style={{ padding: '16px', background: 'rgba(13,115,119,0.06)', border: '1px solid rgba(13,115,119,0.15)', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--teal)', marginBottom: '8px' }}>
                  ✨ AI Structured Summary
                </div>
                <p style={{ fontSize: '13px', lineHeight: 1.65, color: 'var(--ink)' }}>{aiSummary}</p>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '12px' }}>
                Budget Range
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'rgba(14,12,10,0.5)' }}>Minimum (₹)</label>
                  <input
                    type="number"
                    value={budgetMin / 100}
                    onChange={e => setBudgetMin(Number(e.target.value) * 100)}
                    min={5000}
                    step={1000}
                    className={inputClass}
                    style={{ ...inputStyle(false), marginTop: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'rgba(14,12,10,0.5)' }}>Maximum (₹)</label>
                  <input
                    type="number"
                    value={budgetMax / 100}
                    onChange={e => setBudgetMax(Number(e.target.value) * 100)}
                    min={5000}
                    step={1000}
                    className={inputClass}
                    style={{ ...inputStyle(false), marginTop: '6px' }}
                  />
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--gold)', marginTop: '8px', fontWeight: 500 }}>
                Budget range: {formatRupees(budgetMin)} – {formatRupees(budgetMax)}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '28px' }}>
            <button onClick={() => setStep(1)} style={{
              background: 'none', border: '1px solid rgba(14,12,10,0.15)', color: 'var(--ink)',
              padding: '11px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
            }}>
              ← Back
            </button>
            <button onClick={() => description.length >= 50 && setStep(3)}
              disabled={description.length < 50}
              style={{
                background: 'var(--gold)', color: 'white', padding: '11px 28px',
                borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                opacity: description.length < 50 ? 0.5 : 1,
              }}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Documents ─── */}
      {step === 3 && (
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '16px', padding: '32px' }}>
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.55)', marginBottom: '24px', lineHeight: 1.65 }}>
            Upload supporting documents (optional but recommended). Advocates with more context submit better proposals.
          </p>

          <div style={{
            border: '2px dashed rgba(14,12,10,0.15)',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: '20px',
          }}
            onClick={() => document.getElementById('file-upload')?.click()}>
            <input id="file-upload" type="file" multiple accept=".pdf,.docx,.jpg,.jpeg,.png"
              style={{ display: 'none' }} onChange={handleFileAdd} />
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📎</div>
            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', marginBottom: '4px' }}>
              Click to upload or drag & drop
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(14,12,10,0.4)' }}>
              PDF, DOCX, JPG, PNG — max 10MB each, up to 10 files
            </p>
          </div>

          {uploadedFiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {uploadedFiles.map((file, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', background: 'var(--cream)', borderRadius: '8px',
                  border: '1px solid rgba(14,12,10,0.08)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>📄</span>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink)' }}>{file.name}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(14,12,10,0.4)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                  </div>
                  <button onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rust)', fontSize: '16px', padding: '4px' }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '8px' }}>
            <button onClick={() => setStep(2)} style={{
              background: 'none', border: '1px solid rgba(14,12,10,0.15)', color: 'var(--ink)',
              padding: '11px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
            }}>
              ← Back
            </button>
            <button onClick={() => setStep(4)} style={{
              background: 'var(--gold)', color: 'white', padding: '11px 28px',
              borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
            }}>
              Review Brief →
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 4: Review ─── */}
      {step === 4 && step1 && (
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '16px', padding: '32px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, color: 'var(--ink)', marginBottom: '24px' }}>
            Review Your Brief
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
            <div style={{ padding: '16px', background: 'var(--cream)', borderRadius: '10px', border: '1px solid rgba(14,12,10,0.08)' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(13,115,119,0.1)', color: 'var(--teal)', fontWeight: 500 }}>{step1.category}</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: step1.urgency === 'emergency' ? 'rgba(192,57,43,0.1)' : 'rgba(14,12,10,0.06)', color: step1.urgency === 'emergency' ? 'var(--rust)' : 'rgba(14,12,10,0.5)', fontWeight: 500 }}>{step1.urgency}</span>
              </div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>{step1.title}</h3>
              <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.5)', marginBottom: '12px' }}>
                {step1.court} · {step1.city}, {step1.state}
              </p>
              <p style={{ fontSize: '13px', lineHeight: 1.65, color: 'rgba(14,12,10,0.7)' }}>{description}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '14px', background: 'var(--cream)', borderRadius: '8px', border: '1px solid rgba(14,12,10,0.08)' }}>
                <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '4px' }}>Budget Range</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 700, color: 'var(--gold)' }}>
                  {formatRupees(budgetMin)} – {formatRupees(budgetMax)}
                </div>
              </div>
              <div style={{ padding: '14px', background: 'var(--cream)', borderRadius: '8px', border: '1px solid rgba(14,12,10,0.08)' }}>
                <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '4px' }}>Documents</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
                  {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: '14px 16px', background: 'rgba(184,134,11,0.06)', borderRadius: '8px', border: '1px solid rgba(184,134,11,0.15)', marginBottom: '28px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.6)', lineHeight: 1.6 }}>
              ✓ Your brief will be visible to verified advocates in <strong>{step1.urgency === 'emergency' ? '6' : step1.urgency === 'urgent' ? '24' : '48'} hours</strong>. Advocates will submit competitive proposals for you to review.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(3)} style={{
              background: 'none', border: '1px solid rgba(14,12,10,0.15)', color: 'var(--ink)',
              padding: '11px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
            }}>
              ← Back
            </button>
            <button onClick={handlePost} disabled={loading} style={{
              background: 'var(--gold)', color: 'white', padding: '11px 32px',
              borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
              opacity: loading ? 0.6 : 1,
            }}>
              {loading ? 'Posting Brief…' : '🚀 Post Brief Now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
