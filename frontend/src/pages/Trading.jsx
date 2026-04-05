import { useState, useEffect } from 'react'
import { getSession } from '../lib/auth'
import {
  setupWallet, getWalletStatus, deleteWallet,
  getPositions, getTradeHistory,
  getRiskSettings, updateRiskSettings,
  enableTrading, disableTrading,
} from '../lib/api'
import Navbar from '../components/Navbar'

const TABS = ['Wallet', 'Positions', 'Risk Settings', 'Trade History']

export default function Trading() {
  const [session, setSession] = useState(null)
  const [activeTab, setActiveTab] = useState('Wallet')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSession().then(s => { setSession(s); setLoading(false) })
  }, [])

  if (loading) return <div className="min-h-screen bg-[var(--bg-primary)]"><Navbar /><div className="max-w-4xl mx-auto p-8"><div className="bg-[var(--bg-card)] rounded-xl h-64 animate-pulse" /></div></div>

  if (!session) return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar />
      <div className="max-w-md mx-auto p-8 mt-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Auto-Trading</h1>
        <p className="text-[var(--text-secondary)] mb-6">Sign in to access auto-trading features.</p>
        <a href="/dashboard" className="bg-[var(--accent-blue)] text-white px-6 py-2 rounded-lg font-semibold">Sign In</a>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar />
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Auto-Trading</h1>

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
        {activeTab === 'Positions' && <PositionsTab />}
        {activeTab === 'Risk Settings' && <RiskTab />}
        {activeTab === 'Trade History' && <HistoryTab />}
      </div>
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
        <p className="text-yellow-400 text-sm font-semibold">Security Warning</p>
        <p className="text-yellow-200/70 text-sm mt-1">Your credentials are encrypted at rest. Never share your private key. You can delete your wallet at any time.</p>
      </div>

      {wallet?.configured ? (
        <div>
          <p className="text-[var(--accent-green)] font-semibold mb-2">Wallet Configured</p>
          <p className="text-[var(--text-secondary)] text-sm mb-4">Connected since {new Date(wallet.created_at).toLocaleDateString()}</p>
          <button onClick={handleDelete} className="bg-red-600/20 text-red-400 px-4 py-2 rounded-lg text-sm hover:bg-red-600/30 transition">Delete Wallet</button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <p className="text-[var(--text-secondary)] text-sm mb-4">Get your API credentials from <a href="https://polymarket.com" target="_blank" className="text-[var(--accent-blue)]">Polymarket CLOB API</a>.</p>
          {['api_key', 'api_secret', 'api_passphrase', 'private_key'].map(field => (
            <div key={field}>
              <label className="text-sm text-[var(--text-secondary)] block mb-1">{field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</label>
              <input type="password" value={form[field]} onChange={e => setForm({...form, [field]: e.target.value})} required
                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-gray-700 text-white focus:outline-none focus:border-[var(--accent-blue)]"
              />
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

function PositionsTab() {
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
        <p className="text-[var(--text-secondary)]">No positions yet. Enable auto-trading to start.</p>
      ) : (
        <div className="space-y-3">
          {positions.map((p, i) => (
            <div key={i} className="bg-[var(--bg-secondary)] p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{p.market_question}</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    {p.side} @ {Number(p.entry_price).toFixed(4)} · Size: ${Number(p.size).toFixed(2)}
                    <span className={`ml-2 font-semibold ${p.status === 'open' ? 'text-[var(--accent-blue)]' : p.status === 'closed' ? (Number(p.pnl) >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]') : 'text-[var(--text-secondary)]'}`}>
                      {p.status.toUpperCase()}
                    </span>
                  </p>
                </div>
                {p.pnl !== null && p.pnl !== undefined && (
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
      {/* Master Toggle */}
      <div className={`p-4 rounded-lg mb-6 flex justify-between items-center ${settings.auto_trade_enabled ? 'bg-green-900/20 border border-green-700' : 'bg-[var(--bg-secondary)]'}`}>
        <div>
          <p className="font-semibold">{settings.auto_trade_enabled ? 'Auto-Trading Active' : 'Auto-Trading Disabled'}</p>
          <p className="text-sm text-[var(--text-secondary)]">{settings.auto_trade_enabled ? 'Bot will execute trades every ~10 minutes' : 'Enable to start auto-trading'}</p>
        </div>
        <button onClick={toggleTrading}
          className={`px-4 py-2 rounded-lg font-semibold text-sm ${settings.auto_trade_enabled ? 'bg-red-600 text-white' : 'bg-[var(--accent-green)] text-black'}`}>
          {settings.auto_trade_enabled ? 'Disable' : 'Enable'}
        </button>
      </div>

      {/* Risk Parameters */}
      <div className="space-y-4">
        <div>
          <label className="text-sm text-[var(--text-secondary)] block mb-1">Max Position Size (USDC)</label>
          <input type="number" value={settings.max_position_size} onChange={e => setSettings({...settings, max_position_size: Number(e.target.value)})}
            className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-gray-700 text-white focus:outline-none focus:border-[var(--accent-blue)]" />
        </div>
        <div>
          <label className="text-sm text-[var(--text-secondary)] block mb-1">Max Open Positions</label>
          <input type="number" value={settings.max_open_positions} onChange={e => setSettings({...settings, max_open_positions: Number(e.target.value)})}
            className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-gray-700 text-white focus:outline-none focus:border-[var(--accent-blue)]" />
        </div>
        <div>
          <label className="text-sm text-[var(--text-secondary)] block mb-1">Max Daily Loss (USDC)</label>
          <input type="number" value={settings.max_daily_loss} onChange={e => setSettings({...settings, max_daily_loss: Number(e.target.value)})}
            className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-gray-700 text-white focus:outline-none focus:border-[var(--accent-blue)]" />
        </div>
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
        <p className="text-[var(--text-secondary)]">No trades executed yet.</p>
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
                  <td className={`py-2 font-semibold ${t.action === 'buy' ? 'text-[var(--accent-green)]' : t.action === 'sell' ? 'text-[var(--accent-red)]' : 'text-[var(--text-secondary)]'}`}>
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
