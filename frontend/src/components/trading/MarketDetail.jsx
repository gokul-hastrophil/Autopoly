import PriceChart from './PriceChart'
import TradePanel from './TradePanel'
import OutcomeRow from './OutcomeRow'
import RelatedMarkets from './RelatedMarkets'

export default function MarketDetail({ market, relatedMarkets, mode, onBack, onTrade, onSelectRelated }) {
  if (!market) return null

  const formatVolume = (v) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`
    return `$${v}`
  }

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-white transition mb-4"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to markets
      </button>

      <div className="flex gap-6">
        {/* Left: Chart + Outcomes + Description */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            {market.image ? (
              <img src={market.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-[var(--bg-secondary)] shrink-0 flex items-center justify-center text-xl">📊</div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded">
                  {market.category || 'Market'}
                </span>
              </div>
              <h1 className="text-xl font-bold">{market.question}</h1>
            </div>
          </div>

          {/* Price Chart */}
          <div className="bg-[var(--bg-card)] rounded-xl p-4 mb-4">
            <PriceChart yesPrice={market.yes_price} noPrice={market.no_price} />
            <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-secondary)]">
              <span>Vol: {formatVolume(market.volume)}</span>
              {market.end_date && (
                <span>Ends: {new Date(market.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              )}
            </div>
          </div>

          {/* Outcomes */}
          <div className="bg-[var(--bg-card)] rounded-xl p-4 mb-4">
            <OutcomeRow
              name="Yes"
              price={market.yes_price}
              onBuyYes={() => onTrade(market.id, 'YES', 10)}
              onBuyNo={() => onTrade(market.id, 'NO', 10)}
            />
            <OutcomeRow
              name="No"
              price={market.no_price}
              onBuyYes={() => onTrade(market.id, 'YES', 10)}
              onBuyNo={() => onTrade(market.id, 'NO', 10)}
            />
          </div>

          {/* Description */}
          {market.description && (
            <div className="bg-[var(--bg-card)] rounded-xl p-4">
              <div className="flex gap-4 mb-3 border-b border-gray-800 pb-2">
                <span className="text-sm font-medium text-white border-b-2 border-white pb-2">Rules</span>
                <span className="text-sm text-[var(--text-secondary)] pb-2">Market Context</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                {market.description}
              </p>
            </div>
          )}
        </div>

        {/* Right: Trade Panel + Related */}
        <div className="w-80 shrink-0 hidden lg:block">
          <TradePanel market={market} mode={mode} onTrade={onTrade} />
          <RelatedMarkets markets={relatedMarkets} onSelect={onSelectRelated} />
        </div>
      </div>

      {/* Mobile Trade Panel */}
      <div className="lg:hidden mt-4">
        <TradePanel market={market} mode={mode} onTrade={onTrade} />
      </div>
    </div>
  )
}
