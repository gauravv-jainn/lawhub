import Link from 'next/link';

const OPTIONS = [
  {
    href: '/auth/register/client',
    icon: '⚖️',
    color: 'rgba(184,134,11,0.1)',
    title: 'I need legal help',
    desc: 'Post your legal matter and receive proposals from verified advocates',
  },
  {
    href: '/auth/register/lawyer',
    icon: '👨‍⚖️',
    color: 'rgba(13,115,119,0.1)',
    title: 'I\'m an Advocate',
    desc: 'Find cases, submit proposals, build your reputation and grow your practice',
  },
  {
    href: '/auth/register/enterprise',
    icon: '🏢',
    color: 'rgba(52,73,94,0.1)',
    title: 'Law Firm / Enterprise',
    desc: 'Manage associates, assign cases, post internships and run your firm on one platform',
  },
  {
    href: '/auth/register/ngo',
    icon: '🤝',
    color: 'rgba(39,174,96,0.1)',
    title: 'NGO / Legal Aid',
    desc: 'Manage pro-bono cases, connect with advocates and coordinate volunteers',
  },
  {
    href: '/auth/register/student',
    icon: '🎓',
    color: 'rgba(155,89,182,0.1)',
    title: 'Law Student',
    desc: 'Browse internship opportunities, build your network and gain practical experience',
  },
];

export default function RegisterPage() {
  return (
    <div className="bg-white rounded-xl border p-8"
      style={{ borderColor: 'rgba(14,12,10,0.1)', boxShadow: '0 1px 3px rgba(14,12,10,0.06)' }}>
      <h1 className="font-serif text-2xl font-semibold mb-1" style={{ color: 'var(--ink)' }}>
        Create your account
      </h1>
      <p className="text-sm mb-6" style={{ color: 'rgba(14,12,10,0.5)' }}>
        Choose how you want to use LawHub
      </p>

      <div className="space-y-3">
        {OPTIONS.map((opt) => (
          <Link key={opt.href} href={opt.href}
            className="block p-4 rounded-xl border transition-all card-hover"
            style={{ borderColor: 'rgba(14,12,10,0.1)', background: 'var(--cream)' }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: opt.color }}>
                {opt.icon}
              </div>
              <div>
                <div className="font-semibold text-sm mb-0.5" style={{ color: 'var(--ink)' }}>
                  {opt.title}
                </div>
                <div className="text-xs" style={{ color: 'rgba(14,12,10,0.5)' }}>
                  {opt.desc}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 text-center text-sm" style={{ color: 'rgba(14,12,10,0.5)' }}>
        Already have an account?{' '}
        <Link href="/auth/login" style={{ color: 'var(--gold)', fontWeight: 500 }}>
          Sign in
        </Link>
      </div>
    </div>
  );
}
