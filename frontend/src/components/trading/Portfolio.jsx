export default function Portfolio({ positions, onSelectMarket }) {
  const openPositions = positions.filter(p => p.status === 'open')
  const closedPositions = positions.filter(p => p.status === 'closed')

  return (
    <div className="space-y-6">
      {/* Open */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wide">
          Open Positions ({openPositions.length})
        </h3>
        {openPositions.length === 0 ? (
          <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center">
            <p className="text-[var(--text-secondary)] text-sm">No open positions. Browse markets and place a paper trade to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {openPositions.map((p, i) => (
              <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.market_question}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
                    <span>Entry: <span className="text-white">{Number(p.entry_price).toFixed(2)}¢</span></span>
                    {p.current_price && <span>Now: <span className="text-white">{Number(p.current_price).toFixed(2)}¢</span></span>}
                    <span>Conf: {(Number(p.ai_confidence) * 100).toFixed(0)}%</span>
                    {p.ai_verified === false && <span className="text-yellow-500">Rule-based</span>}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{new Date(p.created_at).toLocaleString()}</p>
                </div>
                <span className="text-[var(--accent-blue)] text-xs font-bold ml-3 shrink-0">OPEN</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Closed */}
      {closedPositions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wide">
            Closed ({closedPositions.length})
          </h3>
          <div className="space-y-2">
            {closedPositions.slice(0, 20).map((p, i) => (
              <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.market_question}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
                    <span>Entry: {Number(p.entry_price).toFixed(2)}¢</span>
                    {p.exit_price && <span>Exit: {Number(p.exit_price).toFixed(2)}¢</span>}
                    <span className={p.outcome === 'win' ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}>
                      {p.outcome?.toUpperCase()}
                    </span>
                  </div>
                </div>
                {p.profit_pct != null && (
                  <span className={`text-sm font-mono font-bold ml-3 shrink-0 ${Number(p.profit_pct) >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                    {Number(p.profit_pct) >= 0 ? '+' : ''}{Number(p.profit_pct).toFixed(1)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
