import { z } from 'zod';

export const clientSchema = z.object({ fullName: z.string().min(2), phone: z.string().optional(), email: z.string().email().optional().or(z.literal('')), address: z.string().optional(), notes: z.string().optional() });
export const matterSchema = z.object({ title: z.string().min(4), subType: z.enum(['PROPERTY','RECOVERY','INJUNCTION','CONTRACT','PARTITION','OTHER']), courtName: z.string(), courtCity: z.string(), courtType: z.enum(['DISTRICT','HIGH_COURT','OTHER']), caseNumber: z.string(), description: z.string().min(10) });
export const intakeSchema = z.object({ intakeType: z.enum(['PROPERTY','RECOVERY','INJUNCTION']), facts: z.string().min(20), relief: z.string().min(10), documents: z.string().optional() });
