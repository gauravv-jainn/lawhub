// ─── Server-only Cloudinary operations (uses Node.js SDK) ────────────────────
// NEVER import this in client components.
import 'server-only';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  // Use server-only var (not NEXT_PUBLIC_) — cloud_name is not a secret but
  // using the non-public var keeps the pattern consistent for server code.
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function uploadFileServer(
  buffer: Buffer,
  filename: string,
  folder = 'lawhub'
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          public_id: filename,
          resource_type: 'auto',
          // Generate eager transformations for images: avatar and medium sizes
          eager: [
            { width: 96, height: 96, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
            { width: 800, quality: 'auto', fetch_format: 'auto' },
          ],
          eager_async: true,
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      )
      .end(buffer);
  });
}

export async function deleteFileServer(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { invalidate: true });
}
