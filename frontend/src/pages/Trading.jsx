import { useState, useEffect, useCallback } from 'react'
import { getSession } from '../lib/auth'
import {
  fetchMarkets, fetchMarketDetail, executePaperTrade,
  fetchPaperPositions, fetchPaperSummary,
  setupWallet, getWalletStatus, deleteWallet,
  getPositions, getTradeHistory,
  getRiskSettings, updateRiskSettings,
  enableTrading, disableTrading,
} from '../lib/api'
import Navbar from '../components/Navbar'

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'crypto', label: '₿ Crypto' },
  { key: 'politics', label: '🏛 Politics' },
  { key: 'sports', label: '⚽ Sports' },
  { key: 'tech', label: '💻 Tech' },
]

const SORTS = [
  { key: 'volume', label: 'Top Volume' },
  { key: 'probability', label: 'Highest Probability' },
  { key: 'closing_soon', label: 'Closing Soon' },
  { key: 'newest', label: 'Newest' },
]

export default function Trading() {
  const [session, setSession] = useState(null)
  const [mode, setMode] = useState('paper')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSession().then(s => { setSession(s); setLoading(false) })
  }, [])

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Markets</h1>
            <p className="text-sm text-[var(--text-secondary)]">Trade on prediction markets with real data</p>
          </div>
          <div className="flex gap-2 bg-[var(--bg-card)] p-1 rounded-lg">
            <button onClick={() => setMode('paper')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                mode === 'paper' ? 'bg-[var(--accent-blue)] text-white' : 'text-[var(--text-secondary)] hover:text-white'
              }`}>📝 Paper</button>
            <button onClick={() => setMode('live')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                mode === 'live' ? 'bg-[var(--accent-green)] text-black' : 'text-[var(--text-secondary)] hover:text-white'
              }`}>💰 Live</button>
          </div>
        </div>

        {mode === 'paper' ? <PaperTradingView /> : (session ? <LiveTradingView /> : <LoginPrompt />)}
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="bg-[var(--bg-card)] rounded-xl h-40 animate-pulse" />)}
        </div>
      </div>
    </div>
  )
}

function LoginPrompt() {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-12 text-center">
      <h2 className="text-xl font-bold mb-2">Connect Your Wallet for Live Trading</h2>
      <p className="text-[var(--text-secondary)] mb-6">Sign in and set up your Polymarket API credentials to trade with real USDC.</p>
      <a href="/dashboard" className="bg-[var(--accent-blue)] text-white px-6 py-2 rounded-lg font-semibold">Sign In</a>
    </div>
  )
}

/* ============ PAPER TRADING ============ */

function PaperTradingView() {
  const [markets, setMarkets] = useState([])
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('volume')
  const [selectedMarket, setSelectedMarket] = useState(null)
  const [summary, setSummary] = useState(null)
  const [positions, setPositions] = useState([])
  const [loadingMarkets, setLoadingMarkets] = useState(true)
  const [activityLog, setActivityLog] = useState([])
  const [tab, setTab] = useState('markets') // markets | portfolio | log

  const loadData = useCallback(async () => {
    setLoadingMarkets(true)
    const [m, s, p] = await Promise.all([
      fetchMarkets(category, sort),
      fetchPaperSummary(),
      fetchPaperPositions('all'),
    ])
    if (m.data) setMarkets(m.data.markets || [])
    if (s.data) setSummary(s.data)
    if (p.data) setPositions(p.data.positions || [])
    setLoadingMarkets(false)
  }, [category, sort])

  useEffect(() => { loadData() }, [loadData])

  async function handleTrade(marketId, side, amount) {
    const { data, error } = await executePaperTrade(marketId, side, amount)
    if (error) {
      setActivityLog(prev => [{ time: new Date(), type: 'error', msg: error }, ...prev])
      return
    }
    setActivityLog(prev => [{
      time: new Date(),
      type: 'trade',
      msg: `${side} ${data.trade?.market?.slice(0, 60)}... @ ${data.trade?.entry_price} ($${amount})`,
    }, ...prev])
    setSelectedMarket(null)
    loadData()
  }

  return (
    <div>
      {/* Paper Banner */}
      <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
        <span className="text-blue-400 text-sm font-medium">📝 Paper Trading</span>
        <span className="text-blue-300/60 text-sm">· Virtual ${summary?.current_balance?.toLocaleString() || '10,000'} balance · No real money</span>
      </div>

      {/* Summary Bar */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <MiniStat label="Balance" value={`$${summary.current_balance.toLocaleString()}`} color={summary.current_balance >= 10000 ? 'green' : 'red'} />
          <MiniStat label="P&L" value={`${summary.total_pnl >= 0 ? '+' : ''}${summary.total_pnl.toFixed(1)}%`} color={summary.total_pnl >= 0 ? 'green' : 'red'} />
          <MiniStat label="Win Rate" value={`${summary.win_rate}%`} color="green" />
          <MiniStat label="Open" value={summary.open_positions} color="blue" />
          <MiniStat label="Trades" value={summary.total_trades} color="default" />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-4 border-b border-gray-800">
        {[
          { key: 'markets', label: 'Markets', count: markets.length },
          { key: 'portfolio', label: 'Portfolio', count: positions.filter(p => p.status === 'open').length },
          { key: 'log', label: 'Activity Log', count: activityLog.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition ${
              tab === t.key ? 'border-[var(--accent-blue)] text-white' : 'border-transparent text-[var(--text-secondary)] hover:text-white'
            }`}>
            {t.label} {t.count > 0 && <span className="ml-1 text-xs bg-[var(--bg-card)] px-1.5 py-0.5 rounded">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Markets Tab */}
      {tab === 'markets' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex gap-1 bg-[var(--bg-card)] p-1 rounded-lg">
              {CATEGORIES.map(c => (
                <button key={c.key} onClick={() => setCategory(c.key)}
                  className={`px-3 py-1 rounded text-xs font-medium transition ${
                    category === c.key ? 'bg-[var(--bg-secondary)] text-white' : 'text-[var(--text-secondary)] hover:text-white'
                  }`}>{c.label}</button>
              ))}
            </div>
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="bg-[var(--bg-card)] text-sm text-[var(--text-secondary)] px-3 py-1 rounded-lg border-0 outline-none">
              {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          {/* Market Grid */}
          {loadingMarkets ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1,2,3,4,5,6].map(i => <div key={i} className="bg-[var(--bg-card)] rounded-xl h-36 animate-pulse" />)}
            </div>
          ) : markets.length === 0 ? (
            <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center text-[var(--text-secondary)]">No markets found for this category.</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {markets.map(m => (
                <MarketCard key={m.id} market={m} onSelect={() => setSelectedMarket(m)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Portfolio Tab */}
      {tab === 'portfolio' && <PortfolioView positions={positions} />}

      {/* Activity Log Tab */}
      {tab === 'log' && <ActivityLog log={activityLog} />}

      {/* Trade Modal */}
      {selectedMarket && (
        <TradeModal market={selectedMarket} onClose={() => setSelectedMarket(null)} onTrade={handleTrade} />
      )}
    </div>
  )
}

function MiniStat({ label, value, color }) {
  const colors = {
    green: 'text-[var(--accent-green)]',
    red: 'text-[var(--accent-red)]',
    blue: 'text-[var(--accent-blue)]',
    default: 'text-white',
  }
  return (
    <div className="bg-[var(--bg-card)] rounded-lg px-4 py-3">
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      <p className={`text-lg font-bold ${colors[color] || colors.default}`}>{value}</p>
    </div>
  )
}

function MarketCard({ market, onSelect }) {
  const yesPct = (market.yes_price * 100).toFixed(0)
  const noPct = (market.no_price * 100).toFixed(0)

  const categoryColors = {
    crypto: 'bg-orange-500/20 text-orange-400',
    politics: 'bg-purple-500/20 text-purple-400',
    sports: 'bg-green-500/20 text-green-400',
    tech: 'bg-blue-500/20 text-blue-400',
    other: 'bg-gray-500/20 text-gray-400',
  }

  return (
    <div onClick={onSelect}
      className="bg-[var(--bg-card)] rounded-xl p-4 cursor-pointer hover:bg-[var(--bg-secondary)] transition group">
      <div className="flex justify-between items-start mb-3">
        <p className="font-medium text-sm leading-tight group-hover:text-white transition flex-1 mr-2">
          {market.question}
        </p>
        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${categoryColors[market.category] || categoryColors.other}`}>
          {market.category}
        </span>
      </div>

      {/* Probability Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[var(--accent-green)] font-semibold">Yes {yesPct}¢</span>
          <span className="text-[var(--accent-red)] font-semibold">No {noPct}¢</span>
        </div>
        <div className="h-2 bg-[var(--accent-red)]/30 rounded-full overflow-hidden">
          <div className="h-full bg-[var(--accent-green)] rounded-full transition-all"
            style={{ width: `${yesPct}%` }} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between text-xs text-[var(--text-secondary)]">
        <span>${market.volume?.toLocaleString()} vol</span>
        {market.end_date && (
          <span>Ends {new Date(market.end_date).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  )
}

function TradeModal({ market, onClose, onTrade }) {
  const [side, setSide] = useState('YES')
  const [amount, setAmount] = useState(10)
  const [submitting, setSubmitting] = useState(false)

  const price = side === 'YES' ? market.yes_price : market.no_price
  const shares = amount / price
  const potentialProfit = shares * (1 - price)
  const potentialReturn = ((1 / price - 1) * 100).toFixed(1)

  async function handleSubmit() {
    setSubmitting(true)
    await onTrade(market.id, side, amount)
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[var(--bg-card)] rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <h2 className="font-bold text-lg leading-tight pr-4">{market.question}</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white text-xl">×</button>
        </div>

        {/* Probability */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 rounded-lg p-3 text-center">
            <p className="text-xs text-[var(--text-secondary)]">Yes</p>
            <p className="text-2xl font-bold text-[var(--accent-green)]">{(market.yes_price * 100).toFixed(0)}¢</p>
          </div>
          <div className="flex-1 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 rounded-lg p-3 text-center">
            <p className="text-xs text-[var(--text-secondary)]">No</p>
            <p className="text-2xl font-bold text-[var(--accent-red)]">{(market.no_price * 100).toFixed(0)}¢</p>
          </div>
        </div>

        {/* Side Selection */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setSide('YES')}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
              side === 'YES' ? 'bg-[var(--accent-green)] text-black' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}>Buy Yes</button>
          <button onClick={() => setSide('NO')}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
              side === 'NO' ? 'bg-[var(--accent-red)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}>Buy No</button>
        </div>

        {/* Amount */}
        <div className="mb-4">
          <label className="text-xs text-[var(--text-secondary)] block mb-1">Amount ($)</label>
          <div className="flex gap-2">
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))}
              min="1" max="1000" step="1"
              className="flex-1 px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-gray-700 text-white focus:outline-none focus:border-[var(--accent-blue)]" />
            <div className="flex gap-1">
              {[10, 25, 50, 100].map(v => (
                <button key={v} onClick={() => setAmount(v)}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    amount === v ? 'bg-[var(--accent-blue)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                  }`}>${v}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Trade Summary */}
        <div className="bg-[var(--bg-secondary)] rounded-lg p-3 mb-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Price</span>
            <span>{(price * 100).toFixed(1)}¢ per share</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Shares</span>
            <span>{shares.toFixed(1)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Potential profit</span>
            <span className="text-[var(--accent-green)]">+${potentialProfit.toFixed(2)} ({potentialReturn}%)</span>
          </div>
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={submitting || amount <= 0}
          className={`w-full py-3 rounded-lg font-semibold transition ${
            side === 'YES'
              ? 'bg-[var(--accent-green)] text-black hover:opacity-90'
              : 'bg-[var(--accent-red)] text-white hover:opacity-90'
          } disabled:opacity-50`}>
          {submitting ? 'Placing trade...' : `Buy ${side} · $${amount}`}
        </button>

        <p className="text-xs text-center text-[var(--text-secondary)] mt-3">📝 Paper trade — no real money</p>
      </div>
    </div>
  )
}

function PortfolioView({ positions }) {
  const openPositions = positions.filter(p => p.status === 'open')
  const closedPositions = positions.filter(p => p.status === 'closed')

  return (
    <div className="space-y-4">
      {/* Open Positions */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">OPEN POSITIONS ({openPositions.length})</h3>
        {openPositions.length === 0 ? (
          <div className="bg-[var(--bg-card)] rounded-xl p-6 text-center text-[var(--text-secondary)] text-sm">
            No open positions. Click on a market to trade.
          </div>
        ) : openPositions.map((p, i) => <PositionRow key={i} position={p} />)}
      </div>

      {/* Closed Positions */}
      {closedPositions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">CLOSED ({closedPositions.length})</h3>
          {closedPositions.slice(0, 20).map((p, i) => <PositionRow key={i} position={p} />)}
        </div>
      )}
    </div>
  )
}

function PositionRow({ position: p }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-4 flex justify-between items-center">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{p.market_question}</p>
        <div className="flex gap-3 mt-1 text-xs text-[var(--text-secondary)]">
          <span>Entry: {Number(p.entry_price).toFixed(2)}¢</span>
          {p.current_price && <span>Current: {Number(p.current_price).toFixed(2)}¢</span>}
          <span className={p.status === 'open' ? 'text-[var(--accent-blue)]' : (p.outcome === 'win' ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]')}>
            {p.status === 'open' ? '● OPEN' : p.outcome?.toUpperCase()}
          </span>
          {p.ai_verified === false && <span className="text-yellow-500">Rule-based</span>}
        </div>
      </div>
      {p.profit_pct != null && (
        <span className={`text-sm font-mono font-bold ml-3 ${Number(p.profit_pct) >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
          {Number(p.profit_pct) >= 0 ? '+' : ''}{Number(p.profit_pct).toFixed(1)}%
        </span>
      )}
    </div>
  )
}

function ActivityLog({ log }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-4">
      {log.length === 0 ? (
        <p className="text-[var(--text-secondary)] text-sm text-center py-4">No activity yet. Place a paper trade to see logs here.</p>
      ) : (
        <div className="space-y-2 font-mono text-sm">
          {log.map((entry, i) => (
            <div key={i} className="flex gap-3 py-1 border-b border-gray-800/50">
              <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                {entry.time.toLocaleTimeString()}
              </span>
              <span className={entry.type === 'error' ? 'text-[var(--accent-red)]' : 'text-[var(--accent-green)]'}>
                {entry.type === 'trade' ? '✓' : '✗'}
              </span>
              <span className="text-[var(--text-secondary)]">{entry.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ============ LIVE TRADING ============ */

function LiveTradingView() {
  const [activeTab, setActiveTab] = useState('Wallet')
  const TABS = ['Wallet', 'Positions', 'Risk Settings', 'Trade History']

  return (
    <div>
      <div className="bg-green-900/20 border border-green-700/50 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
        <span className="text-green-400 text-sm font-medium">💰 Live Trading</span>
        <span className="text-green-300/60 text-sm">· Real USDC · Real Polymarket orders</span>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-800 pb-2">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition ${
              activeTab === tab ? 'bg-[var(--bg-card)] text-white' : 'text-[var(--text-secondary)] hover:text-white'
            }`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'Wallet' && <WalletTab />}
      {activeTab === 'Positions' && <LivePositionsTab />}
      {activeTab === 'Risk Settings' && <RiskTab />}
      {activeTab === 'Trade History' && <HistoryTab />}
    </div>
  )
}

function WalletTab() {
  const [wallet, setWallet] = useState(null)
  const [form, setForm] = useState({ api_key: '', api_secret: '', api_passphrase: '', private_key: '' })
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { getWalletStatus().then(r => { if (r.data) setWallet(r.data) }) }, [])

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setMsg('')
    const { data, error } = await setupWallet(form)
    setSaving(false)
    if (error) { setMsg(`Error: ${error}`); return }
    setMsg(data.connection_tested ? 'Wallet saved & verified!' : 'Saved (connection test failed)')
    setWallet({ configured: true, is_active: true })
    setForm({ api_key: '', api_secret: '', api_passphrase: '', private_key: '' })
  }

  async function handleDelete() {
    if (!confirm('Delete wallet and disable auto-trading?')) return
    await deleteWallet()
    setWallet({ configured: false }); setMsg('Deleted')
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-6">
      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 mb-6">
        <p className="text-yellow-400 text-sm">⚠️ Credentials are encrypted at rest. Never share your private key.</p>
      </div>
      {wallet?.configured ? (
        <div>
          <p className="text-[var(--accent-green)] font-semibold mb-4">✓ Wallet Connected</p>
          <button onClick={handleDelete} className="bg-red-600/20 text-red-400 px-4 py-2 rounded-lg text-sm">Delete Wallet</button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-3">
          {['api_key', 'api_secret', 'api_passphrase', 'private_key'].map(f => (
            <div key={f}>
              <label className="text-xs text-[var(--text-secondary)] block mb-1">{f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</label>
              <input type="password" value={form[f]} onChange={e => setForm({...form, [f]: e.target.value})} required
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-gray-700 text-white text-sm focus:outline-none focus:border-[var(--accent-blue)]" />
            </div>
          ))}
          <button type="submit" disabled={saving} className="bg-[var(--accent-blue)] text-white px-6 py-2 rounded-lg font-semibold text-sm disabled:opacity-50">
            {saving ? 'Saving...' : 'Save & Test'}
          </button>
        </form>
      )}
      {msg && <p className="text-sm mt-3 text-[var(--text-secondary)]">{msg}</p>}
    </div>
  )
}

function LivePositionsTab() {
  const [positions, setPositions] = useState([])
  const [filter, setFilter] = useState('all')
  useEffect(() => { getPositions(filter).then(r => { if (r.data) setPositions(r.data.positions || []) }) }, [filter])

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-6">
      <div className="flex gap-2 mb-4">
        {['all', 'open', 'closed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-xs ${filter === f ? 'bg-[var(--accent-blue)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>
      {positions.length === 0 ? <p className="text-[var(--text-secondary)] text-sm">No positions yet.</p>
        : positions.map((p, i) => <PositionRow key={i} position={p} />)}
    </div>
  )
}

function RiskTab() {
  const [s, setS] = useState({ max_position_size: 50, max_open_positions: 5, max_daily_loss: 100, auto_trade_enabled: false })
  const [msg, setMsg] = useState('')
  useEffect(() => { getRiskSettings().then(r => { if (r.data) setS(r.data) }) }, [])

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-6">
      <div className={`p-4 rounded-lg mb-6 flex justify-between items-center ${s.auto_trade_enabled ? 'bg-green-900/20 border border-green-700' : 'bg-[var(--bg-secondary)]'}`}>
        <div>
          <p className="font-semibold text-sm">{s.auto_trade_enabled ? '🟢 Auto-Trading Active' : '⏸ Auto-Trading Off'}</p>
          <p className="text-xs text-[var(--text-secondary)]">{s.auto_trade_enabled ? 'Bot trades every ~10 min' : 'Enable for automated trading'}</p>
        </div>
        <button onClick={async () => {
          const { error } = await (s.auto_trade_enabled ? disableTrading : enableTrading)()
          if (!error) setS(p => ({ ...p, auto_trade_enabled: !p.auto_trade_enabled }))
          else setMsg(`Error: ${error}`)
        }} className={`px-4 py-2 rounded-lg font-semibold text-xs ${s.auto_trade_enabled ? 'bg-red-600 text-white' : 'bg-[var(--accent-green)] text-black'}`}>
          {s.auto_trade_enabled ? 'Disable' : 'Enable'}
        </button>
      </div>
      <div className="space-y-3">
        {[['max_position_size','Max Position ($)'],['max_open_positions','Max Open'],['max_daily_loss','Max Daily Loss ($)']].map(([k,l]) => (
          <div key={k}>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">{l}</label>
            <input type="number" value={s[k]} onChange={e => setS({...s, [k]: Number(e.target.value)})}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-gray-700 text-white text-sm focus:outline-none focus:border-[var(--accent-blue)]" />
          </div>
        ))}
        <button onClick={async () => { const {error} = await updateRiskSettings({max_position_size:s.max_position_size,max_open_positions:s.max_open_positions,max_daily_loss:s.max_daily_loss}); setMsg(error||'Saved!') }}
          className="bg-[var(--accent-blue)] text-white px-6 py-2 rounded-lg font-semibold text-sm">Save</button>
      </div>
      {msg && <p className="text-sm mt-3 text-[var(--text-secondary)]">{msg}</p>}
    </div>
  )
}

function HistoryTab() {
  const [trades, setTrades] = useState([])
  useEffect(() => { getTradeHistory().then(r => { if (r.data) setTrades(r.data.trades || []) }) }, [])

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-6">
      {trades.length === 0 ? <p className="text-[var(--text-secondary)] text-sm">No trades yet.</p> : (
        <table className="w-full text-xs">
          <thead><tr className="text-[var(--text-secondary)] border-b border-gray-800">
            <th className="text-left pb-2">Date</th><th className="text-left pb-2">Action</th><th className="text-left pb-2">Market</th><th className="text-right pb-2">Price</th><th className="text-right pb-2">Size</th>
          </tr></thead>
          <tbody>{trades.map((t,i) => (
            <tr key={i} className="border-b border-gray-800/30">
              <td className="py-2">{new Date(t.executed_at).toLocaleString()}</td>
              <td className={`py-2 font-semibold ${t.action==='buy'?'text-[var(--accent-green)]':'text-[var(--accent-red)]'}`}>{t.action.toUpperCase()}</td>
              <td className="py-2 max-w-[200px] truncate">{t.market_id}</td>
              <td className="py-2 text-right">{Number(t.price).toFixed(4)}</td>
              <td className="py-2 text-right">${Number(t.size).toFixed(2)}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  )
}
