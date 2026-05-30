import Link from 'next/link';

interface Props {
  searchParams: { status?: string; error?: string };
}

export default function VerifyEmailPage({ searchParams }: Props) {
  const { status, error } = searchParams;

  if (status === 'verified') {
    return (
      <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: 'rgba(14,12,10,0.1)' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>✅</div>
        <h1 className="font-serif text-2xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>
          Email Verified
        </h1>
        <p className="text-sm mb-6" style={{ color: 'rgba(14,12,10,0.5)' }}>
          Your email address has been verified. You now have full access to LawHub.
        </p>
        <Link
          href="/auth/login"
          className="inline-block px-6 py-3 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--teal)', color: 'white', textDecoration: 'none' }}
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (status === 'already_verified') {
    return (
      <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: 'rgba(14,12,10,0.1)' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>✅</div>
        <h1 className="font-serif text-2xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>
          Already Verified
        </h1>
        <p className="text-sm mb-6" style={{ color: 'rgba(14,12,10,0.5)' }}>
          Your email address is already verified.
        </p>
        <Link
          href="/auth/login"
          className="inline-block px-6 py-3 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--teal)', color: 'white', textDecoration: 'none' }}
        >
          Sign In
        </Link>
      </div>
    );
  }

  const errorMessages: Record<string, string> = {
    missing_token: 'No verification token was provided.',
    invalid_token: 'This verification link is invalid or has already been used.',
    expired:       'This verification link has expired. Please request a new one.',
  };

  const message = error ? (errorMessages[error] ?? 'An unknown error occurred.') : null;

  return (
    <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: 'rgba(14,12,10,0.1)' }}>
      {message ? (
        <>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
          <h1 className="font-serif text-2xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>
            Verification Failed
          </h1>
          <p className="text-sm mb-6" style={{ color: 'rgba(14,12,10,0.5)' }}>
            {message}
          </p>
          <p className="text-sm" style={{ color: 'rgba(14,12,10,0.5)' }}>
            Sign in to your account to request a new verification email.
          </p>
          <Link
            href="/auth/login"
            className="inline-block mt-4 px-6 py-3 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--gold)', color: 'white', textDecoration: 'none' }}
          >
            Sign In
          </Link>
        </>
      ) : (
        <>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📧</div>
          <h1 className="font-serif text-2xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>
            Check your email
          </h1>
          <p className="text-sm" style={{ color: 'rgba(14,12,10,0.5)' }}>
            We've sent a verification link to your email address. Click the link to activate your account.
          </p>
          <p className="text-xs mt-4" style={{ color: 'rgba(14,12,10,0.35)' }}>
            The link expires in 24 hours. Check your spam folder if you don't see it.
          </p>
        </>
      )}
    </div>
  );
}
