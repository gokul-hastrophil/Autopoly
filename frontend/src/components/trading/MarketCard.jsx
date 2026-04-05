export default function MarketCard({ market, onClick }) {
  const outcomes = [
    { name: 'Yes', price: market.yes_price, color: 'green' },
    { name: 'No', price: market.no_price, color: 'red' },
  ]

  const formatVolume = (v) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`
    return `$${v}`
  }

  const timeLeft = (endDate) => {
    if (!endDate) return ''
    const diff = new Date(endDate) - new Date()
    if (diff <= 0) return 'Ended'
    const days = Math.floor(diff / 86400000)
    if (days > 30) return new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (days > 0) return `${days}d left`
    const hours = Math.floor(diff / 3600000)
    return `${hours}h left`
  }

  return (
    <div
      onClick={() => onClick(market)}
      className="bg-[var(--bg-card)] rounded-xl p-4 cursor-pointer hover:bg-[#2a2d42] transition group border border-transparent hover:border-gray-700"
    >
      {/* Header: Image + Question */}
      <div className="flex gap-3 mb-3">
        {market.image ? (
          <img src={market.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-[var(--bg-secondary)] shrink-0 flex items-center justify-center text-xl">
            📊
          </div>
        )}
        <h3 className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-white transition">
          {market.question}
        </h3>
      </div>

      {/* Outcomes */}
      <div className="space-y-2 mb-3">
        {outcomes.map(o => {
          const pct = (o.price * 100).toFixed(0)
          const isHigh = o.price > 0.5
          return (
            <div key={o.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-[var(--text-secondary)] w-6">{o.name}</span>
                <div className="flex-1 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${o.color === 'green' ? 'bg-[var(--accent-green)]' : 'bg-[var(--accent-red)]'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className={`text-xs font-bold ml-2 ${
                o.color === 'green' && isHigh ? 'text-[var(--accent-green)]' :
                o.color === 'red' && isHigh ? 'text-[var(--accent-red)]' :
                'text-[var(--text-secondary)]'
              }`}>
                {pct}¢
              </span>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>{formatVolume(market.volume)} Vol</span>
        <span>{timeLeft(market.end_date)}</span>
      </div>
    </div>
  )
}
