'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { formatRelativeTime } from '@/lib/utils/formatDate';

interface Message {
  id: string;
  sender_id: string;
  sender?: { full_name: string; role: string };
  content: string;
  file_url?: string | null;
  file_name?: string | null;
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
  const [messages, setMessages]     = useState<Message[]>(initialMessages);
  const [newMsg, setNewMsg]         = useState('');
  const [sending, setSending]       = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileToSend, setFileToSend] = useState<{ url: string; name: string } | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll for new messages every 6 seconds
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
    }, 6000);
    return () => clearInterval(interval);
  }, [caseId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if ((!newMsg.trim() && !fileToSend) || sending) return;
    setSending(true);

    const content = newMsg.trim() || (fileToSend ? fileToSend.name : '');
    setNewMsg('');
    const pendingFile = fileToSend;
    setFileToSend(null);

    try {
      const res = await fetch(`/api/cases/${caseId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          sender_role: userRole,
          ...(pendingFile ? { file_url: pendingFile.url, file_name: pendingFile.name } : {}),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
      }
    } catch {
      // silently fail
    }
    setSending(false);
  }, [caseId, newMsg, fileToSend, sending, userRole]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', `cases/${caseId}/messages`);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setFileToSend({ url: data.url, name: file.name });
      }
    } catch {
      // silently fail
    }
    setUploadingFile(false);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  return (
    <div>
      {/* Message list */}
      <div
        style={{
          maxHeight: '360px', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '10px',
          marginBottom: '16px', paddingRight: '4px',
        }}
      >
        {messages.length === 0 && (
          <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.4)', textAlign: 'center', padding: '24px' }}>
            No messages yet. Start the conversation.
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === userId;
          const hasFile = !!(msg.file_url && msg.file_name);

          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  maxWidth: '75%',
                  padding: '10px 14px',
                  borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: isMe ? 'var(--ink)' : 'var(--cream)',
                  border: isMe ? 'none' : '1px solid rgba(14,12,10,0.08)',
                  color: isMe ? 'var(--cream)' : 'var(--ink)',
                }}
              >
                {!isMe && msg.sender && (
                  <div
                    style={{
                      fontSize: '10px', fontWeight: 600, marginBottom: '4px',
                      color: isMe ? 'rgba(245,240,232,0.5)' : 'rgba(14,12,10,0.4)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {msg.sender.full_name}
                  </div>
                )}

                {/* Text content */}
                {msg.content && !(hasFile && msg.content === msg.file_name) && (
                  <div style={{ fontSize: '13px', lineHeight: 1.55 }}>{msg.content}</div>
                )}

                {/* Attached file */}
                {hasFile && (
                  <a
                    href={msg.file_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      marginTop: msg.content && msg.content !== msg.file_name ? '8px' : '0',
                      padding: '8px 10px',
                      background: isMe ? 'rgba(245,240,232,0.08)' : 'rgba(14,12,10,0.04)',
                      borderRadius: '8px',
                      border: `1px solid ${isMe ? 'rgba(245,240,232,0.12)' : 'rgba(14,12,10,0.1)'}`,
                      textDecoration: 'none',
                    }}
                  >
                    {isImageUrl(msg.file_url!) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={msg.file_url!}
                        alt={msg.file_name!}
                        style={{ maxWidth: '180px', maxHeight: '120px', borderRadius: '6px', display: 'block' }}
                      />
                    ) : (
                      <>
                        <span style={{ fontSize: '16px' }}>📎</span>
                        <span
                          style={{
                            fontSize: '12px', fontWeight: 500,
                            color: isMe ? 'rgba(245,240,232,0.85)' : 'var(--ink)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            maxWidth: '180px',
                          }}
                        >
                          {msg.file_name}
                        </span>
                      </>
                    )}
                  </a>
                )}

                <div
                  style={{
                    fontSize: '10px', marginTop: '4px',
                    color: isMe ? 'rgba(245,240,232,0.45)' : 'rgba(14,12,10,0.35)',
                    textAlign: 'right',
                  }}
                >
                  {formatRelativeTime(msg.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* File attachment preview */}
      {fileToSend && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 12px', marginBottom: '8px',
            background: 'rgba(13,115,119,0.06)',
            border: '1px solid rgba(13,115,119,0.2)',
            borderRadius: '8px',
          }}
        >
          <span style={{ fontSize: '16px' }}>📎</span>
          <span style={{ fontSize: '12px', color: 'var(--ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fileToSend.name}
          </span>
          <button
            onClick={() => setFileToSend(null)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '16px', color: 'rgba(14,12,10,0.4)', lineHeight: 1,
              padding: '0 2px',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Compose area */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        {/* Attach file button */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id={`msg-file-${caseId}`}
        />
        <label
          htmlFor={`msg-file-${caseId}`}
          title="Attach file"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '38px', height: '38px', borderRadius: '10px',
            border: '1px solid rgba(14,12,10,0.15)',
            background: uploadingFile ? 'rgba(14,12,10,0.05)' : 'white',
            cursor: uploadingFile ? 'default' : 'pointer',
            fontSize: '16px', flexShrink: 0,
          }}
        >
          {uploadingFile ? (
            <span style={{ fontSize: '12px', color: 'rgba(14,12,10,0.4)' }}>…</span>
          ) : '📎'}
        </label>

        <textarea
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
          }}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
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
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={(!newMsg.trim() && !fileToSend) || sending}
          style={{
            padding: '10px 18px',
            background: 'var(--gold)', color: 'white',
            border: 'none', borderRadius: '10px',
            cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            alignSelf: 'flex-end',
            opacity: (!newMsg.trim() && !fileToSend) || sending ? 0.5 : 1,
          }}
        >
          {sending ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
