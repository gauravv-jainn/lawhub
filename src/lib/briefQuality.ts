/**
 * Brief Quality System
 *
 * Category-specific quality prompts and missing-information warnings.
 * Used both client-side (as hints during brief creation) and server-side
 * (to flag incomplete briefs in admin/lawyer views).
 */

// ─── Category-specific required fields / prompts ──────────────────────────────

export interface CategoryPrompt {
  category:        string;
  requiredDetails: string[];   // prompts shown as "We recommend including:"
  warningChecks:   Array<{
    id:      string;
    label:   string;
    test:    (description: string) => boolean; // returns true if MISSING
  }>;
}

export const CATEGORY_PROMPTS: CategoryPrompt[] = [
  {
    category: 'Criminal',
    requiredDetails: [
      'FIR number and police station name',
      'Sections charged under IPC / CrPC',
      'Date and location of alleged incident',
      'Whether bail has been applied/granted',
      'Whether any arrests have been made',
    ],
    warningChecks: [
      { id: 'fir',     label: 'Include FIR number or case number',   test: (d) => !/(fir|f\.i\.r|case no|case number)/i.test(d) },
      { id: 'section', label: 'Mention the sections charged',        test: (d) => !/(section|ipc|bns|crpc)/i.test(d) },
      { id: 'bail',    label: 'Mention bail status',                 test: (d) => !/bail/i.test(d) },
    ],
  },
  {
    category: 'Property',
    requiredDetails: [
      'Property address and area (sq. ft./acres)',
      'Type of property (residential, commercial, agricultural)',
      'Current ownership/title documentation status',
      'Nature of dispute (possession, partition, title, encroachment)',
      'Whether any court orders exist',
    ],
    warningChecks: [
      { id: 'address',   label: 'Include the property address',          test: (d) => d.length < 150 },
      { id: 'type',      label: 'Specify property type',                 test: (d) => !/(residential|commercial|agricultural|plot|flat|house|shop)/i.test(d) },
      { id: 'dispute',   label: 'Describe the nature of the dispute',    test: (d) => !/(possession|partition|title|ownership|encroachment|boundary)/i.test(d) },
    ],
  },
  {
    category: 'Family',
    requiredDetails: [
      'Nature of the matter (divorce, custody, maintenance, adoption)',
      'Duration of marriage and date of separation (if applicable)',
      'Number and ages of children (if custody is involved)',
      'Whether any prior court proceedings have taken place',
      'State/jurisdiction where marriage was solemnised',
    ],
    warningChecks: [
      { id: 'nature',   label: 'Specify the nature of the matter',      test: (d) => !/(divorce|custody|maintenance|adoption|alimony|separation|matrimon)/i.test(d) },
      { id: 'children', label: 'Mention children/dependents if relevant', test: (d) => d.length < 120 },
    ],
  },
  {
    category: 'Corporate',
    requiredDetails: [
      'Company name and CIN (if incorporated)',
      'Nature of the matter (contract, employment, IP, compliance, M&A)',
      'Jurisdiction and applicable law',
      'Whether any notice or demand letter has been sent/received',
      'Urgency — any upcoming deadlines or statutory filings',
    ],
    warningChecks: [
      { id: 'company',  label: 'Include company name or registration', test: (d) => !/(private limited|pvt ltd|llp|opc|inc\.|limited|company|cin)/i.test(d) },
      { id: 'nature',   label: 'Describe the legal matter clearly',   test: (d) => d.length < 120 },
    ],
  },
  {
    category: 'Consumer',
    requiredDetails: [
      'Product/service involved and the company name',
      'Date of purchase and amount paid',
      'Nature of deficiency (defective product, service failure, overcharging)',
      'Steps already taken (complaints filed, emails sent)',
      'Relief sought (refund, replacement, compensation)',
    ],
    warningChecks: [
      { id: 'company',  label: 'Name the company/seller involved',   test: (d) => d.length < 100 },
      { id: 'amount',   label: 'Mention the amount or product cost', test: (d) => !/(₹|rs\.|rupee|amount|paid|price|cost)/i.test(d) },
    ],
  },
  {
    category: 'Labour',
    requiredDetails: [
      'Nature of dispute (termination, unpaid wages, harassment, POSH)',
      'Employer company name and location',
      'Employment duration and designation',
      'Whether a legal notice has been sent',
      'Amount of unpaid dues (if applicable)',
    ],
    warningChecks: [
      { id: 'employer',  label: 'Name the employer/company',         test: (d) => d.length < 100 },
      { id: 'nature',    label: 'Describe the nature of the dispute', test: (d) => !/(termination|fired|resign|salary|wages|harassment|posh|unpaid)/i.test(d) },
    ],
  },
  {
    category: 'Intellectual Property',
    requiredDetails: [
      'Type of IP (trademark, copyright, patent, trade secret)',
      'Registration number (if registered)',
      'Nature of the infringement or matter',
      'Whether a cease-and-desist notice has been sent',
      'Jurisdiction/courts where action is to be filed',
    ],
    warningChecks: [
      { id: 'type',      label: 'Specify the type of IP',               test: (d) => !/(trademark|copyright|patent|trade secret|design|ip)/i.test(d) },
      { id: 'regn',      label: 'Include registration number if available', test: (d) => !/(regist|number|no\.|application)/i.test(d) },
    ],
  },
  {
    category: 'Taxation',
    requiredDetails: [
      'Type of tax (Income Tax, GST, Customs, Property Tax)',
      'Assessment year and PAN/GSTIN',
      'Nature of the dispute (demand notice, assessment order, penalty)',
      'Amount involved',
      'Stage of proceedings (notice, appeal, tribunal)',
    ],
    warningChecks: [
      { id: 'taxtype',  label: 'Specify the type of tax',              test: (d) => !/(income tax|gst|customs|property tax|sales tax|tds)/i.test(d) },
      { id: 'amount',   label: 'Mention the amount in dispute',        test: (d) => !/(₹|rs\.|rupee|amount|crore|lakh)/i.test(d) },
    ],
  },
];

// Default prompts for categories not specifically configured
const DEFAULT_PROMPTS: CategoryPrompt = {
  category: 'General',
  requiredDetails: [
    'Background and timeline of the matter',
    'Parties involved (names and roles)',
    'Relevant documents you have (agreements, notices, court orders)',
    'What outcome you are seeking',
    'Any upcoming deadlines',
  ],
  warningChecks: [
    { id: 'length',   label: 'Provide at least 100 words of context', test: (d) => d.split(/\s+/).length < 100 },
  ],
};

export function getCategoryPrompts(category: string): CategoryPrompt {
  return CATEGORY_PROMPTS.find((c) => c.category === category) ?? DEFAULT_PROMPTS;
}

// ─── Quality score (0–100) ────────────────────────────────────────────────────

export interface BriefQualityResult {
  score:    number;           // 0–100
  warnings: string[];         // actionable warnings
  tips:     string[];         // category-specific tips
  grade:    'excellent' | 'good' | 'fair' | 'poor';
}

export function scoreBrief(
  description:  string,
  category:     string,
  budgetMin:    number,
  budgetMax:    number,
  hasDocuments: boolean
): BriefQualityResult {
  const prompts = getCategoryPrompts(category);
  const words   = description.trim().split(/\s+/).filter(Boolean).length;

  let score    = 0;
  const warnings: string[] = [];
  const tips   = prompts.requiredDetails;

  // Length score (max 40 pts)
  if (words >= 200) score += 40;
  else if (words >= 100) score += 25;
  else if (words >= 50) score += 10;
  else warnings.push('Your description is very brief. Longer descriptions attract better proposals.');

  // Category-specific warnings (max 30 pts)
  const activeWarnings = prompts.warningChecks.filter((c) => c.test(description));
  const categoryScore  = Math.round((1 - activeWarnings.length / Math.max(prompts.warningChecks.length, 1)) * 30);
  score += categoryScore;
  activeWarnings.forEach((w) => warnings.push(w.label));

  // Budget range check (max 15 pts)
  if (budgetMin > 0 && budgetMax >= budgetMin) {
    score += 15;
  } else {
    warnings.push('Set a realistic budget range to attract qualified advocates.');
  }

  // Documents attached (max 15 pts)
  if (hasDocuments) {
    score += 15;
  } else {
    warnings.push('Attaching supporting documents (FIR, agreement, notice) significantly improves response quality.');
  }

  const grade: BriefQualityResult['grade'] =
    score >= 80 ? 'excellent' :
    score >= 60 ? 'good' :
    score >= 40 ? 'fair' : 'poor';

  return { score, warnings, tips, grade };
}
