export default function DashboardSkeleton() {
  return (
    <div className="page-container" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.5 } }
        .sk { background: rgba(14,12,10,0.08); border-radius: 8px; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="sk" style={{ height: '36px', width: '220px', marginBottom: '8px' }} />
          <div className="sk" style={{ height: '16px', width: '160px' }} />
        </div>
        <div className="sk" style={{ height: '40px', width: '130px', borderRadius: '8px' }} />
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '32px' }}
        className="dash-stats-4">
        {[1,2,3,4].map(i => (
          <div key={i} style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
            <div className="sk" style={{ height: '20px', width: '20px', borderRadius: '50%', marginBottom: '12px' }} />
            <div className="sk" style={{ height: '32px', width: '80px', marginBottom: '6px' }} />
            <div className="sk" style={{ height: '12px', width: '100px' }} />
          </div>
        ))}
      </div>

      {/* Two column */}
      <div className="dash-grid-2">
        {[1,2].map(i => (
          <div key={i} style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div className="sk" style={{ height: '20px', width: '140px' }} />
              <div className="sk" style={{ height: '14px', width: '60px' }} />
            </div>
            {[1,2,3].map(j => (
              <div key={j} style={{ marginBottom: '12px', padding: '14px', border: '1px solid rgba(14,12,10,0.06)', borderRadius: '10px' }}>
                <div className="sk" style={{ height: '14px', width: '70%', marginBottom: '8px' }} />
                <div className="sk" style={{ height: '11px', width: '50%' }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
