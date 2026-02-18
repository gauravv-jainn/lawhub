import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

export interface StorageProvider { save(file: File): Promise<{ path: string; size: number; mimeType: string }>; }

class LocalStorageProvider implements StorageProvider {
  async save(file: File) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'bin';
    const name = `${randomUUID()}.${ext}`;
    const relPath = path.join('uploads', name);
    await fs.mkdir(path.join(process.cwd(), 'public', 'uploads'), { recursive: true });
    await fs.writeFile(path.join(process.cwd(), 'public', relPath), bytes);
    return { path: `/${relPath}`, size: bytes.length, mimeType: file.type || 'application/octet-stream' };
  }
}

export const storageProvider: StorageProvider = new LocalStorageProvider();
