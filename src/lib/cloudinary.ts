// ─── Client-safe Cloudinary upload (uses fetch, no Node.js SDK) ──────────────
// Safe to import in 'use client' components — no fs, no Buffer, no SDK.

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

export async function uploadFile(
  file: File,
  folder = 'lawhub'
): Promise<{ url: string; publicId: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) throw new Error('File upload failed');

  const data = await res.json();
  return { url: data.secure_url, publicId: data.public_id };
}
