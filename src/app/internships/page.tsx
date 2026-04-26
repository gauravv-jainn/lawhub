import { Suspense } from 'react';
import InternshipsClient from './InternshipsClient';

export const metadata = { title: 'Internships — LawHub' };

export default function InternshipsPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--parchment)' }}>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold" style={{ color: 'var(--ink)' }}>
            Legal Internships
          </h1>
          <p className="text-sm mt-2" style={{ color: 'rgba(14,12,10,0.5)' }}>
            Opportunities from verified law firms and enterprises across India
          </p>
        </div>
        <Suspense fallback={<div className="text-sm" style={{ color: 'rgba(14,12,10,0.4)' }}>Loading…</div>}>
          <InternshipsClient />
        </Suspense>
      </div>
    </div>
  );
}
