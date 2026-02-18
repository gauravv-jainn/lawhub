import { AuditAction } from '@prisma/client';
import { prisma } from './db/prisma';

export async function logAudit(input: { firmId: string; userId: string; action: AuditAction; entityType: string; entityId: string; metadata?: any }) {
  await prisma.auditLog.create({ data: { metadata: input.metadata ?? {}, ...input } });
}
