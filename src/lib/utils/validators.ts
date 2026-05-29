import { z } from 'zod';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const clientRegisterSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  state: z.string().min(1, 'Please select a state'),
  city: z.string().min(2, 'Enter your city'),
});

export const lawyerStep1Schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const lawyerStep2Schema = z.object({
  bci_number: z.string().min(4, 'Enter your BCI enrolment number'),
  primary_court: z.string().min(1, 'Select your primary court'),
  bar_council: z.string().min(1, 'Select your State Bar Council'),
  experience_years: z.coerce.number().min(0).max(60),
});

export const lawyerStep3Schema = z.object({
  practice_areas: z.array(z.string()).min(1, 'Select at least one practice area'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Brief ────────────────────────────────────────────────────────────────────

export const briefStep1Schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  category: z.string().min(1, 'Select a legal category'),
  court: z.string().min(1, 'Select a court/forum'),
  state: z.string().min(1, 'Select a state'),
  city: z.string().min(2, 'Enter your city'),
  urgency: z.enum(['standard', 'urgent', 'emergency']),
});

export const briefStep2Schema = z.object({
  description: z.string().min(50, 'Please describe your issue in at least 50 characters'),
  budget_min: z.coerce.number().min(500_000, 'Minimum budget is ₹5,000'),
  budget_max: z.coerce.number().min(500_000, 'Maximum budget must be at least ₹5,000'),
  pro_bono: z.boolean().optional().default(false),
});

export const briefEditSchema = z.object({
  title: z.string().min(5).optional(),
  description: z.string().min(50).optional(),
  budget_min: z.coerce.number().min(500_000).optional(),
  budget_max: z.coerce.number().min(500_000).optional(),
  urgency: z.enum(['standard', 'urgent', 'emergency']).optional(),
  extends_days: z.coerce.number().min(1).max(90).optional(), // extend expiry
});

// ─── Proposals (formerly Bids) ────────────────────────────────────────────────

export const proposalSubmitSchema = z.object({
  brief_id: z.string().min(1, 'brief_id is required'),
  proposed_fee: z.coerce.number().min(1_000, 'Minimum fee is ₹1,000'),
  fee_structure: z.enum(['flat', 'milestone', 'retainer', 'hourly']),
  milestone_count: z.coerce.number().min(1).max(10).default(1),
  strategy_text: z.string().min(100, 'Strategy must be at least 100 characters'),
  cover_letter: z.string().min(50, 'Cover letter must be at least 50 characters'),
  relevant_experience: z.string().optional(),
  availability: z.string().min(1, 'Select availability'),
  estimated_timeline: z.string().min(1, 'Provide an estimated timeline'),
});

// ─── Milestones ───────────────────────────────────────────────────────────────

export const milestoneUpdateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').optional(),
  description: z.string().optional(),
  deliverables: z.string().min(10, 'Describe the deliverables clearly').optional(),
  due_date: z.string().datetime({ offset: true }).optional().nullable(),
});

// ─── Disputes ─────────────────────────────────────────────────────────────────

export const disputeCreateSchema = z.object({
  case_id: z.string().min(1),
  reason: z.enum([
    'work_not_delivered',
    'poor_quality',
    'payment_withheld',
    'lawyer_unresponsive',
    'client_unresponsive',
    'scope_disagreement',
    'other',
  ]),
  description: z.string().min(50, 'Please describe the issue in at least 50 characters'),
  milestone_id: z.string().optional(),
});

export const disputeResolveSchema = z.object({
  dispute_id:       z.string().min(1),
  resolution:       z.enum(['resolved_client', 'resolved_lawyer', 'partial_refund', 'settled']),
  resolution_note:  z.string().min(10, 'Provide a resolution note'),
  refund_percentage: z.number().min(0).max(100).optional(), // for partial_refund
});

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  review: z.string().min(20, 'Review must be at least 20 characters'),
});

// ─── Cancellation ─────────────────────────────────────────────────────────────

export const cancellationSchema = z.object({
  reason: z.string().min(20, 'Please provide a reason (at least 20 characters)'),
});

// ─── Admin ────────────────────────────────────────────────────────────────────

export const verifyLawyerSchema = z.object({
  lawyerId: z.string().min(1),
  action: z.enum(['approve', 'reject', 'reset_to_pending']),
  reason: z.string().optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClientRegisterData    = z.infer<typeof clientRegisterSchema>;
export type LawyerStep1Data       = z.infer<typeof lawyerStep1Schema>;
export type LawyerStep2Data       = z.infer<typeof lawyerStep2Schema>;
export type LawyerStep3Data       = z.infer<typeof lawyerStep3Schema>;
export type BriefStep1Data        = z.infer<typeof briefStep1Schema>;
export type BriefStep2Data        = z.infer<typeof briefStep2Schema>;
export type BriefEditData         = z.infer<typeof briefEditSchema>;
export type ProposalSubmitData    = z.infer<typeof proposalSubmitSchema>;
export type MilestoneUpdateData   = z.infer<typeof milestoneUpdateSchema>;
export type DisputeCreateData     = z.infer<typeof disputeCreateSchema>;
export type DisputeResolveData    = z.infer<typeof disputeResolveSchema>;
export type ReviewData            = z.infer<typeof reviewSchema>;
export type CancellationData      = z.infer<typeof cancellationSchema>;
export type LoginData             = z.infer<typeof loginSchema>;
