import { useState } from 'react'

export default function TradePanel({ market, mode, onTrade }) {
  const [tab, setTab] = useState('buy') // buy | sell
  const [side, setSide] = useState('YES')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const price = side === 'YES' ? market.yes_price : market.no_price
  const amountNum = parseFloat(amount) || 0
  const shares = price > 0 ? amountNum / price : 0
  const toWin = shares * (1 - price)

  async function handleTrade() {
    if (amountNum <= 0) return
    setSubmitting(true)
    await onTrade(market.id, side, amountNum)
    setSubmitting(false)
    setAmount('')
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-5">
      {/* Outcome label */}
      <p className="text-sm font-semibold mb-3">{market.question?.slice(0, 50)}</p>

      {/* Buy / Sell tabs */}
      <div className="flex gap-1 bg-[var(--bg-secondary)] rounded-lg p-1 mb-4">
        <button
          onClick={() => setTab('buy')}
          className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition ${
            tab === 'buy' ? 'bg-[var(--bg-card)] text-white' : 'text-[var(--text-secondary)]'
          }`}>Buy</button>
        <button
          onClick={() => setTab('sell')}
          className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition ${
            tab === 'sell' ? 'bg-[var(--bg-card)] text-white' : 'text-[var(--text-secondary)]'
          }`}>Sell</button>
      </div>

      {/* Yes / No buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSide('YES')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${
            side === 'YES'
              ? 'bg-[var(--accent-green)] text-black'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-white'
          }`}>
          Yes {(market.yes_price * 100).toFixed(0)}¢
        </button>
        <button
          onClick={() => setSide('NO')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${
            side === 'NO'
              ? 'bg-[var(--accent-red)] text-white'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-white'
          }`}>
          No {(market.no_price * 100).toFixed(0)}¢
        </button>
      </div>

      {/* Amount */}
      <div className="mb-3">
        <label className="text-xs text-[var(--text-secondary)] mb-1 block">Amount</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">$</span>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0"
            className="w-full pl-7 pr-4 py-2.5 bg-[var(--bg-secondary)] rounded-lg text-lg font-bold text-white border border-gray-700 focus:outline-none focus:border-[var(--accent-blue)]"
          />
        </div>
      </div>

      {/* Quick amounts */}
      <div className="flex gap-1.5 mb-4">
        {[1, 5, 10, 20].map(v => (
          <button key={v} onClick={() => setAmount(String(v))}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
              parseFloat(amount) === v
                ? 'bg-[var(--accent-blue)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-white'
            }`}>
            ${v}
          </button>
        ))}
      </div>

      {/* To win calculation */}
      {amountNum > 0 && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-3 mb-4">
          <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
            <span>Avg price</span>
            <span>{(price * 100).toFixed(1)}¢</span>
          </div>
          <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
            <span>Shares</span>
            <span>{shares.toFixed(1)}</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-gray-700">
            <span className="text-sm text-[var(--text-secondary)]">To win</span>
            <span className="text-lg font-bold text-[var(--accent-green)]">
              ${toWin.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleTrade}
        disabled={submitting || amountNum <= 0}
        className={`w-full py-3 rounded-lg font-bold text-sm transition ${
          side === 'YES'
            ? 'bg-[var(--accent-green)] text-black hover:opacity-90'
            : 'bg-[var(--accent-red)] text-white hover:opacity-90'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {submitting ? 'Placing...' : amountNum > 0 ? `Buy ${side} · $${amountNum}` : `Buy ${side}`}
      </button>

      {/* Mode label */}
      <p className="text-xs text-center text-[var(--text-secondary)] mt-3">
        {mode === 'paper' ? 'Paper trade — no real money' : 'Live trade — real USDC'}
      </p>
    </div>
  )
}
