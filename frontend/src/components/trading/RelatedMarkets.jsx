export default function RelatedMarkets({ markets, onSelect }) {
  if (!markets?.length) return null

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-4 mt-4">
      <h3 className="text-sm font-semibold mb-3 text-[var(--text-secondary)]">Related Markets</h3>
      <div className="space-y-2">
        {markets.slice(0, 5).map(m => (
          <div
            key={m.id}
            onClick={() => onSelect(m)}
            className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[var(--bg-secondary)] cursor-pointer transition"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {m.image ? (
                <img src={m.image} alt="" className="w-6 h-6 rounded shrink-0 object-cover" />
              ) : (
                <div className="w-6 h-6 rounded bg-[var(--bg-secondary)] shrink-0" />
              )}
              <span className="text-xs truncate">{m.question}</span>
            </div>
            <span className="text-xs font-bold text-[var(--accent-green)] ml-2 shrink-0">
              {(m.yes_price * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
