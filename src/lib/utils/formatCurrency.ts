/**
 * Format amount in paise to Indian Rupee display string
 * Uses Indian number system (lakh/crore)
 */
export function formatCurrency(paise: number, compact = false): string {
  const rupees = paise / 100;

  if (compact) {
    if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(1)}Cr`;
    if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
    if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}K`;
    return `₹${rupees.toLocaleString('en-IN')}`;
  }

  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/** Convert rupees to paise */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Convert paise to rupees */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/** Format a rupee range */
export function formatRange(minPaise: number, maxPaise: number): string {
  return `${formatCurrency(minPaise)} – ${formatCurrency(maxPaise)}`;
}
