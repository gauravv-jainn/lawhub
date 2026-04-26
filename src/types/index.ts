export type UserRole = 'client' | 'lawyer' | 'enterprise' | 'ngo' | 'student' | 'admin';
export type LawyerType = 'junior_advocate' | 'senior_advocate' | 'associate';
export type ConnectionStatus = 'pending' | 'accepted' | 'rejected';
export type InternshipApplicationStatus = 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'accepted';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type BriefStatus = 'open' | 'closed' | 'awarded';
export type BriefUrgency = 'standard' | 'urgent' | 'emergency';
export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';
export type FeeStructure = 'flat' | 'milestone' | 'retainer' | 'hourly';
export type CaseStatus = 'active' | 'completed' | 'disputed' | 'cancelled';
export type PaymentStatus = 'pending' | 'held' | 'released' | 'refunded';

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
  wins: number;
  total_earned: number;
  avg_rating: number;
  review_count: number;
}

export interface LawyerWithProfile extends Profile {
  lawyer_profiles: LawyerProfile;
}

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
  bid_count: number;
  closes_at: string;
  engaged_lawyer_id: string | null;
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

export interface Bid {
  id: string;
  brief_id: string;
  lawyer_id: string;
  proposed_fee: number;
  fee_structure: FeeStructure;
  milestone_count: number;
  strategy_text: string;
  cover_letter: string;
  relevant_experience: string | null;
  availability: string;
  estimated_timeline: string;
  status: BidStatus;
  created_at: string;
}

export interface BidWithLawyer extends Bid {
  profiles: Profile;
  lawyer_profiles: LawyerProfile;
}

export interface Case {
  id: string;
  brief_id: string;
  client_id: string;
  lawyer_id: string;
  bid_id: string;
  title: string;
  status: CaseStatus;
  total_fee: number;
  fee_structure: FeeStructure;
  milestone_count: number;
  current_milestone: number;
  next_hearing_date: string | null;
  next_hearing_court: string | null;
  outcome: string | null;
  created_at: string;
  closed_at: string | null;
}

export interface Payment {
  id: string;
  case_id: string;
  client_id: string;
  lawyer_id: string;
  milestone_number: number;
  amount: number;
  platform_fee: number;
  net_amount: number;
  status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_payout_id: string | null;
  paid_at: string | null;
  released_at: string | null;
  created_at: string;
}

export interface CaseEvent {
  id: string;
  case_id: string;
  actor_id: string;
  event_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Message {
  id: string;
  case_id: string;
  sender_id: string;
  sender_role: 'client' | 'lawyer';
  content: string;
  file_url: string | null;
  read_at: string | null;
  created_at: string;
}

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

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export const PRACTICE_AREAS = [
  'Property',
  'Commercial',
  'Family',
  'Consumer',
  'Criminal',
  'Constitutional',
  'Revenue',
  'Arbitration',
  'Labour',
  'Other',
] as const;

export type PracticeArea = typeof PRACTICE_AREAS[number];

export const LEGAL_CATEGORIES = [
  'Property Dispute',
  'Commercial/Business',
  'Family & Matrimonial',
  'Consumer Protection',
  'Criminal Defence',
  'Constitutional Matters',
  'Revenue & Tax',
  'Arbitration & Mediation',
  'Labour & Employment',
  'Other',
] as const;

export const COURTS = [
  'Supreme Court of India',
  'High Court',
  'District Court',
  'Consumer Forum',
  'Labour Court',
  'Family Court',
  'Revenue Court / Tribunal',
  'Arbitration Tribunal',
  'Magistrate Court',
  'Other',
] as const;

export const STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Other'
] as const;

export const LAWYER_TYPES = [
  { value: 'junior_advocate', label: 'Junior Advocate' },
  { value: 'senior_advocate', label: 'Senior Advocate' },
  { value: 'associate', label: 'Associate' },
] as const;

export const CAUSE_AREAS = [
  'Women & Child Rights',
  'Environmental Law',
  'Human Rights',
  'Refugee & Asylum',
  'Disability Rights',
  'LGBTQ+ Rights',
  'Land Rights',
  'Labour Rights',
  'Education Access',
  'Criminal Justice Reform',
  'Other',
] as const;

export const FIRM_TYPES = [
  { value: 'law_firm', label: 'Law Firm' },
  { value: 'corporate', label: 'Corporate Legal Dept.' },
  { value: 'chambers', label: 'Chambers' },
] as const;

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

export interface InternshipPosting {
  id: string;
  enterprise_id: string;
  title: string;
  description: string;
  duration: string;
  stipend: string | null;
  skills: string[];
  location: string | null;
  remote: boolean;
  openings: number;
  closes_at: string | null;
  status: string;
  created_at: string;
  enterprise?: EnterpriseProfile;
  _count?: { applications: number };
}

export interface InternshipApplication {
  id: string;
  posting_id: string;
  applicant_id: string;
  cover_letter: string;
  resume_url: string | null;
  status: InternshipApplicationStatus;
  created_at: string;
  posting?: InternshipPosting;
}

export interface Connection {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: ConnectionStatus;
  created_at: string;
  requester?: Profile;
  recipient?: Profile;
}

export interface NGOCase {
  id: string;
  ngo_id: string;
  title: string;
  description: string;
  category: string;
  location: string | null;
  status: string;
  lawyer_id: string | null;
  created_at: string;
  lawyer?: Profile | null;
}

export interface EnterpriseAssociate {
  id: string;
  enterprise_id: string;
  lawyer_id: string;
  role: string;
  joined_at: string;
  lawyer?: Profile & { lawyer_profile?: LawyerProfile };
}
