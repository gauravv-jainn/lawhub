import { Suspense } from 'react';
import NetworkClient from './NetworkClient';

export const metadata = { title: 'Network — LawHub' };

export default function NetworkPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--parchment)' }}>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold" style={{ color: 'var(--ink)' }}>
            Legal Network
          </h1>
          <p className="text-sm mt-2" style={{ color: 'rgba(14,12,10,0.5)' }}>
            Connect with verified advocates across India
          </p>
        </div>
        <Suspense fallback={<div className="text-sm" style={{ color: 'rgba(14,12,10,0.4)' }}>Loading…</div>}>
          <NetworkClient />
        </Suspense>
      </div>
    </div>
  );
}
