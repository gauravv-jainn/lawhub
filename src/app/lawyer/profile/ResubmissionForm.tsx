'use client';

/**
 * ResubmissionForm — shown to lawyers whose verification was rejected.
 * Allows re-uploading documents (via Cloudinary unsigned upload preset)
 * and submitting a note about the changes made.
 *
 * On submit → POST /api/lawyer/resubmit-verification
 */

import { useState } from 'react';

interface Props {
  currentBciUrl:    string | null;
  currentAadhaarUrl: string | null;
  currentDegreeUrl: string | null;
  resubmissionNote: string | null; // admin guidance if provided
}

interface DocState {
  url:      string | null;
  uploading: boolean;
  error:    string;
}

const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';
const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';

async function uploadToCloudinary(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  fd.append('folder', 'lawhub/verification');

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
    method: 'POST',
    body:   fd,
  });
  if (!res.ok) throw new Error('Upload failed');
  const data = await res.json();
  return data.secure_url as string;
}

export default function ResubmissionForm({
  currentBciUrl,
  currentAadhaarUrl,
  currentDegreeUrl,
  resubmissionNote,
}: Props) {
  const [bci,    setBci]    = useState<DocState>({ url: currentBciUrl,     uploading: false, error: '' });
  const [aadhaar, setAadhaar] = useState<DocState>({ url: currentAadhaarUrl, uploading: false, error: '' });
  const [degree,  setDegree]  = useState<DocState>({ url: currentDegreeUrl,  uploading: false, error: '' });
  const [note,    setNote]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [submitError, setSubmitError] = useState('');

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<DocState>>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate: PDF/image, max 5MB
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setter(s => ({ ...s, error: 'Only PDF, JPG, PNG, or WebP files are accepted.' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setter(s => ({ ...s, error: 'File must be smaller than 5 MB.' }));
      return;
    }

    setter(s => ({ ...s, uploading: true, error: '' }));
    try {
      const url = await uploadToCloudinary(file);
      setter({ url, uploading: false, error: '' });
    } catch {
      setter(s => ({ ...s, uploading: false, error: 'Upload failed. Please try again.' }));
    }
  }

  async function handleSubmit() {
    const hasNewDoc = bci.url !== currentBciUrl || aadhaar.url !== currentAadhaarUrl || degree.url !== currentDegreeUrl;
    const hasAnyDoc = bci.url || aadhaar.url || degree.url;

    if (!hasAnyDoc) {
      setSubmitError('Please upload at least one document before resubmitting.');
      return;
    }
    if (!hasNewDoc) {
      setSubmitError('Please upload at least one new or updated document.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/lawyer/resubmit-verification', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          bci_doc_url:     bci.url     !== currentBciUrl     ? bci.url     : undefined,
          aadhaar_doc_url: aadhaar.url !== currentAadhaarUrl ? aadhaar.url : undefined,
          degree_doc_url:  degree.url  !== currentDegreeUrl  ? degree.url  : undefined,
          note:            note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error ?? 'Submission failed.');
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ background: 'rgba(26,107,58,0.06)', border: '1px solid rgba(26,107,58,0.2)', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
        <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)', marginBottom: '6px' }}>
          Documents Resubmitted
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.55)', margin: 0 }}>
          Our team will review your updated documents and notify you within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Admin guidance note */}
      {resubmissionNote && (
        <div style={{ background: 'rgba(25,113,194,0.06)', border: '1px solid rgba(25,113,194,0.2)', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#1971c2', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Guidance from our review team
          </div>
          <p style={{ fontSize: '13px', color: 'var(--ink)', margin: 0, lineHeight: 1.5 }}>
            {resubmissionNote}
          </p>
        </div>
      )}

      {/* Upload guidance */}
      <div style={{ background: '#f8f9fa', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '10px', padding: '14px 16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(14,12,10,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          Document Requirements
        </div>
        <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            'Scan at minimum 300 DPI — all text must be clearly legible',
            'All four corners of the document must be visible',
            'File format: PDF, JPG, PNG or WebP — max 5 MB per file',
            'Name on documents must match your registered name exactly',
            'BCI certificate must show current enrolment year',
          ].map((tip, i) => (
            <li key={i} style={{ fontSize: '12px', color: 'rgba(14,12,10,0.6)', lineHeight: 1.5 }}>{tip}</li>
          ))}
        </ul>
      </div>

      {/* Document uploaders */}
      {[
        { label: 'BCI Certificate *', state: bci, setter: setBci, existing: currentBciUrl },
        { label: 'Aadhaar Card *', state: aadhaar, setter: setAadhaar, existing: currentAadhaarUrl },
        { label: 'Degree Certificate *', state: degree, setter: setDegree, existing: currentDegreeUrl },
      ].map(({ label, state, setter, existing }) => (
        <div key={label} style={{ background: 'white', border: '1px solid rgba(14,12,10,0.1)', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>{label}</div>
            {state.url && state.url !== existing && (
              <span style={{ fontSize: '11px', color: '#1A6B3A', fontWeight: 600 }}>✓ New file ready</span>
            )}
            {state.url && state.url === existing && (
              <span style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>Current file — replace if needed</span>
            )}
            {!state.url && (
              <span style={{ fontSize: '11px', color: '#c0392b' }}>Not uploaded</span>
            )}
          </div>

          {state.url && (
            <div style={{ marginBottom: '8px' }}>
              <a href={state.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--teal)', textDecoration: 'none' }}>
                View current document →
              </a>
            </div>
          )}

          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px', borderRadius: '8px', cursor: state.uploading ? 'not-allowed' : 'pointer',
            background: state.uploading ? 'rgba(14,12,10,0.04)' : 'rgba(13,115,119,0.07)',
            border: '1px solid rgba(13,115,119,0.2)', fontSize: '12px', fontWeight: 600,
            color: 'var(--teal)',
          }}>
            {state.uploading ? 'Uploading…' : 'Choose new file'}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              disabled={state.uploading}
              onChange={(e) => handleFileChange(e, setter)}
              style={{ display: 'none' }}
            />
          </label>

          {state.error && (
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#c0392b' }}>{state.error}</div>
          )}
        </div>
      ))}

      {/* Note about changes */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(14,12,10,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
          What did you change? (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Re-scanned BCI certificate at higher resolution. All documents now show full name."
          rows={3}
          maxLength={1000}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(14,12,10,0.12)', borderRadius: '8px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>

      {submitError && (
        <div style={{ padding: '10px 14px', background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.15)', borderRadius: '8px', fontSize: '12px', color: '#c0392b' }}>
          {submitError}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          padding: '12px 28px', background: 'var(--ink)', color: 'white',
          border: 'none', borderRadius: '10px', cursor: submitting ? 'not-allowed' : 'pointer',
          fontSize: '13px', fontWeight: 600, opacity: submitting ? 0.7 : 1,
          alignSelf: 'flex-start',
        }}
      >
        {submitting ? 'Submitting…' : 'Resubmit for Review'}
      </button>
    </div>
  );
}
