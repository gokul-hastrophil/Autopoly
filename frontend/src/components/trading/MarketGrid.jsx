import MarketCard from './MarketCard'

export default function MarketGrid({ markets, loading, onSelectMarket }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-[var(--bg-card)] rounded-xl h-44 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!markets.length) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl p-12 text-center">
        <p className="text-[var(--text-secondary)]">No markets found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {markets.map(m => (
        <MarketCard key={m.id} market={m} onClick={onSelectMarket} />
      ))}
    </div>
  )
}
