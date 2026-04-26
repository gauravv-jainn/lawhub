import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

// POST /api/auth/register
// Handles client, lawyer, enterprise, ngo, student registrations
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, ...data } = body;

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    // ── Client ────────────────────────────────────────────────────────────
    if (type === 'client') {
      const user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          full_name: data.full_name,
          phone: data.phone,
          city: data.city,
          state: data.state,
          role: 'client',
        },
      });
      return NextResponse.json({ userId: user.id });
    }

    // ── Lawyer ────────────────────────────────────────────────────────────
    if (type === 'lawyer') {
      const user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          full_name: data.full_name,
          phone: data.phone,
          role: 'lawyer',
          lawyer_profile: {
            create: {
              bci_number: data.bci_number,
              bar_council: data.bar_council,
              primary_court: data.primary_court,
              experience_years: Number(data.experience_years),
              practice_areas: data.practice_areas,
              lawyer_type: data.lawyer_type ?? 'junior_advocate',
              only_legal_advice: Boolean(data.only_legal_advice),
              verification_status: 'pending',
              bci_doc_url: data.bci_doc_url ?? null,
              aadhaar_doc_url: data.aadhaar_doc_url ?? null,
              degree_doc_url: data.degree_doc_url ?? null,
            },
          },
        },
      });
      return NextResponse.json({ userId: user.id });
    }

    // ── Enterprise / Law Firm ─────────────────────────────────────────────
    if (type === 'enterprise') {
      const user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          full_name: data.contact_name,
          phone: data.phone,
          city: data.city,
          state: data.state,
          role: 'enterprise',
          enterprise_profile: {
            create: {
              firm_name: data.firm_name,
              registration_no: data.registration_no,
              firm_type: data.firm_type ?? 'law_firm',
              website: data.website ?? null,
              description: data.description ?? null,
              city: data.city ?? null,
              state: data.state ?? null,
              verification_status: 'pending',
            },
          },
        },
      });
      return NextResponse.json({ userId: user.id });
    }

    // ── NGO ───────────────────────────────────────────────────────────────
    if (type === 'ngo') {
      const user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          full_name: data.contact_name,
          phone: data.phone,
          city: data.city,
          state: data.state,
          role: 'ngo',
          ngo_profile: {
            create: {
              org_name: data.org_name,
              registration_no: data.registration_no,
              cause_areas: data.cause_areas ?? [],
              city: data.city ?? null,
              state: data.state ?? null,
              website: data.website ?? null,
              description: data.description ?? null,
              verification_status: 'pending',
            },
          },
        },
      });
      return NextResponse.json({ userId: user.id });
    }

    // ── Student ───────────────────────────────────────────────────────────
    if (type === 'student') {
      const user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          full_name: data.full_name,
          phone: data.phone,
          city: data.city,
          state: data.state,
          role: 'student',
        },
      });
      return NextResponse.json({ userId: user.id });
    }

    return NextResponse.json({ error: 'Invalid registration type' }, { status: 400 });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
