/**
 * Razorpay server-side utilities.
 * All direct Razorpay API calls go through this module.
 */
import 'server-only';

const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID ?? '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? '';

function authHeader(): string {
  return 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
}

export interface RazorpayRefundResult {
  id: string;
  amount: number;
  status: string;
}

/**
 * Issue a full or partial refund on a captured Razorpay payment.
 *
 * @param razorpayPaymentId - The Razorpay payment_id (pay_XXXXXXXX)
 * @param amountPaise       - Amount to refund in paise (0 = full refund)
 * @param notes             - Optional notes for the refund
 * @returns Razorpay refund object
 */
export async function issueRazorpayRefund(
  razorpayPaymentId: string,
  amountPaise?: number,
  notes?: Record<string, string>
): Promise<RazorpayRefundResult> {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured. Cannot process refund.');
  }

  const body: Record<string, unknown> = {};
  if (amountPaise && amountPaise > 0) {
    body.amount = amountPaise;
  }
  if (notes) {
    body.notes = notes;
  }

  const res = await fetch(
    `https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`,
    {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  const data = (await res.json()) as RazorpayRefundResult & { error?: { description: string } };

  if (!res.ok) {
    const errMsg = data.error?.description ?? `Razorpay refund failed (HTTP ${res.status})`;
    throw new Error(errMsg);
  }

  return data;
}

/**
 * Create a Razorpay payment order.
 * Returns the Razorpay order object.
 */
export async function createRazorpayOrder(params: {
  amount: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured.');
  }

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount:   params.amount,
      currency: params.currency ?? 'INR',
      receipt:  params.receipt,
      notes:    params.notes ?? {},
    }),
  });

  const data = (await res.json()) as { id?: string; amount?: number; currency?: string; error?: { description: string } };

  if (!data.id) {
    throw new Error(data.error?.description ?? 'Failed to create Razorpay order.');
  }

  return { id: data.id, amount: data.amount!, currency: data.currency! };
}
