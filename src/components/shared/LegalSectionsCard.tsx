interface LegalSection {
  act: string;
  section: string;
  title: string;
  relevance: string;
}

interface Props {
  structuredSummary: unknown;
}

function parseSections(raw: unknown): LegalSection[] | string[] | null {
  let data: unknown = raw;

  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return null; }
  }

  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;

  if (Array.isArray(obj.applicable_sections) && obj.applicable_sections.length > 0) {
    return obj.applicable_sections as LegalSection[];
  }
  if (Array.isArray(obj.applicable_laws) && obj.applicable_laws.length > 0) {
    return obj.applicable_laws as string[];
  }
  return null;
}

export default function LegalSectionsCard({ structuredSummary }: Props) {
  const sections = parseSections(structuredSummary);
  if (!sections || sections.length === 0) return null;

  const isStructured = typeof sections[0] === 'object';

  return (
    <div style={{
      background: 'white',
      border: '1px solid rgba(14,12,10,0.08)',
      borderRadius: '12px',
      padding: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '18px' }}>⚖️</span>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
          Applicable Indian Law
        </h2>
        <span style={{
          fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px',
          background: 'rgba(13,115,119,0.1)', color: 'var(--teal)', letterSpacing: '0.05em',
        }}>
          AI ANALYSIS
        </span>
      </div>

      {isStructured ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(sections as LegalSection[]).map((s, i) => (
            <div key={i} style={{
              padding: '14px 16px',
              background: 'var(--cream)',
              borderRadius: '8px',
              borderLeft: '3px solid var(--teal)',
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '4px' }}>
                <span style={{
                  fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                  background: 'rgba(13,115,119,0.12)', color: 'var(--teal)',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {s.section}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                  {s.title}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.45)', marginBottom: '6px' }}>
                {s.act}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.65)', lineHeight: 1.55 }}>
                {s.relevance}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {(sections as string[]).map((law, i) => (
            <div key={i} style={{
              padding: '10px 14px', background: 'var(--cream)', borderRadius: '8px',
              fontSize: '13px', color: 'var(--ink)', borderLeft: '3px solid var(--teal)',
            }}>
              {law}
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: '11px', color: 'rgba(14,12,10,0.35)', marginTop: '12px', fontStyle: 'italic' }}>
        AI-generated analysis for reference only. Consult a qualified advocate for legal advice.
      </p>
    </div>
  );
}
