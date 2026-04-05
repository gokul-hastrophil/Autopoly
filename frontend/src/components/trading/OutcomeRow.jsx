export default function OutcomeRow({ name, price, onBuyYes, onBuyNo }) {
  const pct = (price * 100).toFixed(0)
  const yesCents = (price * 100).toFixed(0)
  const noCents = ((1 - price) * 100).toFixed(0)

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-xs font-bold">
          {name.charAt(0)}
        </div>
        <div>
          <span className="text-sm font-medium">{name}</span>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`text-xs font-bold ${price > 0.5 ? 'text-[var(--accent-green)]' : 'text-[var(--text-secondary)]'}`}>
              {pct}%
            </span>
            <span className="text-xs text-[var(--accent-green)]">↑ 2.1%</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onBuyYes?.(name)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-green)]/15 text-[var(--accent-green)] hover:bg-[var(--accent-green)]/25 transition"
        >
          Buy Yes {yesCents}¢
        </button>
        <button
          onClick={() => onBuyNo?.(name)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-red)]/15 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/25 transition"
        >
          Buy No {noCents}¢
        </button>
      </div>
    </div>
  )
}
