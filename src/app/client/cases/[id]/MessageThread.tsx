'use client';

import { useState, useEffect, useRef } from 'react';
import { formatRelativeTime } from '@/lib/utils/formatDate';

interface Message {
  id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface Props {
  caseId: string;
  userId: string;
  userRole: 'client' | 'lawyer';
  initialMessages: Message[];
}

export default function MessageThread({ caseId, userId, userRole, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages ?? []);
        }
      } catch {
        // silently fail
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [caseId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() || sending) return;
    setSending(true);
    const msg = newMsg.trim();
    setNewMsg('');

    try {
      const res = await fetch(`/api/cases/${caseId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: msg, sender_role: userRole }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
      }
    } catch {
      // silently fail
    }

    setSending(false);
  };

  return (
    <div>
      {/* Messages */}
      <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', paddingRight: '4px' }}>
        {messages.length === 0 && (
          <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.4)', textAlign: 'center', padding: '24px' }}>
            No messages yet. Start the conversation.
          </p>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === userId;
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%',
                padding: '10px 14px',
                borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: isMe ? 'var(--ink)' : 'var(--cream)',
                border: isMe ? 'none' : '1px solid rgba(14,12,10,0.08)',
                color: isMe ? 'var(--cream)' : 'var(--ink)',
              }}>
                <div style={{ fontSize: '13px', lineHeight: 1.55 }}>{msg.content}</div>
                <div style={{ fontSize: '10px', marginTop: '4px', color: isMe ? 'rgba(245,240,232,0.45)' : 'rgba(14,12,10,0.35)', textAlign: 'right' }}>
                  {formatRelativeTime(msg.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <textarea
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Type a message… (Enter to send)"
          rows={2}
          style={{
            flex: 1,
            padding: '10px 12px',
            border: '1px solid rgba(14,12,10,0.15)',
            borderRadius: '10px',
            fontSize: '13px',
            resize: 'none',
            background: 'var(--cream)',
            outline: 'none',
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
        <button onClick={sendMessage} disabled={!newMsg.trim() || sending}
          style={{
            padding: '10px 18px',
            background: 'var(--gold)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            alignSelf: 'flex-end',
            opacity: !newMsg.trim() || sending ? 0.5 : 1,
          }}>
          Send
        </button>
      </div>
    </div>
  );
}
