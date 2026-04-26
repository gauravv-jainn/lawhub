export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4"
      style={{ background: 'var(--cream)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-ink flex items-center justify-center"
              style={{ background: 'var(--ink)' }}>
              <span className="text-white font-serif text-sm font-bold">L</span>
            </div>
            <span className="font-serif text-xl font-semibold" style={{ color: 'var(--ink)' }}>
              LawHub
            </span>
          </a>
        </div>
        {children}
      </div>
    </div>
  );
}
