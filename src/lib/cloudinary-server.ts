// ─── Server-only Cloudinary upload (uses Node.js SDK) ────────────────────────
// NEVER import this in client components — Node.js only (fs, Buffer, etc.)
import 'server-only';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
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
        { folder, public_id: filename, resource_type: 'auto' },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      )
      .end(buffer);
  });
}

export async function deleteFileServer(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}
