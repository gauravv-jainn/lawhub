// ─── Server-only Cloudinary operations (uses Node.js SDK) ────────────────────
// NEVER import this in client components.
import 'server-only';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// ─── Public upload (avatars, lawyer profile docs) ────────────────────────────

export async function uploadFileServer(
  buffer:   Buffer,
  filename: string,
  folder  = 'lawhub'
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          public_id:     filename,
          resource_type: 'auto',
          overwrite:     false,
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      )
      .end(buffer);
  });
}

// ─── Authenticated upload (case documents, dispute evidence) ─────────────────
// Files uploaded with type="authenticated" CANNOT be accessed directly via URL.
// A signed URL must be generated via generateSignedDownloadUrl().

export async function uploadFileSecure(
  buffer:   Buffer,
  filename: string,
  folder  = 'lawhub'
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          public_id:     filename,
          resource_type: 'auto',
          type:          'authenticated',  // requires signed URL to access
          overwrite:     false,
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      )
      .end(buffer);
  });
}

// ─── Signed download URL (for authenticated resources) ───────────────────────

export function generateSignedDownloadUrl(
  publicId:       string,
  expirySeconds = 600  // 10 minutes
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expirySeconds;
  return cloudinary.url(publicId, {
    sign_url:      true,
    secure:        true,
    type:          'authenticated',
    expires_at:    expiresAt,
    resource_type: 'auto',
  });
}

// ─── Delete (handles both public and authenticated resources) ─────────────────

export async function deleteFileServer(
  publicId:     string,
  resourceType: 'image' | 'video' | 'raw' | 'auto' = 'raw',
  type:         'upload' | 'authenticated' = 'upload'
): Promise<void> {
  // Try both authenticated and upload types in case we're unsure
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType === 'auto' ? 'image' : resourceType,
      type,
      invalidate: true,
    });
  } catch (err) {
    console.warn(`[deleteFileServer] Could not delete ${publicId}:`, err);
  }
}

export async function deleteFileSecure(publicId: string): Promise<void> {
  await deleteFileServer(publicId, 'raw', 'authenticated');
}
