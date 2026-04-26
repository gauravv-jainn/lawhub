import prisma from '@/lib/prisma';
import { formatDate } from '@/lib/utils/formatDate';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') redirect('/auth/login');

  const users = await prisma.user.findMany({
    orderBy: { created_at: 'desc' },
    take: 100,
  });

  const allUsers = users ?? [];

  return (
    <div className="page-container">
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '32px' }}>
        User Management
      </h1>
      <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.45)', marginBottom: '20px' }}>
        {allUsers.length} registered users
      </p>

      <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(14,12,10,0.08)', background: 'var(--cream)' }}>
              {['Name', 'Role', 'City', 'State', 'Joined'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: 'rgba(14,12,10,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allUsers.map((u: any) => (
              <tr key={u.id} style={{ borderBottom: '1px solid rgba(14,12,10,0.05)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--ink)' }}>{u.full_name}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '100px', fontWeight: 600,
                    background: u.role === 'lawyer' ? 'rgba(13,115,119,0.1)' : u.role === 'admin' ? 'rgba(184,134,11,0.1)' : 'rgba(14,12,10,0.06)',
                    color: u.role === 'lawyer' ? 'var(--teal)' : u.role === 'admin' ? 'var(--gold)' : 'rgba(14,12,10,0.5)',
                  }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: 'rgba(14,12,10,0.55)' }}>{u.city ?? '—'}</td>
                <td style={{ padding: '12px 16px', color: 'rgba(14,12,10,0.55)' }}>{u.state ?? '—'}</td>
                <td style={{ padding: '12px 16px', color: 'rgba(14,12,10,0.45)' }}>{formatDate(u.created_at.toISOString())}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
