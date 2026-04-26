import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function EnterpriseInternshipsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const postings = await prisma.internshipPosting.findMany({
    where: { enterprise_id: userId },
    include: { _count: { select: { applications: true } } },
    orderBy: { created_at: 'desc' },
  });

  const statusColor: Record<string, { bg: string; text: string }> = {
    active: { bg: 'rgba(13,115,119,0.08)', text: 'var(--teal)' },
    closed: { bg: 'rgba(14,12,10,0.06)', text: 'rgba(14,12,10,0.5)' },
    filled: { bg: 'rgba(184,134,11,0.08)', text: 'var(--gold)' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold" style={{ color: 'var(--ink)' }}>Internships</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(14,12,10,0.5)' }}>Post and manage internship openings</p>
        </div>
        <Link href="/enterprise/internships/new"
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'var(--gold)' }}>
          + Post Internship
        </Link>
      </div>

      {postings.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center" style={{ borderColor: 'rgba(14,12,10,0.08)' }}>
          <div className="text-4xl mb-3">🎓</div>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>No internships posted yet</h3>
          <p className="text-sm mb-4" style={{ color: 'rgba(14,12,10,0.5)' }}>
            Attract talented law students to your firm
          </p>
          <Link href="/enterprise/internships/new"
            className="inline-block px-5 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--gold)' }}>
            Post your first internship
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {postings.map(p => {
            const colors = statusColor[p.status] ?? statusColor.active;
            return (
              <div key={p.id} className="bg-white rounded-xl border p-5"
                style={{ borderColor: 'rgba(14,12,10,0.08)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>{p.title}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                        style={{ background: colors.bg, color: colors.text }}>
                        {p.status}
                      </span>
                    </div>
                    <div className="text-xs space-x-3" style={{ color: 'rgba(14,12,10,0.5)' }}>
                      <span>⏱ {p.duration}</span>
                      {p.stipend && <span>💰 {p.stipend}</span>}
                      {p.location && <span>📍 {p.location}</span>}
                      {p.remote && <span>🌐 Remote</span>}
                      <span>👥 {p.openings} opening{p.openings !== 1 ? 's' : ''}</span>
                    </div>
                    {p.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.skills.map(s => (
                          <span key={s} className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(14,12,10,0.05)', color: 'rgba(14,12,10,0.6)' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{p._count.applications}</div>
                    <div className="text-xs" style={{ color: 'rgba(14,12,10,0.4)' }}>applicant{p._count.applications !== 1 ? 's' : ''}</div>
                    <Link href={`/enterprise/internships/${p.id}`}
                      className="text-xs mt-2 block" style={{ color: 'var(--teal)' }}>
                      View →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
