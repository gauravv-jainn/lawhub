import 'next-auth';
import 'next-auth/jwt';
import type { UserRole } from '@/types';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      twoFactorVerified?: boolean;
      twoFactorSetupDone?: boolean;    // non-admin roles: whether TOTP is configured
      adminTwoFactorSetupDone?: boolean; // admin only (legacy compat)
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    twoFactorVerified?: boolean;
    twoFactorSetupDone?: boolean;      // non-admin roles
    adminTwoFactorSetupDone?: boolean; // admin only (legacy compat)
  }
}
