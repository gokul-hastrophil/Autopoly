import { useState, useEffect } from 'react'
import { getSession } from '../lib/auth'
import { fetchPaperPositions, fetchPaperSummary } from '../lib/api'
import {
  setupWallet, getWalletStatus, deleteWallet,
  getPositions, getTradeHistory,
  getRiskSettings, updateRiskSettings,
  enableTrading, disableTrading,
} from '../lib/api'
import Navbar from '../components/Navbar'

export default function Trading() {
  const [session, setSession] = useState(null)
  const [mode, setMode] = useState('paper') // 'paper' or 'live'
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSession().then(s => { setSession(s); setLoading(false) })
  }, [])

  if (loading) return <div className="min-h-screen bg-[var(--bg-primary)]"><Navbar /><div className="max-w-5xl mx-auto p-8"><div className="bg-[var(--bg-card)] rounded-xl h-64 animate-pulse" /></div></div>

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar />
      <div className="max-w-5xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-2">Trading</h1>
        <p className="text-[var(--text-secondary)] mb-6">Paper trade with $10,000 virtual balance or connect your wallet for live trading.</p>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setMode('paper')}
            className={`px-6 py-2 rounded-lg font-semibold text-sm transition ${
              mode === 'paper' ? 'bg-[var(--accent-blue)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-white'
            }`}>
            📝 Paper Trading
          </button>
          <button onClick={() => setMode('live')}
            className={`px-6 py-2 rounded-lg font-semibold text-sm transition ${
              mode === 'live' ? 'bg-[var(--accent-green)] text-black' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-white'
            }`}>
            💰 Live Trading
          </button>
        </div>

        {mode === 'paper' && <PaperTradingView />}
        {mode === 'live' && (session ? <LiveTradingView /> : <LiveLoginPrompt />)}
      </div>
    </div>
  )
}

/* ============ PAPER TRADING ============ */

function PaperTradingView() {
  const [summary, setSummary] = useState(null)
  const [positions, setPositions] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchPaperSummary(), fetchPaperPositions(filter)]).then(([s, p]) => {
      if (s.data) setSummary(s.data)
      if (p.data) setPositions(p.data.positions || [])
      setLoading(false)
    })
  }, [filter])

  if (loading) return <div className="bg-[var(--bg-card)] rounded-xl h-64 animate-pulse" />

  return (
    <div>
      {/* Paper Trading Banner */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">📝</span>
          <span className="font-semibold text-blue-400">Paper Trading Mode</span>
        </div>
        <p className="text-sm text-blue-200/70">Virtual $10,000 balance. Real market data. No real money at risk. Bot runs every ~10 minutes.</p>
      </div>

      {/* P&L Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard label="Balance" value={`$${summary.current_balance.toLocaleString()}`}
            color={summary.current_balance >= summary.starting_balance ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'} />
          <SummaryCard label="Total P&L" value={`${summary.total_pnl >= 0 ? '+' : ''}${summary.total_pnl.toFixed(1)}%`}
            color={summary.total_pnl >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'} />
          <SummaryCard label="Win Rate" value={`${summary.win_rate}%`}
            subtitle={`${summary.wins}W / ${summary.losses}L`}
            color="text-[var(--accent-green)]" />
          <SummaryCard label="Open Positions" value={summary.open_positions}
            subtitle={`${summary.total_trades} total`}
            color="text-[var(--accent-blue)]" />
        </div>
      )}

      {/* Unrealized P&L */}
      {summary && summary.unrealized_pnl !== 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 mb-6">
          <span className="text-sm text-[var(--text-secondary)]">Unrealized P&L: </span>
          <span className={`font-bold ${summary.unrealized_pnl >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
            {summary.unrealized_pnl >= 0 ? '+' : ''}{summary.unrealized_pnl.toFixed(2)}%
          </span>
        </div>
      )}

      {/* Position Filter */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Paper Trades</h2>
        <div className="flex gap-2">
          {['all', 'open', 'closed'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-sm transition ${
                filter === f ? 'bg-[var(--accent-blue)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-white'
              }`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* Positions List */}
      {positions.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center">
          <p className="text-[var(--text-secondary)]">No paper trades yet. The bot runs every ~10 minutes and will create trades automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((t, i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{t.market_question}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-[var(--text-secondary)]">
                    <span>Entry: <span className="text-white">{Number(t.entry_price).toFixed(4)}</span></span>
                    {t.current_price && <span>Current: <span className="text-white">{Number(t.current_price).toFixed(4)}</span></span>}
                    <span>Confidence: <span className="text-white">{(Number(t.ai_confidence) * 100).toFixed(0)}%</span></span>
                    <span className={`font-semibold ${
                      t.status === 'open' ? 'text-[var(--accent-blue)]' : t.outcome === 'win' ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'
                    }`}>{t.status === 'open' ? '● OPEN' : t.outcome?.toUpperCase()}</span>
                    {t.ai_verified === false && <span className="text-yellow-500">⚠ Rule-based</span>}
                  </div>
                  {t.ai_reasoning && (
                    <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2">{t.ai_reasoning}</p>
                  )}
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {new Date(t.created_at).toLocaleString()}
                  </p>
                </div>
                {t.profit_pct != null && (
                  <div className="text-right ml-4">
                    <span className={`text-lg font-mono font-bold ${Number(t.profit_pct) >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                      {Number(t.profit_pct) >= 0 ? '+' : ''}{Number(t.profit_pct).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, subtitle, color }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-4">
      <p className="text-[var(--text-secondary)] text-sm">{label}</p>
      <p className={`text-2xl font-bold ${color || ''}`}>{value}</p>
      {subtitle && <p className="text-xs text-[var(--text-secondary)] mt-1">{subtitle}</p>}
    </div>
  )
}

/* ============ LIVE TRADING ============ */

function LiveLoginPrompt() {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center">
      <h2 className="text-xl font-bold mb-2">Live Trading Requires Authentication</h2>
      <p className="text-[var(--text-secondary)] mb-6">Sign in and connect your Polymarket wallet to start live trading.</p>
      <a href="/dashboard" className="bg-[var(--accent-blue)] text-white px-6 py-2 rounded-lg font-semibold">Sign In</a>
    </div>
  )
}

function LiveTradingView() {
  const [activeTab, setActiveTab] = useState('Wallet')
  const TABS = ['Wallet', 'Positions', 'Risk Settings', 'Trade History']

  return (
    <div>
      {/* Live Trading Banner */}
      <div className="bg-green-900/20 border border-green-700 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">💰</span>
          <span className="font-semibold text-green-400">Live Trading Mode</span>
        </div>
        <p className="text-sm text-green-200/70">Real money. Real trades on Polymarket. Make sure you understand the risks.</p>
      </div>

      {/* Tabs */}
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
    e.preventDefault()
    setSaving(true); setMsg('')
    const { data, error } = await setupWallet(form)
    setSaving(false)
    if (error) { setMsg(`Error: ${error}`); return }
    setMsg(data.connection_tested ? 'Wallet saved & connection verified!' : 'Wallet saved (connection test failed — check credentials)')
    setWallet({ configured: true, is_active: true })
    setForm({ api_key: '', api_secret: '', api_passphrase: '', private_key: '' })
  }

  async function handleDelete() {
    if (!confirm('Delete wallet? This will disable auto-trading.')) return
    await deleteWallet()
    setWallet({ configured: false })
    setMsg('Wallet deleted')
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-6">
      <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
        <p className="text-yellow-400 text-sm font-semibold">⚠️ Security Warning</p>
        <p className="text-yellow-200/70 text-sm mt-1">Your credentials are encrypted at rest. Never share your private key. You can delete your wallet at any time.</p>
      </div>

      {wallet?.configured ? (
        <div>
          <p className="text-[var(--accent-green)] font-semibold mb-2">✓ Wallet Configured</p>
          <p className="text-[var(--text-secondary)] text-sm mb-4">Connected since {wallet.created_at ? new Date(wallet.created_at).toLocaleDateString() : 'recently'}</p>
          <button onClick={handleDelete} className="bg-red-600/20 text-red-400 px-4 py-2 rounded-lg text-sm hover:bg-red-600/30 transition">Delete Wallet</button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <p className="text-[var(--text-secondary)] text-sm mb-4">Get your API credentials from Polymarket → Settings → Builder Profile and API.</p>
          {['api_key', 'api_secret', 'api_passphrase', 'private_key'].map(field => (
            <div key={field}>
              <label className="text-sm text-[var(--text-secondary)] block mb-1">{field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</label>
              <input type="password" value={form[field]} onChange={e => setForm({...form, [field]: e.target.value})} required
                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-gray-700 text-white focus:outline-none focus:border-[var(--accent-blue)]" />
            </div>
          ))}
          <button type="submit" disabled={saving}
            className="bg-[var(--accent-blue)] text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Save & Test Connection'}
          </button>
        </form>
      )}
      {msg && <p className="text-sm mt-4 text-[var(--text-secondary)]">{msg}</p>}
    </div>
  )
}

function LivePositionsTab() {
  const [positions, setPositions] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    getPositions(filter).then(r => { if (r.data) setPositions(r.data.positions || []) })
  }, [filter])

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-6">
      <div className="flex gap-2 mb-4">
        {['all', 'open', 'closed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm ${filter === f ? 'bg-[var(--accent-blue)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {positions.length === 0 ? (
        <p className="text-[var(--text-secondary)]">No live positions yet. Set up your wallet and enable auto-trading in Risk Settings.</p>
      ) : (
        <div className="space-y-3">
          {positions.map((p, i) => (
            <div key={i} className="bg-[var(--bg-secondary)] p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{p.market_question}</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    {p.side} @ {Number(p.entry_price).toFixed(4)} · Size: ${Number(p.size).toFixed(2)}
                    <span className={`ml-2 font-semibold ${p.status === 'open' ? 'text-[var(--accent-blue)]' : (Number(p.pnl) >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]')}`}>
                      {p.status.toUpperCase()}
                    </span>
                  </p>
                </div>
                {p.pnl != null && (
                  <span className={`font-mono font-bold ${Number(p.pnl) >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                    ${Number(p.pnl) >= 0 ? '+' : ''}{Number(p.pnl).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RiskTab() {
  const [settings, setSettings] = useState({ max_position_size: 50, max_open_positions: 5, max_daily_loss: 100, auto_trade_enabled: false })
  const [msg, setMsg] = useState('')

  useEffect(() => { getRiskSettings().then(r => { if (r.data) setSettings(r.data) }) }, [])

  async function handleSave() {
    const { error } = await updateRiskSettings({
      max_position_size: settings.max_position_size,
      max_open_positions: settings.max_open_positions,
      max_daily_loss: settings.max_daily_loss,
    })
    setMsg(error || 'Settings saved!')
  }

  async function toggleTrading() {
    const action = settings.auto_trade_enabled ? disableTrading : enableTrading
    const { data, error } = await action()
    if (error) { setMsg(`Error: ${error}`); return }
    setSettings(s => ({ ...s, auto_trade_enabled: !s.auto_trade_enabled }))
    setMsg(settings.auto_trade_enabled ? 'Auto-trading disabled' : 'Auto-trading enabled!')
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-6">
      <div className={`p-4 rounded-lg mb-6 flex justify-between items-center ${settings.auto_trade_enabled ? 'bg-green-900/20 border border-green-700' : 'bg-[var(--bg-secondary)]'}`}>
        <div>
          <p className="font-semibold">{settings.auto_trade_enabled ? '🟢 Live Auto-Trading Active' : '⏸ Live Auto-Trading Disabled'}</p>
          <p className="text-sm text-[var(--text-secondary)]">{settings.auto_trade_enabled ? 'Bot executes real trades every ~10 minutes' : 'Enable to start live trading with real USDC'}</p>
        </div>
        <button onClick={toggleTrading}
          className={`px-4 py-2 rounded-lg font-semibold text-sm ${settings.auto_trade_enabled ? 'bg-red-600 text-white' : 'bg-[var(--accent-green)] text-black'}`}>
          {settings.auto_trade_enabled ? 'Disable' : 'Enable'}
        </button>
      </div>

      <div className="space-y-4">
        {[
          { key: 'max_position_size', label: 'Max Position Size (USDC)', type: 'number' },
          { key: 'max_open_positions', label: 'Max Open Positions', type: 'number' },
          { key: 'max_daily_loss', label: 'Max Daily Loss (USDC)', type: 'number' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="text-sm text-[var(--text-secondary)] block mb-1">{label}</label>
            <input type="number" value={settings[key]} onChange={e => setSettings({...settings, [key]: Number(e.target.value)})}
              className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-gray-700 text-white focus:outline-none focus:border-[var(--accent-blue)]" />
          </div>
        ))}
        <button onClick={handleSave} className="bg-[var(--accent-blue)] text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition">Save Settings</button>
      </div>
      {msg && <p className="text-sm mt-4 text-[var(--text-secondary)]">{msg}</p>}
    </div>
  )
}

function HistoryTab() {
  const [trades, setTrades] = useState([])

  useEffect(() => { getTradeHistory().then(r => { if (r.data) setTrades(r.data.trades || []) }) }, [])

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-6">
      {trades.length === 0 ? (
        <p className="text-[var(--text-secondary)]">No live trades executed yet. Enable auto-trading to start.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--text-secondary)] border-b border-gray-800">
                <th className="text-left pb-2">Date</th>
                <th className="text-left pb-2">Action</th>
                <th className="text-left pb-2">Market</th>
                <th className="text-right pb-2">Price</th>
                <th className="text-right pb-2">Size</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                  <td className="py-2">{new Date(t.executed_at).toLocaleString()}</td>
                  <td className={`py-2 font-semibold ${t.action === 'buy' ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                    {t.action.toUpperCase()}
                  </td>
                  <td className="py-2 max-w-xs truncate">{t.market_id}</td>
                  <td className="py-2 text-right">{Number(t.price).toFixed(4)}</td>
                  <td className="py-2 text-right">${Number(t.size).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
