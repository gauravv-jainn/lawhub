/**
 * Centralized notification helper.
 * Every notification that should also trigger an email goes through here.
 * Keeps in-app + email in sync — they cannot drift apart.
 */

import prisma from '@/lib/prisma';
import {
  sendNewProposalEmail,
  sendPaymentReceiptEmail,
  sendCaseUpdateEmail,
} from '@/lib/resend';

interface NotifyParams {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  /** If true, also send an email for this notification */
  sendEmail?: boolean;
  /** Extra data passed to the email template */
  emailData?: Record<string, unknown>;
}

/**
 * Create a notification record and optionally fire an email.
 * Email failures are swallowed (logged only) — they must never break the main flow.
 */
export async function notify({
  userId,
  type,
  title,
  body,
  link,
  sendEmail = false,
  emailData = {},
}: NotifyParams): Promise<void> {
  // 1. Always create in-app notification
  await prisma.notification.create({
    data: {
      user_id: userId,
      type,
      title,
      body,
      link,
      email_sent: false,
    },
  });

  // 2. Optionally fire email
  if (!sendEmail) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, full_name: true },
  });
  if (!user) return;

  try {
    switch (type) {
      case 'new_proposal':
        await sendNewProposalEmail(
          user.email,
          user.full_name,
          (emailData.lawyerName as string) ?? 'An advocate',
          (emailData.briefTitle as string) ?? '',
          (emailData.proposedFee as number) ?? 0,
          (emailData.briefId as string) ?? ''
        );
        break;

      case 'payment_released':
      case 'payment_held':
        await sendPaymentReceiptEmail(user.email, {
          recipientName: user.full_name,
          amount: (emailData.amount as number) ?? 0,
          platformFee: (emailData.platformFee as number) ?? 0,
          netAmount: (emailData.netAmount as number) ?? 0,
          caseTitle: (emailData.caseTitle as string) ?? '',
          milestoneName: (emailData.milestoneName as string) ?? '',
          paymentId: (emailData.paymentId as string) ?? '',
          date: new Date().toLocaleDateString('en-IN'),
          isLawyer: type === 'payment_released',
        });
        break;

      default:
        // Generic case update email for high-priority events
        if (
          [
            // Case lifecycle
            'case_completed',
            'case_cancelled',
            'completion_requested',
            // Milestone lifecycle
            'milestone_approved',
            'milestone_submitted',
            'milestone_plan_submitted',
            'milestone_plan_approved',
            'milestone_plan_rejected',
            // Disputes
            'dispute_raised',
            'dispute_resolved',
            // Payments
            'refund_required',
            // Verification
            'verification_approved',
            'verification_rejected',
            // Account actions
            'account_suspended',
            'account_reinstated',
          ].includes(type)
        ) {
          await sendCaseUpdateEmail(user.email, {
            recipientName: user.full_name,
            subject: title,
            body,
            ctaUrl: link ? `${process.env.NEXT_PUBLIC_APP_URL}${link}` : undefined,
            ctaLabel: 'View Update',
          });
        }
    }

    // Mark email as sent
    await prisma.notification.updateMany({
      where: {
        user_id: userId,
        type,
        email_sent: false,
        // Only mark the latest one
        created_at: { gte: new Date(Date.now() - 5000) },
      },
      data: { email_sent: true },
    });
  } catch (err) {
    // Email failure must never break the calling flow
    console.error(`[notify] Email send failed for type=${type} userId=${userId}:`, err);
  }
}

/** Helper: notify multiple users at once */
export async function notifyMany(params: NotifyParams[]): Promise<void> {
  await Promise.all(params.map(notify));
}
