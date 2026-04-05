export default function BreakingNews({ markets, summary, onSelectMarket }) {
  const formatVolume = (v) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`
    return `$${v}`
  }

  const topMarkets = [...(markets || [])].sort((a, b) => b.volume - a.volume).slice(0, 6)

  return (
    <div className="space-y-4">
      {/* Balance Widget */}
      {summary && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wide">Paper Portfolio</h3>
          <div className="text-2xl font-bold mb-1">
            ${summary.current_balance?.toLocaleString() || '10,000'}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${(summary.total_pnl || 0) >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
              {(summary.total_pnl || 0) >= 0 ? '+' : ''}{(summary.total_pnl || 0).toFixed(1)}%
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              {summary.win_rate || 0}% win · {summary.open_positions || 0} open
            </span>
          </div>
        </div>
      )}

      {/* Hot Topics */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wide">Hot Topics</h3>
        <div className="space-y-1">
          {topMarkets.map((m, i) => (
            <div
              key={m.id}
              onClick={() => onSelectMarket(m)}
              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[var(--bg-secondary)] cursor-pointer transition"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs text-[var(--text-secondary)] w-4">{i + 1}</span>
                <span className="text-sm truncate">{m.question}</span>
              </div>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                <span className="text-xs text-[var(--text-secondary)]">{formatVolume(m.volume)}</span>
                <span className={`text-xs font-bold ${m.yes_price > 0.5 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                  {m.yes_price > 0.5 ? '↑' : '↓'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
