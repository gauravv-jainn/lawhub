'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Common rejection reasons admins can pick from — they can also free-type
const PRESET_REASONS = [
  'BCI certificate is unclear or unreadable — please re-upload a higher-quality scan.',
  'BCI certificate appears expired or the enrolment number does not match your registration.',
  'Aadhaar card is blurry or key details are not visible — please re-upload.',
  'Degree certificate is missing or the university name / year of passing is not legible.',
  'The uploaded documents do not match the name provided in the registration.',
  'One or more required documents are missing — please upload all three: BCI certificate, Aadhaar, and degree.',
];

export default function LawyerVerificationActions({ lawyerId }: { lawyerId: string }) {
  const [loading, setLoading]           = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [resubmissionNote, setResubmissionNote] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [error, setError]               = useState('');
  const router = useRouter();

  async function callApi(action: string, extraBody?: object) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/verify-lawyer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ lawyerId, action, ...extraBody }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Action failed.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleApprove() {
    callApi('approve');
  }

  function handleReject() {
    const reason = rejectionReason.trim() || selectedPreset;
    if (!reason) { setError('Please select or write a rejection reason.'); return; }
    callApi('reject', {
      reason,
      resubmission_note: resubmissionNote.trim() || undefined,
    });
  }

  if (!showRejectForm) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        {error && <div style={{ fontSize: '11px', color: '#c0392b' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleApprove}
            disabled={loading}
            style={{
              background: '#1A6B3A', color: 'white', border: 'none',
              padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600, opacity: loading ? 0.6 : 1,
            }}
          >
            ✓ Approve
          </button>
          <button
            onClick={() => { setShowRejectForm(true); setError(''); }}
            disabled={loading}
            style={{
              background: 'var(--rust)', color: 'white', border: 'none',
              padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600,
            }}
          >
            ✗ Reject
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Preset rejection reasons */}
      <div>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(14,12,10,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
          Select a reason (or write below)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {PRESET_REASONS.map((preset, i) => (
            <button
              key={i}
              onClick={() => { setSelectedPreset(preset); setRejectionReason(''); }}
              style={{
                padding: '7px 10px', borderRadius: '6px', fontSize: '11px',
                textAlign: 'left', cursor: 'pointer', lineHeight: 1.4,
                background: selectedPreset === preset ? 'rgba(192,57,43,0.08)' : 'rgba(14,12,10,0.03)',
                border: selectedPreset === preset ? '1px solid rgba(192,57,43,0.25)' : '1px solid transparent',
                color: 'var(--ink)',
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Or custom reason */}
      <div>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(14,12,10,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
          Or write a custom reason
        </div>
        <textarea
          value={rejectionReason}
          onChange={(e) => { setRejectionReason(e.target.value); setSelectedPreset(null); }}
          placeholder="Specific issue with the documents…"
          rows={2}
          style={{
            width: '100%', padding: '8px 10px', border: '1px solid rgba(14,12,10,0.15)',
            borderRadius: '6px', fontSize: '12px', resize: 'vertical', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Resubmission guidance note */}
      <div>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(14,12,10,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
          Guidance for resubmission (optional)
        </div>
        <textarea
          value={resubmissionNote}
          onChange={(e) => setResubmissionNote(e.target.value)}
          placeholder="e.g. Scan at 300 DPI minimum. All four corners of the certificate must be visible."
          rows={2}
          style={{
            width: '100%', padding: '8px 10px', border: '1px solid rgba(14,12,10,0.15)',
            borderRadius: '6px', fontSize: '12px', resize: 'vertical', boxSizing: 'border-box',
          }}
        />
      </div>

      {error && (
        <div style={{ fontSize: '11px', color: '#c0392b', padding: '6px 8px', background: 'rgba(192,57,43,0.06)', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleReject}
          disabled={loading || (!rejectionReason.trim() && !selectedPreset)}
          style={{
            flex: 1, background: 'var(--rust)', color: 'white', border: 'none',
            padding: '9px', borderRadius: '6px', cursor: 'pointer',
            fontSize: '12px', fontWeight: 600,
            opacity: (loading || (!rejectionReason.trim() && !selectedPreset)) ? 0.5 : 1,
          }}
        >
          {loading ? 'Sending…' : 'Confirm Reject'}
        </button>
        <button
          onClick={() => { setShowRejectForm(false); setRejectionReason(''); setSelectedPreset(null); setError(''); }}
          style={{
            padding: '9px 14px', background: 'none', border: '1px solid rgba(14,12,10,0.15)',
            borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--ink)',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
