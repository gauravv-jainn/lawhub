import { getServerSession } from 'next-auth';
import { authOptions } from './options';

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  return session;
}

export function hasRole(role: string, allowed: string[]) { return allowed.includes(role); }
