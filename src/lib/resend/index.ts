import { Resend } from 'resend';
import { WelcomeEmail } from './emails/WelcomeEmail';
import { NewProposalEmail } from './emails/NewProposalEmail';
import { PaymentReceiptEmail } from './emails/PaymentReceiptEmail';
import { CaseUpdateEmail } from './emails/CaseUpdateEmail';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'LawHub <noreply@lawhub.in>';

export async function sendWelcomeEmail(
  to: string,
  name: string,
  role: 'client' | 'lawyer'
): Promise<void> {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`;
  await resend.emails.send({
    from: FROM,
    to,
    subject:
      role === 'lawyer'
        ? 'Welcome to LawHub — Your advocate profile is pending verification'
        : 'Welcome to LawHub — Post your first brief',
    react: WelcomeEmail({ name, role, loginUrl }),
  });
}

export async function sendNewProposalEmail(
  to: string,
  clientName: string,
  lawyerName: string,
  briefTitle: string,
  proposedFee: number,
  briefId: string
): Promise<void> {
  const briefUrl = `${process.env.NEXT_PUBLIC_APP_URL}/client/briefs/${briefId}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `New proposal for "${briefTitle}" from Adv. ${lawyerName}`,
    react: NewProposalEmail({ clientName, lawyerName, briefTitle, proposedFee, briefUrl }),
  });
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
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Payment ${params.isLawyer ? 'received' : 'confirmed'} — ₹${(params.amount / 100).toLocaleString('en-IN')} for ${params.caseTitle}`,
    react: PaymentReceiptEmail(params),
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
  await resend.emails.send({
    from: FROM,
    to,
    subject: params.subject,
    react: CaseUpdateEmail(params),
  });
}
