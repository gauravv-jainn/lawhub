import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import type { UserRole } from '@/types';

// NOTE: PrismaAdapter intentionally omitted.
// Using strategy: 'jwt' with PrismaAdapter creates orphaned DB session rows that
// are never used. JWT strategy is stateless — the adapter adds write overhead
// with zero benefit here. Session revocation is handled by short maxAge.

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 4 * 60 * 60, // 4 hours — limits exposure window if role changes
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax', // 'strict' breaks credentials redirect — cookie not sent on post-login navigation
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            full_name: true,
            password: true,
            role: true,
          },
        });
        if (!user) return null;

        const passwordMatch = await bcrypt.compare(credentials.password, user.password);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role, // typed as Role enum from Prisma — cast-free
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign-in: populate token from user object
      if (user) {
        token.id = user.id;
        token.role = (user as { id: string; role: UserRole }).role;
      }

      // On explicit session update (trigger === 'update'): re-fetch role from DB
      // to pick up any role changes made since last login
      if (trigger === 'update' && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        if (dbUser) {
          token.role = dbUser.role as UserRole;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
};
