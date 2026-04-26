'use client'

import { useRef, useState, useCallback } from 'react'
import { Upload, X, FileText, Loader2 } from 'lucide-react'
import { uploadFile } from '@/lib/cloudinary'

interface UploadedFile {
  name: string
  url: string
  path: string
  size: number
}

interface FileUploaderProps {
  bucket: string
  folder: string
  accept?: string
  maxSizeMB?: number
  maxFiles?: number
  value?: UploadedFile[]
  onChange?: (files: UploadedFile[]) => void
  label?: string
}

export default function FileUploader({
  bucket,
  folder,
  accept = '*/*',
  maxSizeMB = 10,
  maxFiles = 5,
  value = [],
  onChange,
  label = 'Upload files',
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(
    async (files: FileList) => {
      setError(null)
      const remaining = maxFiles - value.length
      if (remaining <= 0) {
        setError(`Maximum ${maxFiles} files allowed`)
        return
      }

      const toUpload = Array.from(files).slice(0, remaining)
      const oversized = toUpload.find((f) => f.size > maxSizeMB * 1024 * 1024)
      if (oversized) {
        setError(`File "${oversized.name}" exceeds ${maxSizeMB}MB limit`)
        return
      }

      setUploading(true)
      try {
        const uploaded: UploadedFile[] = []
        for (const file of toUpload) {
          const { url } = await uploadFile(file, 'lawhub')
          uploaded.push({ name: file.name, url, path: url, size: file.size })
        }
        onChange?.([...value, ...uploaded])
      } catch {
        setError('Upload failed. Please try again.')
      } finally {
        setUploading(false)
      }
    },
    [maxFiles, maxSizeMB, value, onChange]
  )

  async function removeFile(path: string) {
    onChange?.(value.filter((f) => f.path !== path))
    await fetch('/api/files/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files) }}
        className={`relative border-2 border-dashed rounded-xl p-6 cursor-pointer text-center transition-all ${
          dragOver
            ? 'border-gold bg-gold/5'
            : 'border-ink/20 hover:border-gold/50 hover:bg-gold/3'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          className="hidden"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
            <span className="text-sm text-ink/50">Uploading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-ink/30" />
            <span className="text-sm font-medium text-ink/70">{label}</span>
            <span className="text-xs text-ink/40">
              Drop here or click · Max {maxSizeMB}MB{maxFiles > 1 ? ` · Up to ${maxFiles} files` : ''}
            </span>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Uploaded files */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((file) => (
            <div
              key={file.path}
              className="flex items-center gap-3 px-3 py-2 bg-cream rounded-lg border border-ink/10"
            >
              <FileText className="w-4 h-4 text-teal flex-shrink-0" />
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm text-ink/80 hover:text-ink truncate"
              >
                {file.name}
              </a>
              <span className="text-xs text-ink/40">
                {(file.size / 1024).toFixed(0)}KB
              </span>
              <button
                onClick={() => removeFile(file.path)}
                className="text-ink/30 hover:text-rust transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
