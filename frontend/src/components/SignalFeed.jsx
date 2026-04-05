export default function SignalFeed({ trades = [], connectionMode = 'offline' }) {
  const modeLabel = {
    realtime: '🟢 Live',
    polling: '🟡 Updating every 30s',
    offline: '🔴 Offline',
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Live Paper Trades</h3>
        <span className="text-sm text-[var(--text-secondary)]">{modeLabel[connectionMode]}</span>
      </div>
      {trades.length === 0 ? (
        <p className="text-[var(--text-secondary)]">No trades yet...</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {trades.map((t, i) => (
            <div key={i} className={`flex justify-between items-center p-3 rounded-lg ${
              t.ai_verified === false ? 'bg-[var(--bg-secondary)] opacity-70' : 'bg-[var(--bg-secondary)]'
            }`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{t.market_question}</p>
                <div className="flex gap-2 text-xs text-[var(--text-secondary)] mt-1">
                  <span>Entry: {Number(t.entry_price).toFixed(2)}</span>
                  {t.current_price && <span>Current: {Number(t.current_price).toFixed(2)}</span>}
                  <span className={t.status === 'open' ? 'text-[var(--accent-blue)]' : t.outcome === 'win' ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}>
                    {t.status === 'open' ? 'OPEN' : t.outcome?.toUpperCase()}
                  </span>
                  {t.ai_verified === false && (
                    <span className="text-yellow-500 font-medium">Rule-based</span>
                  )}
                </div>
              </div>
              {t.profit_pct !== null && t.profit_pct !== undefined && (
                <span className={`text-sm font-mono font-bold ml-3 ${Number(t.profit_pct) >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                  {Number(t.profit_pct) >= 0 ? '+' : ''}{Number(t.profit_pct).toFixed(1)}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
