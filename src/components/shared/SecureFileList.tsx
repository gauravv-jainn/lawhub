'use client';

/**
 * SecureFileList — renders a list of files whose download requires a signed URL.
 * Fetches /api/files/url?id=...&type=... on click, then opens the result.
 * Never exposes raw Cloudinary URLs in the DOM.
 */

import { useState } from 'react';

export interface SecureFile {
  id:        string;
  name:      string;
  mime_type?: string | null;
  file_size?: number | null;
  file_type?: string;
  uploaded_by?: string;
  uploader?: { full_name: string; role: string } | null;
  created_at?: string;
}

interface SecureFileListProps {
  files:     SecureFile[];
  fileType:  'milestone_attachment' | 'dispute_evidence';
  canDelete?: boolean;
  onDelete?: (id: string) => void;
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeIcon(mime: string | null | undefined): string {
  if (!mime) return '📎';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime === 'application/pdf') return '📄';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  return '📎';
}

export default function SecureFileList({
  files,
  fileType,
  canDelete,
  onDelete,
}: SecureFileListProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function openFile(id: string) {
    setLoading(id);
    setError(null);
    try {
      const res = await fetch(`/api/files/url?id=${encodeURIComponent(id)}&type=${fileType}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Could not load file.');
        return;
      }
      const { url } = await res.json();
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  if (files.length === 0) {
    return (
      <p style={{ color: 'var(--ink-3)', fontSize: '13px', fontStyle: 'italic' }}>
        No files attached.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {error && (
        <p style={{ fontSize: '12px', color: '#c92a2a', marginBottom: '4px' }}>{error}</p>
      )}
      {files.map((file) => (
        <div
          key={file.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef',
          }}
        >
          <span style={{ fontSize: '16px', flexShrink: 0 }}>{mimeIcon(file.mime_type)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <button
              onClick={() => openFile(file.id)}
              disabled={loading === file.id}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: loading === file.id ? 'wait' : 'pointer',
                color: '#3b5bdb',
                fontSize: '13px',
                fontWeight: 500,
                textDecoration: 'underline',
                textAlign: 'left',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              {loading === file.id ? '⏳ Loading…' : file.name}
            </button>
            <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
              {file.file_size && (
                <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                  {formatBytes(file.file_size)}
                </span>
              )}
              {file.uploader && (
                <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                  by {file.uploader.full_name} ({file.uploader.role})
                </span>
              )}
              {file.created_at && (
                <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                  {new Date(file.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(file.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ink-3)',
                fontSize: '16px',
                padding: '0 4px',
                flexShrink: 0,
              }}
              title="Delete file"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
