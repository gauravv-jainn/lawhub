interface StatusBadgeProps {
  status: string | null | undefined;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  // Brief statuses
  open:       { bg: 'rgba(13,115,119,0.12)', color: 'var(--teal)', label: 'Open' },
  engaged:    { bg: 'rgba(26,107,58,0.12)', color: '#1A6B3A', label: 'Engaged' },
  closed:     { bg: 'rgba(14,12,10,0.08)', color: 'rgba(14,12,10,0.4)', label: 'Closed' },
  moderated:  { bg: 'rgba(192,57,43,0.1)', color: 'var(--rust)', label: 'Removed' },
  // Bid statuses
  pending:    { bg: 'rgba(212,160,23,0.12)', color: '#9a710a', label: 'Pending' },
  accepted:   { bg: 'rgba(26,107,58,0.12)', color: '#1A6B3A', label: 'Accepted' },
  rejected:   { bg: 'rgba(192,57,43,0.1)', color: 'var(--rust)', label: 'Rejected' },
  withdrawn:  { bg: 'rgba(14,12,10,0.08)', color: 'rgba(14,12,10,0.4)', label: 'Withdrawn' },
  // Case statuses
  active:                    { bg: 'rgba(13,115,119,0.12)', color: 'var(--teal)', label: 'Active' },
  completed:                 { bg: 'rgba(26,107,58,0.12)', color: '#1A6B3A', label: 'Completed' },
  disputed:                  { bg: 'rgba(192,57,43,0.1)', color: 'var(--rust)', label: 'Disputed' },
  cancelled:                 { bg: 'rgba(14,12,10,0.08)', color: 'rgba(14,12,10,0.4)', label: 'Cancelled' },
  completion_requested:      { bg: 'rgba(13,115,119,0.08)', color: 'var(--teal)', label: 'Completion Requested' },
  // Milestone-specific statuses
  draft:                     { bg: 'rgba(14,12,10,0.06)', color: 'rgba(14,12,10,0.45)', label: 'Draft' },
  pending_client_approval:   { bg: 'rgba(212,160,23,0.12)', color: '#9a710a', label: 'Awaiting Approval' },
  plan_rejected:             { bg: 'rgba(192,57,43,0.1)', color: 'var(--rust)', label: 'Plan Rejected' },
  submitted:                 { bg: 'rgba(13,115,119,0.1)', color: 'var(--teal)', label: 'Submitted' },
  approved:                  { bg: 'rgba(26,107,58,0.1)', color: '#1A6B3A', label: 'Approved' },
  paid:                      { bg: 'rgba(26,107,58,0.14)', color: '#1A6B3A', label: 'Paid' },
  // Dispute resolution statuses
  under_review:              { bg: 'rgba(212,160,23,0.12)', color: '#9a710a', label: 'Under Review' },
  resolved_client:           { bg: 'rgba(192,57,43,0.1)', color: 'var(--rust)', label: 'Resolved (Client)' },
  resolved_lawyer:           { bg: 'rgba(26,107,58,0.12)', color: '#1A6B3A', label: 'Resolved (Advocate)' },
  partial_refund:            { bg: 'rgba(139,105,20,0.1)', color: '#7a5c10', label: 'Partial Refund' },
  settled:                   { bg: 'rgba(14,12,10,0.08)', color: 'rgba(14,12,10,0.45)', label: 'Settled' },
  // Verification
  verified:   { bg: 'rgba(13,115,119,0.12)', color: 'var(--teal)', label: 'Verified' },
  // Payment
  held:       { bg: 'rgba(212,160,23,0.12)', color: '#9a710a', label: 'In Escrow' },
  released:   { bg: 'rgba(26,107,58,0.12)', color: '#1A6B3A', label: 'Released' },
  refunded:   { bg: 'rgba(192,57,43,0.1)', color: 'var(--rust)', label: 'Refunded' },
  // Urgency
  urgent:     { bg: 'rgba(212,160,23,0.12)', color: '#9a710a', label: 'Urgent' },
  emergency:  { bg: 'rgba(192,57,43,0.1)', color: 'var(--rust)', label: 'Emergency' },
  standard:   { bg: 'rgba(14,12,10,0.06)', color: 'rgba(14,12,10,0.4)', label: 'Standard' },
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  if (!status) return null;
  const cfg = statusConfig[status.toLowerCase()] ?? {
    bg: 'rgba(14,12,10,0.06)',
    color: 'rgba(14,12,10,0.4)',
    label: status,
  };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: cfg.bg,
      color: cfg.color,
      borderRadius: '100px',
      padding: size === 'sm' ? '2px 8px' : '4px 12px',
      fontSize: size === 'sm' ? '11px' : '12px',
      fontWeight: 600,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}
