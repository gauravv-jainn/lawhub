'use client';

/**
 * CaseActivityStream
 *
 * Unified chronological activity stream that merges:
 *  - Case system events (CaseEvent records)
 *  - Messages between parties (Message records)
 *
 * Each item renders as a professionally styled card appropriate to its type.
 * Polls for new content every 8 seconds (lightweight — only fetches counts).
 * Messages can be composed inline via the compose box at the bottom.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { formatRelativeTime } from '@/lib/utils/formatDate';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CaseEvent {
  id:          string;
  event_type:  string;
  title:       string;
  description?: string | null;
  created_at:  string;
  _kind:       'event';
}

interface Message {
  id:          string;
  sender_id:   string;
  sender?:     { full_name: string; role: string } | null;
  content:     string;
  file_url?:   string | null;
  file_name?:  string | null;
  created_at:  string;
  _kind:       'message';
}

type StreamItem = CaseEvent | Message;

// ─── Event visual config ──────────────────────────────────────────────────────

const EVENT_CONFIG: Record<string, { icon: string; accent: string; bg: string }> = {
  // Case lifecycle
  case_created:              { icon: '⚖️',  accent: '#0d7377', bg: '#f0fafa' },
  case_completed:            { icon: '🏁',  accent: '#2b8a3e', bg: '#f0faf2' },
  case_cancelled:            { icon: '⛔',  accent: '#868e96', bg: '#f8f9fa' },
  completion_requested:      { icon: '🔔',  accent: '#e67700', bg: '#fff9f0' },

  // Milestones
  milestone_plan_submitted:  { icon: '📋',  accent: '#1971c2', bg: '#f0f6ff' },
  milestone_plan_approved:   { icon: '✅',  accent: '#2b8a3e', bg: '#f0faf2' },
  milestone_plan_rejected:   { icon: '❌',  accent: '#c92a2a', bg: '#fff5f5' },
  milestone_submitted:       { icon: '📤',  accent: '#5f3dc4', bg: '#f5f0ff' },
  milestone_approved:        { icon: '👍',  accent: '#2b8a3e', bg: '#f0faf2' },
  milestone_paid:            { icon: '🔒',  accent: '#2b8a3e', bg: '#f0faf2' },

  // Payments
  payment_released:          { icon: '💰',  accent: '#2b8a3e', bg: '#f0faf2' },
  payment_failed:            { icon: '⚠️',  accent: '#c92a2a', bg: '#fff5f5' },

  // Disputes
  dispute_raised:            { icon: '⚠️',  accent: '#c92a2a', bg: '#fff5f5' },
  dispute_resolved:          { icon: '🤝',  accent: '#2b8a3e', bg: '#f0faf2' },
  dispute_evidence_uploaded: { icon: '📁',  accent: '#1971c2', bg: '#f0f6ff' },

  // Default
  default:                   { icon: '📌',  accent: '#868e96', bg: '#f8f9fa' },
};

function getEventConfig(type: string) {
  return EVENT_CONFIG[type] ?? EVENT_CONFIG.default;
}

function getRoleLabel(role: string) {
  return role === 'client' ? 'Client' : role === 'lawyer' ? 'Advocate' : 'Admin';
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  caseId:          string;
  userId:          string;
  userRole:        'client' | 'lawyer';
  initialEvents:   Omit<CaseEvent, '_kind'>[];
  initialMessages: Omit<Message, '_kind'>[];
  disabled?:       boolean; // true when case is closed/disputed — hide compose
}

export default function CaseActivityStream({
  caseId,
  userId,
  userRole,
  initialEvents,
  initialMessages,
  disabled = false,
}: Props) {
  const [events, setEvents]     = useState<Omit<CaseEvent, '_kind'>[]>(initialEvents);
  const [messages, setMessages] = useState<Omit<Message, '_kind'>[]>(initialMessages);
  const [newMsg, setNewMsg]     = useState('');
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const composeRef              = useRef<HTMLTextAreaElement>(null);

  // Merge and sort events + messages into a single stream
  const stream: StreamItem[] = [
    ...events.map((e)  => ({ ...e, _kind: 'event'   as const })),
    ...messages.map((m) => ({ ...m, _kind: 'message' as const })),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Poll for new content every 8 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [evtRes, msgRes] = await Promise.all([
          fetch(`/api/cases/${caseId}/events`),
          fetch(`/api/cases/${caseId}/messages`),
        ]);
        if (evtRes.ok) {
          const d = await evtRes.json();
          setEvents(d.events ?? []);
        }
        if (msgRes.ok) {
          const d = await msgRes.json();
          setMessages(d.messages ?? []);
        }
      } catch {
        // silently fail — polling is best-effort
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [caseId]);

  // Auto-scroll to bottom when new items arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [stream.length]);

  const sendMessage = useCallback(async () => {
    const content = newMsg.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    setNewMsg('');

    try {
      const res = await fetch(`/api/cases/${caseId}/messages`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content, sender_role: userRole }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to send message.');
        setNewMsg(content); // restore
      }
    } catch {
      setError('Network error. Please try again.');
      setNewMsg(content);
    }
    setSending(false);
  }, [caseId, newMsg, sending, userRole]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Stream */}
      <div
        style={{
          display:       'flex',
          flexDirection: 'column',
          gap:           '10px',
          marginBottom:  disabled ? '0' : '16px',
          maxHeight:     '620px',
          overflowY:     'auto',
          paddingRight:  '4px',
        }}
      >
        {stream.length === 0 && (
          <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.4)', textAlign: 'center', padding: '32px 0' }}>
            No activity yet. Messages and case events will appear here.
          </p>
        )}

        {stream.map((item) => {
          if (item._kind === 'message') {
            return <MessageCard key={item.id} msg={item} userId={userId} />;
          }
          return <EventCard key={item.id} event={item} />;
        })}

        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      {!disabled && (
        <div>
          {error && (
            <p style={{ fontSize: '12px', color: '#c92a2a', marginBottom: '6px' }}>{error}</p>
          )}
          <div
            style={{
              display:    'flex',
              gap:        '8px',
              alignItems: 'flex-end',
              padding:    '12px',
              background: '#f8f9fa',
              borderRadius: '10px',
              border:     '1px solid #e9ecef',
            }}
          >
            <textarea
              ref={composeRef}
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder="Write a message… (Enter to send, Shift+Enter for new line)"
              rows={2}
              style={{
                flex:       1,
                padding:    '9px 12px',
                border:     '1px solid #dee2e6',
                borderRadius: '8px',
                fontSize:   '13px',
                resize:     'none',
                background: '#fff',
                outline:    'none',
                fontFamily: 'inherit',
                lineHeight: 1.5,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!newMsg.trim() || sending}
              style={{
                padding:      '9px 20px',
                background:   'var(--ink-2)',
                color:        '#fff',
                border:       'none',
                borderRadius: '8px',
                cursor:       !newMsg.trim() || sending ? 'not-allowed' : 'pointer',
                fontSize:     '13px',
                fontWeight:   600,
                opacity:      !newMsg.trim() || sending ? 0.5 : 1,
                alignSelf:    'flex-end',
                whiteSpace:   'nowrap',
              }}
            >
              {sending ? '…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: Omit<CaseEvent, '_kind'> }) {
  const { icon, accent, bg } = getEventConfig(event.event_type);
  return (
    <div
      style={{
        display:      'flex',
        gap:          '12px',
        padding:      '12px 14px',
        background:   bg,
        borderRadius: '10px',
        borderLeft:   `3px solid ${accent}`,
      }}
    >
      <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '2px' }}>
          {event.title}
        </div>
        {event.description && (
          <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.6)', lineHeight: 1.5 }}>
            {event.description}
          </div>
        )}
        <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.35)', marginTop: '4px' }}>
          {formatRelativeTime(event.created_at)}
        </div>
      </div>
    </div>
  );
}

// ─── Message card ─────────────────────────────────────────────────────────────

function MessageCard({ msg, userId }: { msg: Omit<Message, '_kind'>; userId: string }) {
  const isMe      = msg.sender_id === userId;
  const senderLabel = msg.sender
    ? `${msg.sender.full_name} · ${getRoleLabel(msg.sender.role)}`
    : isMe ? 'You' : 'Other party';

  return (
    <div
      style={{
        display:    'flex',
        justifyContent: isMe ? 'flex-end' : 'flex-start',
        gap:        '10px',
        padding:    '0 4px',
      }}
    >
      {!isMe && (
        <div
          style={{
            width:        '28px',
            height:       '28px',
            borderRadius: '50%',
            background:   'var(--teal)',
            color:        '#fff',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            fontSize:     '11px',
            fontWeight:   700,
            flexShrink:   0,
            marginTop:    '2px',
          }}
        >
          {(msg.sender?.full_name ?? 'U').charAt(0).toUpperCase()}
        </div>
      )}
      <div style={{ maxWidth: '72%' }}>
        {!isMe && (
          <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.45)', marginBottom: '4px', marginLeft: '2px' }}>
            {senderLabel}
          </div>
        )}
        <div
          style={{
            padding:      '10px 14px',
            borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            background:   isMe ? 'var(--ink)' : '#fff',
            border:       isMe ? 'none' : '1px solid #e9ecef',
            color:        isMe ? 'var(--cream)' : 'var(--ink)',
            fontSize:     '13px',
            lineHeight:   1.55,
          }}
        >
          {msg.content && !(msg.file_url && msg.content === msg.file_name) && (
            <span>{msg.content}</span>
          )}
          {msg.file_url && msg.file_name && (
            <a
              href={msg.file_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display:        'flex',
                alignItems:     'center',
                gap:            '6px',
                marginTop:      msg.content && msg.content !== msg.file_name ? '8px' : '0',
                padding:        '6px 10px',
                background:     isMe ? 'rgba(245,240,232,0.08)' : 'rgba(14,12,10,0.04)',
                borderRadius:   '6px',
                border:         `1px solid ${isMe ? 'rgba(245,240,232,0.15)' : 'rgba(14,12,10,0.1)'}`,
                textDecoration: 'none',
                color:          isMe ? 'rgba(245,240,232,0.85)' : 'var(--ink)',
                fontSize:       '12px',
              }}
            >
              📎 {msg.file_name}
            </a>
          )}
        </div>
        <div
          style={{
            fontSize:  '10px',
            color:     'rgba(14,12,10,0.35)',
            marginTop: '3px',
            textAlign: isMe ? 'right' : 'left',
          }}
        >
          {formatRelativeTime(msg.created_at)}
        </div>
      </div>
    </div>
  );
}
