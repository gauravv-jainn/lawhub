'use client';

/**
 * FileUploadZone — drag-and-drop upload with XHR progress tracking.
 * Uploads via a provided API endpoint using multipart/form-data.
 * Never uploads directly to Cloudinary — always goes through our server.
 */

import { useRef, useState, useCallback } from 'react';

const ALLOWED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt';

export interface UploadedFile {
  id:        string;
  name:      string;
  mime_type: string;
  file_size: number;
}

interface FileUploadZoneProps {
  uploadEndpoint: string;     // e.g. /api/cases/abc/milestones/1/attachments
  maxSizeMB?:     number;
  maxFiles?:      number;
  currentCount?:  number;
  onUpload:       (file: UploadedFile) => void;
  disabled?:      boolean;
  label?:         string;
}

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

export default function FileUploadZone({
  uploadEndpoint,
  maxSizeMB    = 10,
  maxFiles     = 10,
  currentCount = 0,
  onUpload,
  disabled     = false,
  label        = 'Attach a file',
}: FileUploadZoneProps) {
  const inputRef        = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);

      if (currentCount >= maxFiles) {
        setError(`Maximum ${maxFiles} files allowed.`);
        return;
      }

      if (!ALLOWED_MIME.has(file.type)) {
        setError('File type not allowed. Accepted: PDF, images, Word, text.');
        return;
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File too large. Maximum ${maxSizeMB}MB.`);
        return;
      }

      if (file.size === 0) {
        setError('File is empty.');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      setProgress(0);

      // Use XHR for upload progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              const att  = data.attachment ?? data.evidence;
              if (att) {
                onUpload({
                  id:        att.id,
                  name:      att.name,
                  mime_type: att.mime_type ?? file.type,
                  file_size: att.file_size ?? file.size,
                });
              }
              resolve();
            } catch {
              reject(new Error('Invalid server response.'));
            }
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              reject(new Error(data.error ?? 'Upload failed.'));
            } catch {
              reject(new Error('Upload failed.'));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error.'));
        xhr.onabort = () => reject(new Error('Upload cancelled.'));

        xhr.open('POST', uploadEndpoint);
        xhr.send(formData);
      }).catch((err: Error) => {
        setError(err.message);
      });

      setProgress(null);
      // Reset input so the same file can be re-uploaded if needed
      if (inputRef.current) inputRef.current.value = '';
    },
    [uploadEndpoint, maxFiles, maxSizeMB, currentCount, onUpload]
  );

  function handleFiles(fileList: FileList) {
    const file = fileList[0];
    if (file) uploadFile(file);
  }

  const isDisabled = disabled || progress !== null || currentCount >= maxFiles;

  return (
    <div>
      <div
        onClick={() => !isDisabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!isDisabled) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!isDisabled) handleFiles(e.dataTransfer.files);
        }}
        style={{
          border:      `2px dashed ${dragOver ? 'var(--ink-2)' : '#ced4da'}`,
          borderRadius: '10px',
          padding:     '16px 20px',
          cursor:      isDisabled ? 'not-allowed' : 'pointer',
          opacity:     isDisabled && progress === null ? 0.55 : 1,
          textAlign:   'center',
          background:  dragOver ? 'rgba(0,0,0,0.03)' : 'transparent',
          transition:  'border-color 0.15s, background 0.15s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS}
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={isDisabled}
        />

        {progress !== null ? (
          <div>
            <div style={{ fontSize: '13px', color: 'var(--ink-2)', marginBottom: '8px', fontWeight: 500 }}>
              Uploading… {progress}%
            </div>
            <div style={{ background: '#e9ecef', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
              <div
                style={{
                  width:      `${progress}%`,
                  height:     '100%',
                  background: 'var(--ink-2)',
                  borderRadius: '4px',
                  transition: 'width 0.1s ease',
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ color: isDisabled ? 'var(--ink-3)' : 'var(--ink-2)', fontSize: '13px' }}>
            <span style={{ fontSize: '18px', display: 'block', marginBottom: '4px' }}>↑</span>
            {currentCount >= maxFiles
              ? `Maximum ${maxFiles} files reached`
              : label}
            {!isDisabled && (
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--ink-3)', marginTop: '4px' }}>
                PDF, images, Word · max {maxSizeMB}MB
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <p style={{ color: '#c92a2a', fontSize: '12px', marginTop: '6px' }}>{error}</p>
      )}
    </div>
  );
}
