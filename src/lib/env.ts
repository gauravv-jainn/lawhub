/**
 * Centralized environment variable validation.
 * Import this in any server-side file that needs env vars.
 * Call validateServerEnv() once at startup to catch misconfigurations early.
 */
import 'server-only';

const REQUIRED_SERVER_VARS = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
] as const;

const REQUIRED_PAYMENT_VARS = [
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
] as const;

const REQUIRED_STORAGE_VARS = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const;

type RequiredVar =
  | (typeof REQUIRED_SERVER_VARS)[number]
  | (typeof REQUIRED_PAYMENT_VARS)[number]
  | (typeof REQUIRED_STORAGE_VARS)[number];

/** Throws at startup if critical env vars are missing */
export function validateServerEnv(): void {
  const missing: string[] = [];

  for (const key of [...REQUIRED_SERVER_VARS, ...REQUIRED_PAYMENT_VARS, ...REQUIRED_STORAGE_VARS]) {
    if (!process.env[key]) missing.push(key);
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Check .env.local or your deployment environment settings.'
    );
  }
}

/** Get a required env var — throws clearly if missing */
export function requireEnv(key: RequiredVar): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable "${key}" is not set`);
  }
  return value;
}

/** Get an optional env var with a fallback */
export function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}
