'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  caseId: string;
  caseStatus: string;
  nextHearingDate: string | null;
  allMilestonesComplete: boolean;
  disputeActive: boolean;
}

type Panel = 'cancel' | null;

export default function CaseManagePanel({
  caseId,
  caseStatus,
  nextHearingDate,
  allMilestonesComplete,
  disputeActive,
}: Props) {
  const router = useRouter();

  const [hearingDate, setHearingDate]   = useState(nextHearingDate ?? '');
  const [hearingLoading, setHearingLoading] = useState(false);
  const [hearingSaved, setHearingSaved] = useState(false);

  const [noteTitle, setNoteTitle] = useState('');
  const [noteDesc, setNoteDesc]   = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteError, setNoteError]   = useState('');

  const [completionLoading, setCompletionLoading] = useState(false);
  const [showCompletionConfirm, setShowCompletionConfirm] = useState(false);

  const [panel, setPanel]             = useState<Panel>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const [error, setError] = useState('');

  const isActive = caseStatus === 'active';
  const isCompletionRequested = caseStatus === 'completion_requested';
  const isClosed = ['completed', 'cancelled', 'disputed'].includes(caseStatus);

  async function patchCase(body: object) {
    const res = await fetch(`/api/cases/${caseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error ?? 'Request failed.');
    }
    return res.json();
  }

  async function saveHearing() {
    setHearingLoading(true);
    setError('');
    try {
      await patchCase({ action: 'set_hearing', date: hearingDate });
      setHearingSaved(true);
      setTimeout(() => setHearingSaved(false), 3000);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setHearingLoading(false);
    }
  }

  async function requestCompletion() {
    setCompletionLoading(true);
    setError('');
    try {
      await patchCase({ action: 'request_completion' });
      setShowCompletionConfirm(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCompletionLoading(false);
    }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteTitle.trim()) return;
    setNoteLoading(true);
    setNoteError('');
    try {
      await patchCase({ action: 'add_event', title: noteTitle.trim(), description: noteDesc.trim() });
      setNoteTitle('');
      setNoteDesc('');
      router.refresh();
    } catch (e: any) {
      setNoteError(e.message);
    } finally {
      setNoteLoading(false);
    }
  }

  async function cancelCase() {
    if (!cancelReason.trim()) {
      setError('Please provide a reason for cancellation.');
      return;
    }
    setCancelLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/cases/${caseId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Failed to cancel case.');
      }
    } finally {
      setCancelLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {error && (
        <div
          style={{
            padding: '10px 14px', background: 'rgba(192,57,43,0.06)',
            border: '1px solid rgba(192,57,43,0.2)', borderRadius: '8px',
            fontSize: '13px', color: 'var(--rust)',
          }}
        >
          {error}
        </div>
      )}

      {/* Next hearing date */}
      <div
        style={{
          background: 'white', border: '1px solid rgba(14,12,10,0.08)',
          borderRadius: '12px', padding: '20px',
        }}
      >
        <div
          style={{
            fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '12px',
            textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
          }}
        >
          Next Hearing Date
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="date"
            value={hearingDate}
            onChange={(e) => setHearingDate(e.target.value)}
            style={{
              flex: 1, padding: '8px 10px', border: '1px solid rgba(14,12,10,0.15)',
              borderRadius: '6px', fontSize: '13px', color: 'var(--ink)',
              background: 'white', outline: 'none',
            }}
          />
          <button
            onClick={saveHearing}
            disabled={hearingLoading}
            style={{
              padding: '8px 14px',
              background: hearingSaved ? '#1A6B3A' : 'var(--teal)',
              color: 'white', border: 'none', borderRadius: '6px',
              cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              opacity: hearingLoading ? 0.6 : 1,
              transition: 'background 0.3s',
              whiteSpace: 'nowrap',
            }}
          >
            {hearingSaved ? '✓ Saved' : hearingLoading ? 'Saving…' : 'Set Date'}
          </button>
        </div>
      </div>

      {/* Request case completion */}
      {(isActive || isCompletionRequested) && !disputeActive && (
        <div
          style={{
            background: 'white', border: '1px solid rgba(14,12,10,0.08)',
            borderRadius: '12px', padding: '20px',
          }}
        >
          <div
            style={{
              fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '12px',
              textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
            }}
          >
            Case Completion
          </div>

          {isCompletionRequested ? (
            <div style={{ fontSize: '13px', color: '#9a710a', fontWeight: 500, lineHeight: 1.5 }}>
              ⏳ Completion request sent. Awaiting client confirmation (72-hour window).
            </div>
          ) : !allMilestonesComplete ? (
            <div style={{ fontSize: '13px', color: 'rgba(14,12,10,0.5)', lineHeight: 1.5 }}>
              All milestones must be approved or paid before you can request completion.
            </div>
          ) : showCompletionConfirm ? (
            <div
              style={{
                padding: '12px', background: 'rgba(184,134,11,0.06)',
                border: '1px solid rgba(184,134,11,0.25)', borderRadius: '8px',
              }}
            >
              <p style={{ fontSize: '13px', color: 'var(--ink)', margin: '0 0 12px', lineHeight: 1.5 }}>
                This will notify the client that you consider the case complete. They have 72 hours to
                approve or raise a dispute. If they take no action, the case closes automatically.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={requestCompletion}
                  disabled={completionLoading}
                  style={{
                    padding: '8px 16px', background: 'var(--gold)', color: 'white',
                    border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', opacity: completionLoading ? 0.6 : 1,
                  }}
                >
                  {completionLoading ? 'Sending…' : 'Send Request'}
                </button>
                <button
                  onClick={() => setShowCompletionConfirm(false)}
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
          ) : (
            <button
              onClick={() => setShowCompletionConfirm(true)}
              style={{
                width: '100%', padding: '10px',
                background: 'rgba(184,134,11,0.08)',
                border: '1px solid rgba(184,134,11,0.25)',
                borderRadius: '8px', cursor: 'pointer',
                fontSize: '13px', color: 'var(--gold)', fontWeight: 600,
              }}
            >
              Request Case Completion
            </button>
          )}
        </div>
      )}

      {/* Add timeline note */}
      {!isClosed && (
        <div
          style={{
            background: 'white', border: '1px solid rgba(14,12,10,0.08)',
            borderRadius: '12px', padding: '20px',
          }}
        >
          <div
            style={{
              fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '12px',
              textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
            }}
          >
            Add Timeline Note
          </div>
          <form onSubmit={addNote} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="text"
              placeholder="e.g. Filed written arguments"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              required
              style={{
                padding: '8px 10px', border: '1px solid rgba(14,12,10,0.15)',
                borderRadius: '6px', fontSize: '13px', color: 'var(--ink)',
                background: 'white', outline: 'none', width: '100%', boxSizing: 'border-box',
              }}
            />
            <textarea
              placeholder="Additional details (optional)"
              value={noteDesc}
              onChange={(e) => setNoteDesc(e.target.value)}
              rows={2}
              style={{
                padding: '8px 10px', border: '1px solid rgba(14,12,10,0.15)',
                borderRadius: '6px', fontSize: '13px', color: 'var(--ink)',
                resize: 'vertical', fontFamily: 'inherit',
                width: '100%', boxSizing: 'border-box',
              }}
            />
            {noteError && (
              <div style={{ fontSize: '12px', color: 'var(--rust)' }}>{noteError}</div>
            )}
            <button
              type="submit"
              disabled={noteLoading || !noteTitle.trim()}
              style={{
                padding: '8px 14px', background: 'var(--ink)', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontSize: '12px', fontWeight: 600,
                opacity: noteLoading || !noteTitle.trim() ? 0.5 : 1,
              }}
            >
              {noteLoading ? 'Adding…' : '+ Add Note'}
            </button>
          </form>
        </div>
      )}

      {/* Cancel case */}
      {isActive && !disputeActive && panel === null && (
        <button
          onClick={() => { setPanel('cancel'); setError(''); }}
          style={{
            width: '100%', padding: '9px',
            background: 'white', color: 'rgba(14,12,10,0.5)',
            border: '1px solid rgba(14,12,10,0.12)',
            borderRadius: '8px', fontSize: '13px',
            fontWeight: 400, cursor: 'pointer', textAlign: 'left',
          }}
        >
          Cancel Case
        </button>
      )}

      {panel === 'cancel' && (
        <div
          style={{
            background: 'white', border: '1px solid rgba(14,12,10,0.08)',
            borderRadius: '12px', padding: '20px',
            display: 'flex', flexDirection: 'column', gap: '12px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
            Cancel This Case
          </div>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation…"
            rows={3}
            style={{
              padding: '8px 10px', border: '1px solid rgba(14,12,10,0.15)',
              borderRadius: '6px', fontSize: '13px', color: 'var(--ink)',
              resize: 'vertical', fontFamily: 'inherit',
              width: '100%', boxSizing: 'border-box',
            }}
          />
          <p style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)', margin: 0, lineHeight: 1.5 }}>
            Cancellation is permanent. Held payments will be flagged for client refund.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={cancelCase}
              disabled={cancelLoading}
              style={{
                flex: 1, padding: '9px',
                background: 'rgba(14,12,10,0.07)',
                color: 'var(--ink)',
                border: '1px solid rgba(14,12,10,0.15)',
                borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', opacity: cancelLoading ? 0.6 : 1,
              }}
            >
              {cancelLoading ? 'Cancelling…' : 'Confirm Cancellation'}
            </button>
            <button
              onClick={() => { setPanel(null); setError(''); }}
              style={{
                padding: '9px 16px', background: 'white', color: 'rgba(14,12,10,0.5)',
                border: '1px solid rgba(14,12,10,0.12)', borderRadius: '8px',
                fontSize: '13px', cursor: 'pointer',
              }}
            >
              Go Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
