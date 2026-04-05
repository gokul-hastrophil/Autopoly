export default function FeaturedMarket({ market, onClick }) {
  if (!market) return null

  const yesPct = (market.yes_price * 100).toFixed(0)
  const noPct = (market.no_price * 100).toFixed(0)

  const formatVolume = (v) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`
    return `$${v}`
  }

  return (
    <div
      onClick={() => onClick(market)}
      className="bg-[var(--bg-card)] rounded-xl p-5 cursor-pointer hover:bg-[#2a2d42] transition border border-gray-800"
    >
      <div className="flex gap-4">
        {/* Image */}
        {market.image ? (
          <img src={market.image} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-[var(--bg-secondary)] shrink-0 flex items-center justify-center text-2xl">📊</div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded capitalize">
              {market.category || 'trending'}
            </span>
          </div>
          <h2 className="text-lg font-bold mb-3">{market.question}</h2>

          {/* Outcome bars */}
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--text-secondary)]">Yes</span>
                <span className="font-bold text-[var(--accent-green)]">{yesPct}%</span>
              </div>
              <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent-green)] rounded-full" style={{ width: `${yesPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--text-secondary)]">No</span>
                <span className="font-bold text-[var(--accent-red)]">{noPct}%</span>
              </div>
              <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent-red)] rounded-full" style={{ width: `${noPct}%` }} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-secondary)]">
            <span>{formatVolume(market.volume)} Vol</span>
            {market.end_date && <span>{new Date(market.end_date).toLocaleDateString()}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
