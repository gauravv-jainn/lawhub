import { NextResponse } from 'next/server';
import { storageProvider } from '@/lib/storage';

export async function POST(req: Request){
  const form = await req.formData();
  const file = form.get('file') as File;
  if (!file) return NextResponse.json({ error: 'File missing' }, { status: 400 });
  const saved = await storageProvider.save(file);
  return NextResponse.json(saved);
}
