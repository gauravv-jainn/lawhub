'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils/formatCurrency';

type MilestoneAttachment = {
  id: string;
  name: string;
  url: string;
  uploaded_by: string;
};

type MilestonePayment = {
  id: string;
  status: string;
  amount: number;
} | null;

type Milestone = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  deliverables: string | null;
  amount: number;
  due_date: string | null;
  status: string;
  plan_submitted_at: string | null;
  plan_approved_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  attachments: MilestoneAttachment[];
  payment: MilestonePayment;
};

interface Props {
  caseId: string;
  milestones: Milestone[];
  userRole: 'client' | 'lawyer';
  caseStatus: string;
  disputeActive: boolean;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  draft:                   { label: 'Draft',                color: 'rgba(14,12,10,0.4)',  bg: 'rgba(14,12,10,0.05)' },
  pending_client_approval: { label: 'Plan Review',          color: '#9a710a',             bg: 'rgba(184,134,11,0.1)' },
  plan_rejected:           { label: 'Plan Rejected',        color: 'var(--rust)',          bg: 'rgba(192,57,43,0.08)' },
  active:                  { label: 'In Progress',          color: 'var(--teal)',          bg: 'rgba(13,115,119,0.1)' },
  submitted:               { label: 'Awaiting Approval',    color: '#9a710a',             bg: 'rgba(184,134,11,0.1)' },
  approved:                { label: 'Approved',             color: '#1A6B3A',             bg: 'rgba(26,107,58,0.1)' },
  disputed:                { label: 'Disputed',             color: 'var(--rust)',          bg: 'rgba(192,57,43,0.1)' },
  paid:                    { label: 'Payment Released',     color: 'var(--teal)',          bg: 'rgba(13,115,119,0.1)' },
  cancelled:               { label: 'Cancelled',            color: 'rgba(14,12,10,0.4)',  bg: 'rgba(14,12,10,0.05)' },
};

export default function MilestonePanel({
  caseId,
  milestones,
  userRole,
  caseStatus,
  disputeActive,
}: Props) {
  const router                  = useRouter();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading]   = useState<string | null>(null);
  const [error, setError]       = useState('');

  const isClosed = ['completed', 'cancelled', 'disputed'].includes(caseStatus);

  async function milestoneAction(number: number, action: string, extra?: object) {
    setLoading(`${number}-${action}`);
    setError('');
    try {
      const res = await fetch(`/api/cases/${caseId}/milestones/${number}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Something went wrong.');
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handlePayment(ms: Milestone) {
    setLoading(`${ms.number}-pay`);
    setError('');
    try {
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, milestoneNumber: ms.number }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        setError(orderData.error ?? 'Failed to create payment order.');
        return;
      }

      await loadRazorpay();
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'LawHub',
        description: `Payment for ${ms.title}`,
        order_id: orderData.orderId,
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_signature:  response.razorpay_signature,
              paymentId:           orderData.paymentId,
            }),
          });
          if (verifyRes.ok) {
            router.refresh();
          } else {
            setError('Payment verification failed. Please contact support.');
          }
        },
        theme: { color: '#0d7377' },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } finally {
      setLoading(null);
    }
  }

  async function handleRelease(paymentId: string) {
    setLoading(`release-${paymentId}`);
    setError('');
    try {
      const res = await fetch('/api/payments/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Failed to release payment.');
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid rgba(14,12,10,0.08)',
        borderRadius: '12px',
        padding: '24px',
      }}
    >
      <h2
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--ink)',
          marginBottom: '20px',
        }}
      >
        Milestones
      </h2>

      {error && (
        <div
          style={{
            marginBottom: '12px',
            padding: '10px 14px',
            background: 'rgba(192,57,43,0.06)',
            border: '1px solid rgba(192,57,43,0.2)',
            borderRadius: '8px',
            fontSize: '13px',
            color: 'var(--rust)',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {milestones.map((ms) => {
          const st         = STATUS_META[ms.status] ?? STATUS_META.draft;
          const isExpanded = expanded === ms.number;

          return (
            <div
              key={ms.id}
              style={{
                border: '1px solid rgba(14,12,10,0.08)',
                borderRadius: '10px',
                overflow: 'hidden',
              }}
            >
              {/* Milestone header */}
              <button
                onClick={() => setExpanded(isExpanded ? null : ms.number)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  background: isExpanded ? 'var(--cream)' : 'white',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: ms.status === 'paid' ? 'var(--teal)' : ms.status === 'active' ? 'rgba(13,115,119,0.15)' : 'rgba(14,12,10,0.06)',
                      color: ms.status === 'paid' ? 'white' : ms.status === 'active' ? 'var(--teal)' : 'rgba(14,12,10,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {ms.status === 'paid' ? '✓' : ms.number}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
                      {ms.title}
                    </div>
                    {ms.due_date && (
                      <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginTop: '2px' }}>
                        Due {new Date(ms.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '20px',
                      background: st.bg,
                      color: st.color,
                    }}
                  >
                    {st.label}
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--gold)',
                      fontFamily: "'Cormorant Garamond', serif",
                    }}
                  >
                    {formatCurrency(ms.amount)}
                  </span>
                  <span style={{ fontSize: '12px', color: 'rgba(14,12,10,0.3)' }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </button>

              {/* Expanded milestone detail */}
              {isExpanded && (
                <div
                  style={{
                    padding: '16px',
                    borderTop: '1px solid rgba(14,12,10,0.06)',
                    background: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {ms.description && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(14,12,10,0.4)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Scope of Work
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: 1.6, margin: 0 }}>
                        {ms.description}
                      </p>
                    </div>
                  )}
                  {ms.deliverables && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(14,12,10,0.4)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Deliverables
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: 1.6, margin: 0 }}>
                        {ms.deliverables}
                      </p>
                    </div>
                  )}

                  {/* Attachments */}
                  <MilestoneAttachmentsSection
                    caseId={caseId}
                    milestoneNumber={ms.number}
                    milestoneId={ms.id}
                    attachments={ms.attachments}
                    milestoneStatus={ms.status}
                    userRole={userRole}
                    isClosed={isClosed}
                    onUploaded={() => router.refresh()}
                  />

                  {/* ── Client actions ── */}
                  {userRole === 'client' && !isClosed && !disputeActive && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>

                      {/* PLAN APPROVAL phase */}
                      {ms.status === 'pending_client_approval' && (
                        <>
                          <div style={{ width: '100%', padding: '10px 14px', background: 'rgba(184,134,11,0.06)', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '8px', fontSize: '12px', color: 'rgba(14,12,10,0.6)', lineHeight: 1.5, marginBottom: '4px' }}>
                            Your advocate has submitted the work plan for this milestone. Review the scope and deliverables above, then approve or request changes.
                          </div>
                          <button
                            onClick={() => milestoneAction(ms.number, 'approve_plan')}
                            disabled={loading === `${ms.number}-approve_plan`}
                            style={{
                              padding: '8px 16px', background: 'var(--teal)', color: 'white',
                              border: 'none', borderRadius: '6px', cursor: 'pointer',
                              fontSize: '13px', fontWeight: 600,
                              opacity: loading === `${ms.number}-approve_plan` ? 0.6 : 1,
                            }}
                          >
                            {loading === `${ms.number}-approve_plan` ? 'Approving…' : '✓ Approve Plan'}
                          </button>
                          <RejectPlanButton
                            milestoneNumber={ms.number}
                            loading={loading}
                            onReject={(reason) => milestoneAction(ms.number, 'reject_plan', { reason })}
                          />
                        </>
                      )}

                      {/* WORK APPROVAL phase */}
                      {ms.status === 'submitted' && (
                        <>
                          <button
                            onClick={() => milestoneAction(ms.number, 'approve')}
                            disabled={loading === `${ms.number}-approve`}
                            style={{
                              padding: '8px 16px', background: 'var(--teal)', color: 'white',
                              border: 'none', borderRadius: '6px', cursor: 'pointer',
                              fontSize: '13px', fontWeight: 600,
                              opacity: loading === `${ms.number}-approve` ? 0.6 : 1,
                            }}
                          >
                            {loading === `${ms.number}-approve` ? 'Approving…' : '✓ Approve Work'}
                          </button>
                          <button
                            onClick={() => milestoneAction(ms.number, 'dispute', { reason: 'Work not satisfactory' })}
                            disabled={!!loading}
                            style={{
                              padding: '8px 14px', background: 'white', color: 'var(--rust)',
                              border: '1px solid rgba(192,57,43,0.3)', borderRadius: '6px',
                              cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                            }}
                          >
                            Raise Issue
                          </button>
                        </>
                      )}

                      {/* PAYMENT phase */}
                      {ms.status === 'approved' && (!ms.payment || ms.payment.status === 'pending') && (
                        <button
                          onClick={() => handlePayment(ms)}
                          disabled={loading === `${ms.number}-pay`}
                          style={{
                            padding: '10px 20px', background: 'var(--gold)', color: 'white',
                            border: 'none', borderRadius: '8px', cursor: 'pointer',
                            fontSize: '13px', fontWeight: 600,
                            opacity: loading === `${ms.number}-pay` ? 0.6 : 1,
                          }}
                        >
                          {loading === `${ms.number}-pay` ? 'Loading…' : `Pay ${formatCurrency(ms.amount)}`}
                        </button>
                      )}

                      {/* RELEASE ESCROW */}
                      {ms.status === 'approved' && ms.payment?.status === 'held' && (
                        <button
                          onClick={() => handleRelease(ms.payment!.id)}
                          disabled={loading === `release-${ms.payment!.id}`}
                          style={{
                            padding: '10px 20px', background: 'var(--teal)', color: 'white',
                            border: 'none', borderRadius: '8px', cursor: 'pointer',
                            fontSize: '13px', fontWeight: 600,
                            opacity: loading === `release-${ms.payment!.id}` ? 0.6 : 1,
                          }}
                        >
                          {loading === `release-${ms.payment!.id}` ? 'Releasing…' : 'Release to Advocate'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── Lawyer actions ── */}
                  {userRole === 'lawyer' && !isClosed && !disputeActive && (
                    <LawyerMilestoneActions
                      ms={ms}
                      caseId={caseId}
                      loading={loading}
                      setLoading={setLoading}
                      setError={setError}
                    />
                  )}

                  {/* Paid confirmation */}
                  {ms.status === 'paid' && (
                    <div style={{ fontSize: '12px', color: '#1A6B3A', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ✓ Payment released to advocate
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Attachments Section ──────────────────────────────────────────────────────

function MilestoneAttachmentsSection({
  caseId, milestoneNumber, milestoneId, attachments,
  milestoneStatus, userRole, isClosed, onUploaded,
}: {
  caseId: string; milestoneNumber: number; milestoneId: string;
  attachments: MilestoneAttachment[]; milestoneStatus: string;
  userRole: 'client' | 'lawyer'; isClosed: boolean; onUploaded: () => void;
}) {
  const fileRef              = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Determine if upload is allowed
  const canUpload = !isClosed && (
    (userRole === 'lawyer' && !['approved', 'paid', 'cancelled'].includes(milestoneStatus)) ||
    (userRole === 'client' && ['submitted', 'disputed'].includes(milestoneStatus))
  );

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/cases/${caseId}/milestones/${milestoneNumber}/attachments`, {
        method: 'POST',
        body: fd,
      });
      const d = await res.json();
      if (!res.ok) {
        setUploadError(d.error ?? 'Upload failed.');
        return;
      }
      onUploaded();
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (attachments.length === 0 && !canUpload) return null;

  return (
    <div>
      <div
        style={{
          fontSize: '11px', fontWeight: 600, color: 'rgba(14,12,10,0.4)',
          marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <span>Attachments ({attachments.length})</span>
        {canUpload && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              fontSize: '11px', padding: '3px 10px', background: 'rgba(13,115,119,0.08)',
              color: 'var(--teal)', border: '1px solid rgba(13,115,119,0.2)',
              borderRadius: '100px', cursor: 'pointer', fontWeight: 600,
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? 'Uploading…' : '+ Upload File'}
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        style={{ display: 'none' }}
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt"
        onChange={handleUpload}
      />

      {uploadError && (
        <div style={{ fontSize: '12px', color: 'var(--rust)', marginBottom: '6px' }}>{uploadError}</div>
      )}

      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {attachments.map((att) => (
            <a
              key={att.id}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 10px', background: 'var(--cream)',
                borderRadius: '6px', border: '1px solid rgba(14,12,10,0.07)',
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: '16px' }}>📎</span>
              <span style={{ fontSize: '13px', color: 'var(--ink)', flex: 1 }}>{att.name}</span>
              <span style={{ fontSize: '10px', color: 'rgba(14,12,10,0.35)' }}>↗</span>
            </a>
          ))}
        </div>
      )}

      {attachments.length === 0 && canUpload && (
        <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.35)', fontStyle: 'italic' }}>
          No attachments yet. Upload relevant documents or screenshots.
        </div>
      )}
    </div>
  );
}

// ─── Reject Plan Button (with reason input) ───────────────────────────────────

function RejectPlanButton({
  milestoneNumber, loading, onReject,
}: {
  milestoneNumber: number;
  loading: string | null;
  onReject: (reason: string) => void;
}) {
  const [open, setOpen]     = useState(false);
  const [reason, setReason] = useState('');

  if (open) {
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What needs to change? Be specific so the advocate can revise…"
          rows={3}
          style={{
            width: '100%', padding: '8px 10px', border: '1px solid rgba(14,12,10,0.15)',
            borderRadius: '6px', fontSize: '13px', color: 'var(--ink)',
            resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { if (reason.trim()) onReject(reason.trim()); }}
            disabled={!reason.trim() || !!loading}
            style={{
              padding: '8px 14px', background: 'var(--rust)', color: 'white',
              border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              opacity: (!reason.trim() || !!loading) ? 0.5 : 1,
            }}
          >
            {loading === `${milestoneNumber}-reject_plan` ? 'Sending…' : 'Send Back for Revision'}
          </button>
          <button
            onClick={() => { setOpen(false); setReason(''); }}
            style={{
              padding: '8px 12px', background: 'white', color: 'rgba(14,12,10,0.5)',
              border: '1px solid rgba(14,12,10,0.12)', borderRadius: '6px',
              fontSize: '13px', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      style={{
        padding: '8px 14px', background: 'white', color: 'rgba(14,12,10,0.6)',
        border: '1px solid rgba(14,12,10,0.15)', borderRadius: '6px',
        cursor: 'pointer', fontSize: '13px', fontWeight: 500,
      }}
    >
      Request Changes
    </button>
  );
}

// ─── Lawyer-side milestone management ────────────────────────────────────────

type LawyerMilestoneActionsProps = {
  ms: Milestone;
  caseId: string;
  loading: string | null;
  setLoading: (v: string | null) => void;
  setError: (v: string) => void;
};

function LawyerMilestoneActions({
  ms, caseId, loading, setLoading, setError,
}: LawyerMilestoneActionsProps) {
  const router  = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle]     = useState(ms.title);
  const [desc, setDesc]       = useState(ms.description ?? '');
  const [deliv, setDeliv]     = useState(ms.deliverables ?? '');
  const [dueDate, setDueDate] = useState(
    ms.due_date ? ms.due_date.slice(0, 10) : ''
  );

  const isDraft      = ms.status === 'draft';
  const isPlanRejected = ms.status === 'plan_rejected';
  const canEdit      = ['draft', 'plan_rejected', 'active'].includes(ms.status);
  const canSubmitPlan = isDraft || isPlanRejected;
  const canSubmitWork = ms.status === 'active';

  async function saveEdit() {
    setLoading(`${ms.number}-update`);
    setError('');
    try {
      const res = await fetch(`/api/cases/${caseId}/milestones/${ms.number}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          title: title.trim() || undefined,
          description: desc.trim() || null,
          deliverables: deliv.trim() || null,
          due_date: dueDate || null,
        }),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Failed to update milestone.');
      }
    } finally {
      setLoading(null);
    }
  }

  async function submitPlan() {
    if (!ms.deliverables?.trim() && !deliv.trim()) {
      setError('Describe the deliverables before submitting the plan.');
      setEditing(true);
      return;
    }
    setLoading(`${ms.number}-submit_plan`);
    setError('');
    try {
      const res = await fetch(`/api/cases/${caseId}/milestones/${ms.number}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit_plan' }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Failed to submit plan.');
      }
    } finally {
      setLoading(null);
    }
  }

  async function submitWork() {
    if (!ms.deliverables?.trim() && !deliv.trim()) {
      setError('Add deliverables before submitting this milestone for approval.');
      setEditing(true);
      return;
    }
    setLoading(`${ms.number}-submit`);
    setError('');
    try {
      const res = await fetch(`/api/cases/${caseId}/milestones/${ms.number}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit' }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Failed to submit milestone.');
      }
    } finally {
      setLoading(null);
    }
  }

  // Show plan-rejected notice
  if (isPlanRejected && !editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ padding: '10px 14px', background: 'rgba(192,57,43,0.05)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--rust)', lineHeight: 1.5 }}>
          Your client has requested changes to this milestone plan. Edit the details below and resubmit.
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setEditing(true)} style={{ padding: '8px 14px', background: 'var(--ink)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Edit Plan
          </button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div
        style={{
          marginTop: '4px', padding: '14px', background: 'var(--cream)',
          borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(14,12,10,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isDraft || isPlanRejected ? 'Define Milestone Plan' : 'Edit Milestone'}
        </div>

        {[
          { label: 'Title', value: title, setter: setTitle, placeholder: 'e.g. Draft and file writ petition', rows: 1 },
          { label: 'Scope of Work', value: desc, setter: setDesc, placeholder: 'What work is included in this milestone?', rows: 3 },
          { label: 'Deliverables *', value: deliv, setter: setDeliv, placeholder: 'Specific documents, filings, or outcomes to be delivered…', rows: 3 },
        ].map(({ label, value, setter, placeholder, rows }) => (
          <div key={label}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(14,12,10,0.4)', display: 'block', marginBottom: '4px' }}>{label}</label>
            <textarea
              value={value}
              onChange={(e) => setter(e.target.value)}
              placeholder={placeholder}
              rows={rows}
              style={{
                width: '100%', padding: '7px 10px',
                border: '1px solid rgba(14,12,10,0.15)', borderRadius: '6px',
                fontSize: '13px', color: 'var(--ink)', resize: 'vertical',
                fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>
        ))}

        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(14,12,10,0.4)', display: 'block', marginBottom: '4px' }}>Target Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={{
              padding: '7px 10px', border: '1px solid rgba(14,12,10,0.15)',
              borderRadius: '6px', fontSize: '13px', color: 'var(--ink)', background: 'white',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={saveEdit}
            disabled={loading === `${ms.number}-update` || !title.trim()}
            style={{
              padding: '8px 16px', background: 'var(--teal)', color: 'white',
              border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', opacity: loading === `${ms.number}-update` ? 0.6 : 1,
            }}
          >
            {loading === `${ms.number}-update` ? 'Saving…' : 'Save'}
          </button>
          {canSubmitPlan && (
            <button
              onClick={async () => { await saveEdit(); await submitPlan(); }}
              disabled={!!loading || !title.trim() || !deliv.trim()}
              style={{
                padding: '8px 16px', background: 'var(--gold)', color: 'white',
                border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', opacity: (!!loading || !title.trim() || !deliv.trim()) ? 0.5 : 1,
              }}
            >
              Save & Submit Plan
            </button>
          )}
          <button
            onClick={() => setEditing(false)}
            style={{
              padding: '8px 12px', background: 'white', color: 'rgba(14,12,10,0.5)',
              border: '1px solid rgba(14,12,10,0.12)', borderRadius: '6px',
              fontSize: '13px', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
      {canSubmitWork && (
        <button
          onClick={submitWork}
          disabled={!!loading}
          style={{
            padding: '8px 16px', background: 'var(--teal)', color: 'white',
            border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', opacity: loading ? 0.6 : 1,
          }}
        >
          {loading === `${ms.number}-submit` ? 'Submitting…' : 'Submit for Approval'}
        </button>
      )}
      {canSubmitPlan && (
        <button
          onClick={submitPlan}
          disabled={!!loading}
          style={{
            padding: '8px 16px', background: 'var(--gold)', color: 'white',
            border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', opacity: loading ? 0.6 : 1,
          }}
        >
          {loading === `${ms.number}-submit_plan` ? 'Submitting…' : 'Submit Plan for Approval'}
        </button>
      )}
      {canEdit && (
        <button
          onClick={() => setEditing(true)}
          style={{
            padding: '8px 12px', background: 'white', color: 'var(--ink)',
            border: '1px solid rgba(14,12,10,0.15)', borderRadius: '6px',
            fontSize: '13px', cursor: 'pointer',
          }}
        >
          Edit Details
        </button>
      )}
      {ms.status === 'pending_client_approval' && (
        <span style={{ fontSize: '12px', color: '#9a710a', fontWeight: 500, alignSelf: 'center' }}>
          ⏳ Plan submitted — awaiting client approval
        </span>
      )}
      {ms.status === 'submitted' && (
        <span style={{ fontSize: '12px', color: '#9a710a', fontWeight: 500, alignSelf: 'center' }}>
          ⏳ Work submitted — awaiting client approval
        </span>
      )}
      {ms.status === 'approved' && (
        <span style={{ fontSize: '12px', color: '#1A6B3A', fontWeight: 500, alignSelf: 'center' }}>
          ✓ Approved — awaiting payment release
        </span>
      )}
    </div>
  );
}

// Lazy-load Razorpay SDK
function loadRazorpay(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(); return; }
    const script   = document.createElement('script');
    script.src     = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve();
    document.body.appendChild(script);
  });
}
