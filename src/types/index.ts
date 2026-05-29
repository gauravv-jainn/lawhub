// ─── Core domain types ─────────────────────────────────────────────────────────
// Keep in sync with prisma/schema.prisma

export type UserRole        = 'client' | 'lawyer' | 'enterprise' | 'ngo' | 'admin';
export type LawyerType      = 'junior_advocate' | 'senior_advocate' | 'associate';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type BriefStatus     = 'open' | 'closed' | 'awarded' | 'expired';
export type BriefUrgency    = 'standard' | 'urgent' | 'emergency';
export type ProposalStatus  = 'pending' | 'accepted' | 'rejected' | 'withdrawn';
export type FeeStructure    = 'flat' | 'milestone' | 'retainer' | 'hourly';
export type CaseStatus      = 'active' | 'completion_requested' | 'completed' | 'disputed' | 'cancelled';
export type MilestoneStatus = 'active' | 'submitted' | 'approved' | 'disputed' | 'paid' | 'cancelled';
export type PaymentStatus   = 'pending' | 'held' | 'released' | 'refunded';
export type DisputeStatus   = 'open' | 'under_review' | 'resolved_client' | 'resolved_lawyer' | 'settled';

// ─── User / Profile ────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface LawyerProfile {
  id: string;
  bci_number: string;
  bar_council: string;
  primary_court: string;
  experience_years: number;
  practice_areas: string[];
  bio: string | null;
  fee_min: number | null;
  fee_max: number | null;
  linkedin_url: string | null;
  verification_status: VerificationStatus;
  rejection_reason: string | null;
  verified_at: string | null;
  bci_doc_url: string | null;
  aadhaar_doc_url: string | null;
  degree_doc_url: string | null;
  total_cases: number;
  total_earned: number;
  avg_rating: number;
  review_count: number;
}

// ─── Brief ─────────────────────────────────────────────────────────────────────

export interface Brief {
  id: string;
  client_id: string;
  title: string;
  description: string;
  structured_summary: string | null;
  category: string;
  court: string;
  city: string;
  state: string;
  budget_min: number;
  budget_max: number;
  urgency: BriefUrgency;
  status: BriefStatus;
  pro_bono: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface BriefDocument {
  id: string;
  brief_id: string;
  uploader_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_at: string;
}

// ─── Proposal (DB table: bids) ─────────────────────────────────────────────────

export interface Proposal {
  id: string;
  brief_id: string;
  lawyer_id: string;
  proposed_fee: number;
  fee_structure: FeeStructure;
  milestone_count: number;
  strategy_text: string;
  cover_letter: string;
  cover_note: string | null;
  relevant_experience: string | null;
  availability: string | null;
  estimated_timeline: string | null;
  status: ProposalStatus;
  created_at: string;
}

// ─── Case ──────────────────────────────────────────────────────────────────────

export interface Case {
  id: string;
  brief_id: string;
  client_id: string;
  lawyer_id: string;
  title: string;
  status: CaseStatus;
  total_fee: number;
  fee_structure: FeeStructure;
  next_hearing_date: string | null;
  completion_requested_at: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
}

// ─── Milestone ─────────────────────────────────────────────────────────────────

export interface Milestone {
  id: string;
  case_id: string;
  number: number;
  title: string;
  description: string | null;
  deliverables: string | null;
  amount: number;
  due_date: string | null;
  status: MilestoneStatus;
  submitted_at: string | null;
  approved_at: string | null;
}

export interface MilestoneAttachment {
  id: string;
  milestone_id: string;
  name: string;
  url: string;
  uploaded_by: string;
  created_at: string;
}

// ─── Dispute ───────────────────────────────────────────────────────────────────

export interface Dispute {
  id: string;
  case_id: string;
  raised_by_id: string;
  reason: string;
  description: string | null;
  status: DisputeStatus;
  resolution: string | null;
  admin_id: string | null;
  created_at: string;
  resolved_at: string | null;
}

// ─── Payment ───────────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  case_id: string;
  client_id: string;
  lawyer_id: string;
  milestone_id: string | null;
  milestone_number: number | null;
  amount: number;
  platform_fee: number;
  net_amount: number;
  tds_applicable: boolean;
  tds_amount: number;
  lawyer_final_amount: number;
  status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  paid_at: string | null;
  created_at: string;
}

// ─── Case Event ────────────────────────────────────────────────────────────────

export interface CaseEvent {
  id: string;
  case_id: string;
  actor_id: string;
  event_type: string;
  title: string;
  description: string | null;
  created_at: string;
}

// ─── Message ───────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  case_id: string;
  sender_id: string;
  content: string;
  file_url: string | null;
  file_name: string | null;
  read_at: string | null;
  created_at: string;
}

// ─── Review ────────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  case_id: string;
  client_id: string;
  lawyer_id: string;
  rating: number;
  review: string;
  lawyer_reply: string | null;
  created_at: string;
}

// ─── Notification ──────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  email_sent: boolean;
  created_at: string;
}

// ─── Reference data (constants) ────────────────────────────────────────────────

export const PRACTICE_AREAS = [
  'Property', 'Commercial', 'Family', 'Consumer', 'Criminal',
  'Constitutional', 'Revenue', 'Arbitration', 'Labour', 'Other',
] as const;
export type PracticeArea = typeof PRACTICE_AREAS[number];

export const LEGAL_CATEGORIES = [
  'Property Dispute', 'Commercial/Business', 'Family & Matrimonial',
  'Consumer Protection', 'Criminal Defence', 'Constitutional Matters',
  'Revenue & Tax', 'Arbitration & Mediation', 'Labour & Employment', 'Other',
] as const;

export const COURTS = [
  'Supreme Court of India', 'High Court', 'District Court',
  'Consumer Forum', 'Labour Court', 'Family Court',
  'Revenue Court / Tribunal', 'Arbitration Tribunal', 'Magistrate Court', 'Other',
] as const;

export const STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Other',
] as const;

export const LAWYER_TYPES = [
  { value: 'junior_advocate', label: 'Junior Advocate' },
  { value: 'senior_advocate', label: 'Senior Advocate' },
  { value: 'associate',       label: 'Associate' },
] as const;

export const CAUSE_AREAS = [
  'Women & Child Rights', 'Environmental Law', 'Human Rights',
  'Refugee & Asylum', 'Disability Rights', 'LGBTQ+ Rights',
  'Land Rights', 'Labour Rights', 'Education Access',
  'Criminal Justice Reform', 'Other',
] as const;

export const FIRM_TYPES = [
  { value: 'law_firm',   label: 'Law Firm' },
  { value: 'corporate',  label: 'Corporate Legal Dept.' },
  { value: 'chambers',   label: 'Chambers' },
] as const;

// ─── Organisation profiles ─────────────────────────────────────────────────────

export interface EnterpriseProfile {
  id: string;
  firm_name: string;
  registration_no: string;
  firm_type: string;
  website: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  verification_status: string;
  created_at: string;
}

export interface NGOProfile {
  id: string;
  org_name: string;
  registration_no: string;
  cause_areas: string[];
  city: string | null;
  state: string | null;
  website: string | null;
  description: string | null;
  verification_status: string;
  created_at: string;
}
