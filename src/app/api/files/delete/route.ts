import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { path } = await req.json();
    if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 });

    // Extract the Cloudinary public_id from the URL and delete via Cloudinary API
    // The path here is the full Cloudinary URL; we parse out the public_id
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 });
    }

    // Extract public_id from Cloudinary URL
    // URL format: https://res.cloudinary.com/<cloud>/image/upload/v<ver>/<folder>/<filename>
    const match = path.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid file URL' }, { status: 400 });
    }
    const publicId = match[1];

    const timestamp = Math.floor(Date.now() / 1000);
    const crypto = await import('crypto');
    const signature = crypto
      .createHash('sha1')
      .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
      .digest('hex');

    const formData = new URLSearchParams();
    formData.append('public_id', publicId);
    formData.append('timestamp', String(timestamp));
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      body: formData,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/files/delete]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
