export default function ActivityLog({ log }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-4">
      <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wide">Activity Log</h3>
      {(!log || log.length === 0) ? (
        <p className="text-[var(--text-secondary)] text-sm text-center py-6">No activity yet. Place a trade to see logs here.</p>
      ) : (
        <div className="space-y-1 font-mono text-xs max-h-96 overflow-y-auto">
          {log.map((entry, i) => (
            <div key={i} className="flex items-center gap-3 py-2 px-2 border-b border-gray-800/50 last:border-0">
              <span className="text-[var(--text-secondary)] shrink-0">
                {entry.time.toLocaleTimeString()}
              </span>
              <span className={entry.type === 'error' ? 'text-[var(--accent-red)]' : 'text-[var(--accent-green)]'}>
                {entry.type === 'trade' ? '✓ TRADE' : '✗ ERROR'}
              </span>
              <span className="text-[var(--text-secondary)] truncate">{entry.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
