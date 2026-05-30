import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { authRateLimit } from '@/lib/ratelimit';
import { sendVerificationEmail } from '@/lib/resend';
import {
  clientRegisterSchema,
  lawyerStep1Schema,
  lawyerStep2Schema,
  lawyerStep3Schema,
} from '@/lib/utils/validators';
import { z } from 'zod';

function makeVerificationToken(): { token: string; expires: Date } {
  return {
    token:   crypto.randomBytes(32).toString('hex'),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  };
}

async function dispatchVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    console.error('[register] NEXT_PUBLIC_APP_URL is not set — verification link will be broken');
  }
  const url = `${baseUrl ?? ''}/api/auth/verify-email?token=${token}`;
  try {
    await sendVerificationEmail(email, name, url);
  } catch (err: unknown) {
    // Email failure must never block registration — user can resend
    const message = err instanceof Error ? err.message : String(err);
    console.error('[register] Verification email failed:', message);
  }
}

// Composite schema for lawyer registration (all three steps merged into one POST)
const lawyerRegisterSchema = lawyerStep1Schema.merge(lawyerStep2Schema).merge(lawyerStep3Schema).extend({
  only_legal_advice: z.boolean().optional(),
  lawyer_type: z.enum(['junior_advocate', 'senior_advocate', 'associate']).optional(),
  bci_doc_url: z.string().url().optional().nullable(),
  aadhaar_doc_url: z.string().url().optional().nullable(),
  degree_doc_url: z.string().url().optional().nullable(),
});

const enterpriseRegisterSchema = z.object({
  contact_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  password: z.string().min(8),
  firm_name: z.string().min(2),
  registration_no: z.string().min(3),
  firm_type: z.enum(['law_firm', 'corporate', 'chambers']).optional(),
  website: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
});

const ngoRegisterSchema = z.object({
  contact_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  password: z.string().min(8),
  org_name: z.string().min(2),
  registration_no: z.string().min(3),
  cause_areas: z.array(z.string()).optional(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
});

// POST /api/auth/register — multi-type registration
export async function POST(req: NextRequest) {
  // Rate limit: 10 registrations per 15 minutes per IP
  const limited = await authRateLimit(req, 'register');
  if (limited) return limited;

  try {
    const body = await req.json() as { type?: string } & Record<string, unknown>;
    const { type } = body;

    const existing = await prisma.user.findUnique({
      where: { email: (body.email as string | undefined) ?? '' },
    });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // ── Client ────────────────────────────────────────────────────────────
    if (type === 'client') {
      const parsed = clientRegisterSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
      }
      const d = parsed.data;
      const hashedPassword = await bcrypt.hash(d.password, 12);
      const { token, expires } = makeVerificationToken();
      const user = await prisma.user.create({
        data: {
          email: d.email,
          password: hashedPassword,
          full_name: d.full_name,
          phone: d.phone,
          city: d.city,
          state: d.state,
          role: 'client',
          email_verification_token:   token,
          email_verification_expires: expires,
        },
      });
      await dispatchVerificationEmail(d.email, d.full_name, token);
      return NextResponse.json({ userId: user.id });
    }

    // ── Lawyer ────────────────────────────────────────────────────────────
    if (type === 'lawyer') {
      const parsed = lawyerRegisterSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
      }
      const d = parsed.data;
      const hashedPassword = await bcrypt.hash(d.password, 12);
      const { token: lToken, expires: lExpires } = makeVerificationToken();
      const user = await prisma.user.create({
        data: {
          email: d.email,
          password: hashedPassword,
          full_name: d.full_name,
          phone: d.phone,
          role: 'lawyer',
          email_verification_token:   lToken,
          email_verification_expires: lExpires,
          lawyer_profile: {
            create: {
              bci_number: d.bci_number,
              bar_council: d.bar_council,
              primary_court: d.primary_court,
              experience_years: Number(d.experience_years),
              practice_areas: d.practice_areas,
              lawyer_type: d.lawyer_type ?? 'junior_advocate',
              only_legal_advice: d.only_legal_advice ?? false,
              verification_status: 'pending',
              bci_doc_url: d.bci_doc_url ?? null,
              aadhaar_doc_url: d.aadhaar_doc_url ?? null,
              degree_doc_url: d.degree_doc_url ?? null,
            },
          },
        },
      });
      await dispatchVerificationEmail(d.email, d.full_name, lToken);
      return NextResponse.json({ userId: user.id });
    }

    // ── Enterprise / Law Firm ─────────────────────────────────────────────
    if (type === 'enterprise') {
      const parsed = enterpriseRegisterSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
      }
      const d = parsed.data;
      const hashedPassword = await bcrypt.hash(d.password, 12);
      const { token: eToken, expires: eExpires } = makeVerificationToken();
      const user = await prisma.user.create({
        data: {
          email: d.email,
          password: hashedPassword,
          full_name: d.contact_name,
          phone: d.phone,
          city: d.city ?? null,
          state: d.state ?? null,
          role: 'enterprise',
          email_verification_token:   eToken,
          email_verification_expires: eExpires,
          enterprise_profile: {
            create: {
              firm_name: d.firm_name,
              registration_no: d.registration_no,
              firm_type: d.firm_type ?? 'law_firm',
              website: d.website ?? null,
              description: d.description ?? null,
              city: d.city ?? null,
              state: d.state ?? null,
              verification_status: 'pending',
            },
          },
        },
      });
      await dispatchVerificationEmail(d.email, d.contact_name, eToken);
      return NextResponse.json({ userId: user.id });
    }

    // ── NGO ───────────────────────────────────────────────────────────────
    if (type === 'ngo') {
      const parsed = ngoRegisterSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
      }
      const d = parsed.data;
      const hashedPassword = await bcrypt.hash(d.password, 12);
      const { token: nToken, expires: nExpires } = makeVerificationToken();
      const user = await prisma.user.create({
        data: {
          email: d.email,
          password: hashedPassword,
          full_name: d.contact_name,
          phone: d.phone,
          city: d.city ?? null,
          state: d.state ?? null,
          role: 'ngo',
          email_verification_token:   nToken,
          email_verification_expires: nExpires,
          ngo_profile: {
            create: {
              org_name: d.org_name,
              registration_no: d.registration_no,
              cause_areas: d.cause_areas ?? [],
              city: d.city ?? null,
              state: d.state ?? null,
              website: d.website ?? null,
              description: d.description ?? null,
              verification_status: 'pending',
            },
          },
        },
      });
      await dispatchVerificationEmail(d.email, d.contact_name, nToken);
      return NextResponse.json({ userId: user.id });
    }

    return NextResponse.json({ error: 'Invalid registration type' }, { status: 400 });
  } catch (err: unknown) {
    console.error('[POST /api/auth/register]', err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
