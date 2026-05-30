import { Resend } from 'resend';
import { WelcomeEmail } from './emails/WelcomeEmail';
import { NewProposalEmail } from './emails/NewProposalEmail';
import { PaymentReceiptEmail } from './emails/PaymentReceiptEmail';
import { CaseUpdateEmail } from './emails/CaseUpdateEmail';
import VerificationEmail from './emails/VerificationEmail';

// Read from env so you can override per-environment without a code change.
// In development / before domain verification, set RESEND_FROM_EMAIL to
// "onboarding@resend.dev" in your .env.local to bypass domain verification.
const FROM = process.env.RESEND_FROM_EMAIL ?? 'LawHub <noreply@lawhub.in>';

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY is not set. Add it to .env.local or your deployment environment variables.');
    _resend = new Resend(key);
  }
  return _resend;
}

/**
 * In development with no RESEND_API_KEY, log emails to the terminal so you
 * can click the verification link without configuring Resend locally.
 * Returns true if the email was handled via console fallback (skip real send).
 */
function devConsoleFallback(subject: string, to: string, body: string): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.RESEND_API_KEY) return false; // real key present — use Resend

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧  DEV EMAIL (RESEND_API_KEY not set -- logging to console)');
  console.log('To:      ' + to);
  console.log('Subject: ' + subject);
  console.log(body);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  return true;
}

/** Wrapper that throws on Resend API errors (Resend returns {error} instead of throwing). */
async function send(payload: Parameters<Resend['emails']['send']>[0]): Promise<void> {
  const result = await getResend().emails.send(payload);
  if (result.error) {
    throw new Error(`Resend API error: ${result.error.message ?? JSON.stringify(result.error)}`);
  }
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  role: 'client' | 'lawyer'
): Promise<void> {
  const subject = role === 'lawyer'
    ? 'Welcome to LawHub — Your advocate profile is pending verification'
    : 'Welcome to LawHub — Post your first brief';
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`;
  if (devConsoleFallback(subject, to, `Login: ${loginUrl}`)) return;
  await send({ from: FROM, to, subject, react: WelcomeEmail({ name, role, loginUrl }) });
}

export async function sendNewProposalEmail(
  to: string,
  clientName: string,
  lawyerName: string,
  briefTitle: string,
  proposedFee: number,
  briefId: string
): Promise<void> {
  const subject = `New proposal for "${briefTitle}" from Adv. ${lawyerName}`;
  const briefUrl = `${process.env.NEXT_PUBLIC_APP_URL}/client/briefs/${briefId}`;
  if (devConsoleFallback(subject, to, `Brief: ${briefUrl}`)) return;
  await send({ from: FROM, to, subject, react: NewProposalEmail({ clientName, lawyerName, briefTitle, proposedFee, briefUrl }) });
}

export async function sendPaymentReceiptEmail(
  to: string,
  params: {
    recipientName: string;
    amount: number;
    platformFee: number;
    netAmount: number;
    caseTitle: string;
    milestoneName: string;
    paymentId: string;
    date: string;
    isLawyer?: boolean;
  }
): Promise<void> {
  const subject = `Payment ${params.isLawyer ? 'received' : 'confirmed'} — Rs.${(params.amount / 100).toLocaleString('en-IN')} for ${params.caseTitle}`;
  if (devConsoleFallback(subject, to, `Case: ${params.caseTitle}`)) return;
  await send({ from: FROM, to, subject, react: PaymentReceiptEmail(params) });
}

export async function sendVerificationEmail(
  to: string,
  recipientName: string,
  verificationUrl: string
): Promise<void> {
  const subject = 'Verify your LawHub email address';
  if (devConsoleFallback(subject, to, `Verification link: ${verificationUrl}`)) return;
  await send({
    from: FROM,
    to,
    subject,
    react: VerificationEmail({ recipientName, verificationUrl, expiryHours: 24 }),
  });
}

export async function sendCaseUpdateEmail(
  to: string,
  params: {
    recipientName: string;
    subject: string;
    body: string;
    ctaUrl?: string;
    ctaLabel?: string;
  }
): Promise<void> {
  if (devConsoleFallback(params.subject, to, params.body)) return;
  await send({ from: FROM, to, subject: params.subject, react: CaseUpdateEmail(params) });
}
