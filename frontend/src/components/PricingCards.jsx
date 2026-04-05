const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: ['3 signals/day', 'Delayed signals', 'Basic analytics', 'Proof page access'],
    cta: 'Get Started',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    features: ['20 signals/day', 'Real-time signals', 'AI reasoning included', 'Telegram alerts', 'Full analytics'],
    cta: 'Subscribe',
    highlight: true,
  },
  {
    name: 'Premium',
    price: '$79',
    period: '/month',
    features: ['Unlimited signals', 'Priority alerts', 'API access', 'AI reasoning + confidence', 'Dedicated support'],
    cta: 'Subscribe',
    highlight: false,
  },
]

export default function PricingCards() {
  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
      {tiers.map((tier) => (
        <div
          key={tier.name}
          className={`rounded-xl p-6 ${
            tier.highlight
              ? 'bg-[var(--accent-blue)] bg-opacity-10 border-2 border-[var(--accent-blue)] relative'
              : 'bg-[var(--bg-card)] border border-gray-700'
          }`}
        >
          {tier.highlight && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--accent-blue)] text-white text-xs font-bold px-3 py-1 rounded-full">
              POPULAR
            </span>
          )}
          <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
          <div className="mb-4">
            <span className="text-4xl font-bold">{tier.price}</span>
            <span className="text-[var(--text-secondary)]">{tier.period}</span>
          </div>
          <ul className="space-y-2 mb-6">
            {tier.features.map((f) => (
              <li key={f} className="text-sm flex items-center gap-2">
                <span className="text-[var(--accent-green)]">&#10003;</span>
                {f}
              </li>
            ))}
          </ul>
          <button
            className={`w-full py-2 rounded-lg font-semibold transition ${
              tier.highlight
                ? 'bg-[var(--accent-blue)] text-white hover:opacity-90'
                : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-opacity-80'
            }`}
          >
            {tier.cta}
          </button>
        </div>
      ))}
    </div>
  )
}
