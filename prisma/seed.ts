import { PrismaClient, Role, ThemePreference, FirmRole, MatterSubType, CourtType, MatterStage, MatterStatus, MatterOutcome, Priority, TaskStatus, DeadlineType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@civilcaseos.in' },
    update: {},
    create: { name: 'Aarav Admin', email: 'admin@civilcaseos.in', passwordHash, role: Role.ADMIN, themePreference: ThemePreference.SYSTEM }
  });
  const firm = await prisma.firm.upsert({ where: { id: 'demo-firm' }, update: {}, create: { id: 'demo-firm', name: 'CivilCaseOS Demo Chambers', address: 'New Delhi' } });
  await prisma.membership.upsert({ where: { firmId_userId: { firmId: firm.id, userId: admin.id } }, update: {}, create: { firmId: firm.id, userId: admin.id, firmRole: FirmRole.OWNER } });
  const client = await prisma.client.create({ data: { firmId: firm.id, fullName: 'Rohit Sharma', phone: '+919812345678', notes: 'Property partition dispute' } });
  const matter = await prisma.matter.create({
    data: {
      firmId: firm.id,
      clientId: client.id,
      title: 'Sharma vs Sharma - Partition Suit',
      subType: MatterSubType.PARTITION,
      courtName: 'Saket District Court',
      courtCity: 'Delhi',
      courtType: CourtType.DISTRICT,
      caseNumber: 'CS/1024/2026',
      stage: MatterStage.PLEADINGS,
      status: MatterStatus.ACTIVE,
      outcome: MatterOutcome.NA,
      description: 'Civil partition and possession claim',
      nextHearingAt: new Date(Date.now() + 1000*60*60*24*4)
    }
  });
  await prisma.task.create({ data: { matterId: matter.id, assignedToUserId: admin.id, title: 'Draft replication', status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH } });
  await prisma.deadline.create({ data: { matterId: matter.id, type: DeadlineType.WS_DUE, title: 'Written statement due', dueAt: new Date(Date.now()+1000*60*60*24*6), priority: Priority.CRITICAL } });
  await prisma.template.create({ data: { firmId: firm.id, name: 'Civil Notice Basic', templateType: 'NOTICE', content: 'To {{oppositeParty}},\n\nUnder instructions from my client {{clientName}}...', variablesSchema: { variables: ['oppositeParty', 'clientName'] } } });
}

main().finally(()=>prisma.$disconnect());
