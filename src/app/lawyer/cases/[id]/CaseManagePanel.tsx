'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  caseId: string;
  currentMilestone: number;
  milestoneCount: number;
  status: string;
  nextHearingDate: string | null;
}

export default function CaseManagePanel({
  caseId,
  currentMilestone,
  milestoneCount,
  status,
  nextHearingDate,
}: Props) {
  const router = useRouter();
  const [hearingDate, setHearingDate] = useState(nextHearingDate ?? '');
  const [savingHearing, setSavingHearing] = useState(false);
  const [hearingSaved, setHearingSaved] = useState(false);

  const [advancing, setAdvancing] = useState(false);
  const [showAdvanceConfirm, setShowAdvanceConfirm] = useState(false);

  const [completing, setCompleting] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  const [noteTitle, setNoteTitle] = useState('');
  const [noteDesc, setNoteDesc] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState('');

  async function patch(body: object) {
    const res = await fetch(`/api/cases/${caseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error ?? 'Request failed');
    }
    return res.json();
  }

  async function handleSaveHearing() {
    setSavingHearing(true);
    try {
      await patch({ action: 'set_hearing', date: hearingDate });
      setHearingSaved(true);
      setTimeout(() => setHearingSaved(false), 3000);
      router.refresh();
    } finally {
      setSavingHearing(false);
    }
  }

  async function handleAdvance() {
    setAdvancing(true);
    try {
      await patch({ action: 'advance_milestone' });
      setShowAdvanceConfirm(false);
      router.refresh();
    } finally {
      setAdvancing(false);
    }
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      await patch({ action: 'complete' });
      setShowCompleteConfirm(false);
      router.refresh();
    } finally {
      setCompleting(false);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteTitle.trim()) return;
    setSavingNote(true);
    setNoteError('');
    try {
      await patch({ action: 'add_event', title: noteTitle, description: noteDesc });
      setNoteTitle('');
      setNoteDesc('');
      router.refresh();
    } catch (err: any) {
      setNoteError(err.message);
    } finally {
      setSavingNote(false);
    }
  }

  const isActive = status === 'active';
  const allMilestoneDone = currentMilestone >= milestoneCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Hearing date */}
      <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          Next Hearing Date
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="date"
            value={hearingDate}
            onChange={e => setHearingDate(e.target.value)}
            style={{
              flex: 1, padding: '8px 10px', border: '1px solid rgba(14,12,10,0.15)',
              borderRadius: '6px', fontSize: '13px', color: 'var(--ink)',
              background: 'white', outline: 'none',
            }}
          />
          <button
            onClick={handleSaveHearing}
            disabled={savingHearing}
            style={{
              padding: '8px 14px', background: hearingSaved ? '#1A6B3A' : 'var(--teal)',
              color: 'white', border: 'none', borderRadius: '6px',
              cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              opacity: savingHearing ? 0.6 : 1, transition: 'background 0.3s',
              whiteSpace: 'nowrap',
            }}
          >
            {hearingSaved ? '✓ Saved' : savingHearing ? 'Saving…' : 'Set Date'}
          </button>
        </div>
      </div>

      {/* Milestone advance */}
      {isActive && (
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            Milestone Progress
          </div>
          <div style={{ fontSize: '13px', color: 'var(--ink)', marginBottom: '12px' }}>
            <strong>{currentMilestone}</strong> of <strong>{milestoneCount}</strong> milestones complete
          </div>
          {!allMilestoneDone && !showAdvanceConfirm && (
            <button
              onClick={() => setShowAdvanceConfirm(true)}
              style={{
                width: '100%', padding: '10px', background: 'rgba(13,115,119,0.08)',
                border: '1px solid rgba(13,115,119,0.2)', borderRadius: '8px',
                cursor: 'pointer', fontSize: '13px', color: 'var(--teal)', fontWeight: 600,
              }}
            >
              ✓ Mark Milestone {currentMilestone + 1} Complete
            </button>
          )}
          {allMilestoneDone && (
            <div style={{ fontSize: '12px', color: '#1A6B3A', fontWeight: 500 }}>
              ✓ All milestones complete
            </div>
          )}
          {showAdvanceConfirm && (
            <div style={{
              padding: '12px', background: 'rgba(13,115,119,0.06)',
              border: '1px solid rgba(13,115,119,0.2)', borderRadius: '8px',
            }}>
              <div style={{ fontSize: '13px', color: 'var(--ink)', marginBottom: '10px' }}>
                Mark milestone {currentMilestone + 1} as complete? The client will be notified to release payment.
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowAdvanceConfirm(false)}
                  style={{ padding: '6px 12px', border: '1px solid rgba(14,12,10,0.15)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px', color: 'rgba(14,12,10,0.6)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdvance}
                  disabled={advancing}
                  style={{ padding: '6px 14px', background: 'var(--teal)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, opacity: advancing ? 0.6 : 1 }}
                >
                  {advancing ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Complete case */}
      {isActive && (
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            Close Case
          </div>
          {!showCompleteConfirm ? (
            <button
              onClick={() => setShowCompleteConfirm(true)}
              style={{
                width: '100%', padding: '10px', background: 'rgba(184,134,11,0.08)',
                border: '1px solid rgba(184,134,11,0.25)', borderRadius: '8px',
                cursor: 'pointer', fontSize: '13px', color: 'var(--gold)', fontWeight: 600,
              }}
            >
              Mark Case as Completed
            </button>
          ) : (
            <div style={{
              padding: '12px', background: 'rgba(184,134,11,0.06)',
              border: '1px solid rgba(184,134,11,0.25)', borderRadius: '8px',
            }}>
              <div style={{ fontSize: '13px', color: 'var(--ink)', marginBottom: '10px' }}>
                This will close the case and prompt the client to leave a review. Are you sure?
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowCompleteConfirm(false)}
                  style={{ padding: '6px 12px', border: '1px solid rgba(14,12,10,0.15)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px', color: 'rgba(14,12,10,0.6)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  style={{ padding: '6px 14px', background: 'var(--gold)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, opacity: completing ? 0.6 : 1 }}
                >
                  {completing ? 'Closing…' : 'Yes, Complete Case'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add timeline note */}
      <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          Add Timeline Note
        </div>
        <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            type="text"
            placeholder="Event title (e.g. Filed written arguments)"
            value={noteTitle}
            onChange={e => setNoteTitle(e.target.value)}
            required
            style={{
              padding: '8px 10px', border: '1px solid rgba(14,12,10,0.15)',
              borderRadius: '6px', fontSize: '13px', color: 'var(--ink)',
              background: 'white', outline: 'none', width: '100%',
            }}
          />
          <textarea
            placeholder="Additional details (optional)"
            value={noteDesc}
            onChange={e => setNoteDesc(e.target.value)}
            rows={2}
            style={{
              padding: '8px 10px', border: '1px solid rgba(14,12,10,0.15)',
              borderRadius: '6px', fontSize: '13px', color: 'var(--ink)',
              background: 'white', outline: 'none', resize: 'vertical',
              width: '100%', fontFamily: 'inherit',
            }}
          />
          {noteError && (
            <div style={{ fontSize: '12px', color: 'var(--rust)' }}>{noteError}</div>
          )}
          <button
            type="submit"
            disabled={savingNote || !noteTitle.trim()}
            style={{
              padding: '8px 14px', background: 'var(--ink)', color: 'white',
              border: 'none', borderRadius: '6px', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600,
              opacity: savingNote || !noteTitle.trim() ? 0.5 : 1,
            }}
          >
            {savingNote ? 'Adding…' : '+ Add Note'}
          </button>
        </form>
      </div>
    </div>
  );
}
