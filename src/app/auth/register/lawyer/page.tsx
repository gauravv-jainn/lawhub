'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  lawyerStep1Schema, lawyerStep2Schema, lawyerStep3Schema,
  LawyerStep1Data, LawyerStep2Data, LawyerStep3Data
} from '@/lib/utils/validators';
import { uploadFile } from '@/lib/cloudinary';
import { PRACTICE_AREAS, STATES, COURTS } from '@/types';

const BAR_COUNCILS = [
  'Bar Council of Maharashtra & Goa', 'Bar Council of Delhi', 'Bar Council of Karnataka',
  'Bar Council of Tamil Nadu & Puducherry', 'Bar Council of Uttar Pradesh',
  'Bar Council of Gujarat', 'Bar Council of Rajasthan', 'Bar Council of West Bengal',
  'Bar Council of Telangana', 'Bar Council of Kerala', 'Other',
];

const STEPS = ['Personal Details', 'Professional Info', 'Practice Areas', 'Documents'];

const LAWYER_TYPES = [
  { value: 'junior_advocate', label: 'Junior Advocate' },
  { value: 'senior_advocate', label: 'Senior Advocate' },
  { value: 'associate', label: 'Associate' },
];

export default function LawyerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step1Data, setStep1Data] = useState<LawyerStep1Data | null>(null);
  const [step2Data, setStep2Data] = useState<LawyerStep2Data | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [docFiles, setDocFiles] = useState<{ bci?: File; aadhaar?: File; degree?: File }>({});
  const [lawyerType, setLawyerType] = useState('junior_advocate');
  const [onlyLegalAdvice, setOnlyLegalAdvice] = useState(false);

  const form1 = useForm<LawyerStep1Data>({ resolver: zodResolver(lawyerStep1Schema) });
  const form2 = useForm<LawyerStep2Data>({ resolver: zodResolver(lawyerStep2Schema) });

  const inputClass = `w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all`;
  const inputStyle = (hasError: boolean) => ({
    borderColor: hasError ? 'var(--rust)' : 'rgba(14,12,10,0.15)',
    background: 'var(--cream)',
  });

  const handleStep1 = (data: LawyerStep1Data) => { setStep1Data(data); setStep(2); };
  const handleStep2 = (data: LawyerStep2Data) => { setStep2Data(data); setStep(3); };
  const handleStep3 = () => {
    if (selectedAreas.length === 0) { setError('Select at least one practice area'); return; }
    setError(''); setStep(4);
  };

  const handleFinalSubmit = async () => {
    if (!step1Data || !step2Data) return;
    setLoading(true);
    setError('');

    try {
      // Upload documents to Cloudinary
      let bciUrl = null, aadhaarUrl = null, degreeUrl = null;

      if (docFiles.bci) {
        const { url } = await uploadFile(docFiles.bci, 'lawhub/lawyer-docs');
        bciUrl = url;
      }
      if (docFiles.aadhaar) {
        const { url } = await uploadFile(docFiles.aadhaar, 'lawhub/lawyer-docs');
        aadhaarUrl = url;
      }
      if (docFiles.degree) {
        const { url } = await uploadFile(docFiles.degree, 'lawhub/lawyer-docs');
        degreeUrl = url;
      }

      // Register via API
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lawyer',
          email: step1Data.email,
          password: step1Data.password,
          full_name: step1Data.full_name,
          phone: step1Data.phone,
          bci_number: step2Data.bci_number,
          bar_council: step2Data.bar_council,
          primary_court: step2Data.primary_court,
          experience_years: step2Data.experience_years,
          practice_areas: selectedAreas,
          lawyer_type: lawyerType,
          only_legal_advice: onlyLegalAdvice,
          bci_doc_url: bciUrl,
          aadhaar_doc_url: aadhaarUrl,
          degree_doc_url: degreeUrl,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Registration failed');
        setLoading(false);
        return;
      }

      // Auto sign-in
      await signIn('credentials', {
        email: step1Data.email,
        password: step1Data.password,
        redirect: false,
      });

      router.push('/lawyer/dashboard');
      router.refresh();
    } catch (err) {
      setError('Registration failed. Please try again.');
      setLoading(false);
    }
  };

  const toggleArea = (area: string) => {
    setSelectedAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  return (
    <div className="bg-white rounded-xl border p-8"
      style={{ borderColor: 'rgba(14,12,10,0.1)', boxShadow: '0 1px 3px rgba(14,12,10,0.06)' }}>
      <div className="mb-6">
        <Link href="/auth/register" className="text-xs flex items-center gap-1 mb-4"
          style={{ color: 'rgba(14,12,10,0.4)' }}>
          ← Back
        </Link>
        <h1 className="font-serif text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
          Advocate Registration
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(14,12,10,0.5)' }}>
          Join India&apos;s premier legal marketplace
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-7">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <div key={n} className="flex items-center gap-1">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{
                    background: done ? 'var(--teal)' : active ? 'var(--gold)' : 'rgba(14,12,10,0.08)',
                    color: (done || active) ? 'white' : 'rgba(14,12,10,0.4)',
                  }}>
                  {done ? '✓' : n}
                </div>
                <span className="text-xs hidden sm:block"
                  style={{ color: active ? 'var(--ink)' : 'rgba(14,12,10,0.4)', fontWeight: active ? 500 : 400 }}>
                  {label}
                </span>
              </div>
              {n < STEPS.length && <div className="h-px w-6 flex-1" style={{ background: 'rgba(14,12,10,0.1)' }} />}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm"
          style={{ background: 'rgba(192,57,43,0.08)', color: 'var(--rust)', border: '1px solid rgba(192,57,43,0.2)' }}>
          {error}
        </div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <form onSubmit={form1.handleSubmit(handleStep1)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Full Name</label>
            <input {...form1.register('full_name')} placeholder="Adv. Priya Sharma" className={inputClass} style={inputStyle(!!form1.formState.errors.full_name)} />
            {form1.formState.errors.full_name && <p className="text-xs mt-1" style={{ color: 'var(--rust)' }}>{form1.formState.errors.full_name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Email</label>
            <input {...form1.register('email')} type="email" placeholder="advocate@example.com" className={inputClass} style={inputStyle(!!form1.formState.errors.email)} />
            {form1.formState.errors.email && <p className="text-xs mt-1" style={{ color: 'var(--rust)' }}>{form1.formState.errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Mobile</label>
            <div className="flex gap-2">
              <span className="px-3 py-2.5 rounded-lg border text-sm flex items-center" style={{ borderColor: 'rgba(14,12,10,0.15)', background: 'var(--parchment-2)', color: 'rgba(14,12,10,0.5)' }}>+91</span>
              <input {...form1.register('phone')} type="tel" placeholder="9876543210" className={`flex-1 ${inputClass}`} style={inputStyle(!!form1.formState.errors.phone)} />
            </div>
            {form1.formState.errors.phone && <p className="text-xs mt-1" style={{ color: 'var(--rust)' }}>{form1.formState.errors.phone.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Password</label>
            <input {...form1.register('password')} type="password" placeholder="Min. 8 characters" className={inputClass} style={inputStyle(!!form1.formState.errors.password)} />
            {form1.formState.errors.password && <p className="text-xs mt-1" style={{ color: 'var(--rust)' }}>{form1.formState.errors.password.message}</p>}
          </div>
          <button type="submit" className="w-full py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--gold)' }}>Continue →</button>
        </form>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <form onSubmit={form2.handleSubmit(handleStep2)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>BCI Enrolment Number</label>
            <input {...form2.register('bci_number')} placeholder="MH/1234/2010" className={inputClass} style={inputStyle(!!form2.formState.errors.bci_number)} />
            {form2.formState.errors.bci_number && <p className="text-xs mt-1" style={{ color: 'var(--rust)' }}>{form2.formState.errors.bci_number.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>State Bar Council</label>
            <select {...form2.register('bar_council')} className={inputClass} style={inputStyle(!!form2.formState.errors.bar_council)}>
              <option value="">Select Bar Council</option>
              {BAR_COUNCILS.map(bc => <option key={bc} value={bc}>{bc}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Primary Court</label>
            <select {...form2.register('primary_court')} className={inputClass} style={inputStyle(!!form2.formState.errors.primary_court)}>
              <option value="">Select primary court</option>
              {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Years of Experience</label>
            <input {...form2.register('experience_years')} type="number" min="0" max="60" placeholder="5" className={inputClass} style={inputStyle(!!form2.formState.errors.experience_years)} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border" style={{ borderColor: 'rgba(14,12,10,0.15)', color: 'var(--ink)' }}>← Back</button>
            <button type="submit" className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--gold)' }}>Continue →</button>
          </div>
        </form>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-5">
          {/* Lawyer type */}
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>Your Role</p>
            <div className="flex gap-2">
              {LAWYER_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setLawyerType(t.value)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium border transition-all"
                  style={{
                    background: lawyerType === t.value ? 'var(--teal)' : 'transparent',
                    color: lawyerType === t.value ? 'white' : 'var(--ink)',
                    borderColor: lawyerType === t.value ? 'var(--teal)' : 'rgba(14,12,10,0.15)',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Only legal advice toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg"
            style={{ background: 'rgba(184,134,11,0.05)', border: '1px solid rgba(184,134,11,0.15)' }}>
            <input type="checkbox" id="onlyAdvice" checked={onlyLegalAdvice}
              onChange={e => setOnlyLegalAdvice(e.target.checked)} className="w-4 h-4" />
            <label htmlFor="onlyAdvice" className="cursor-pointer">
              <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Only Legal Advice</div>
              <div className="text-xs" style={{ color: 'rgba(14,12,10,0.5)' }}>
                I offer consultations / advice only, not full case representation
              </div>
            </label>
          </div>

          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>Practice Areas</p>
            <p className="text-xs mb-3" style={{ color: 'rgba(14,12,10,0.5)' }}>Select all that apply to your work</p>
            <div className="flex flex-wrap gap-2">
              {PRACTICE_AREAS.map(area => (
                <button key={area} type="button" onClick={() => toggleArea(area)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                  style={{
                    background: selectedAreas.includes(area) ? 'var(--gold)' : 'transparent',
                    color: selectedAreas.includes(area) ? 'white' : 'var(--ink)',
                    borderColor: selectedAreas.includes(area) ? 'var(--gold)' : 'rgba(14,12,10,0.15)',
                  }}>
                  {area}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border" style={{ borderColor: 'rgba(14,12,10,0.15)', color: 'var(--ink)' }}>← Back</button>
            <button type="button" onClick={handleStep3} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--gold)' }}>Continue →</button>
          </div>
        </div>
      )}

      {/* Step 4 */}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'rgba(14,12,10,0.6)' }}>Upload verification documents. Your profile will be reviewed within 24 hours.</p>
          {[
            { key: 'bci' as const, label: 'BCI Certificate', required: true },
            { key: 'aadhaar' as const, label: 'Aadhaar Card (Front)', required: true },
            { key: 'degree' as const, label: 'Law Degree Certificate', required: false },
          ].map(({ key, label, required }) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
                {label} {required && <span style={{ color: 'var(--rust)' }}>*</span>}
              </label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center transition-all"
                style={{ borderColor: docFiles[key] ? 'var(--teal)' : 'rgba(14,12,10,0.15)' }}>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" id={`file-${key}`} className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setDocFiles(prev => ({ ...prev, [key]: file }));
                  }} />
                <label htmlFor={`file-${key}`} className="cursor-pointer">
                  {docFiles[key] ? (
                    <p className="text-sm font-medium" style={{ color: 'var(--teal)' }}>✓ {docFiles[key]!.name}</p>
                  ) : (
                    <p className="text-sm" style={{ color: 'rgba(14,12,10,0.4)' }}>Click to upload (PDF, JPG, PNG — max 10MB)</p>
                  )}
                </label>
              </div>
            </div>
          ))}
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border" style={{ borderColor: 'rgba(14,12,10,0.15)', color: 'var(--ink)' }}>← Back</button>
            <button type="button" onClick={handleFinalSubmit} disabled={loading}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: 'var(--gold)' }}>
              {loading ? 'Creating account…' : 'Submit for Verification'}
            </button>
          </div>
          <p className="text-xs text-center" style={{ color: 'rgba(14,12,10,0.4)' }}>Your account will be under review. You can start browsing briefs once verified.</p>
        </div>
      )}
    </div>
  );
}
