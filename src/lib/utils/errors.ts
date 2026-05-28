/** Type guard for Prisma unique-constraint violation (P2002) */
export function isPrismaUniqueError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as Record<string, unknown>).code === 'P2002'
  );
}

/** Type guard for Prisma not-found error (P2025) */
export function isPrismaNotFoundError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as Record<string, unknown>).code === 'P2025'
  );
}

/** Extract a safe message from an unknown error */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred';
}
