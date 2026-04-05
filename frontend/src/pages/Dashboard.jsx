import { useState, useEffect } from 'react'
import { getSession, getAccessToken, signInWithMagicLink, signOut } from '../lib/auth'
import Navbar from '../components/Navbar'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Dashboard() {
  const [session, setSession] = useState(null)
  const [dashData, setDashData] = useState(null)
  const [email, setEmail] = useState('')
  const [chatId, setChatId] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSession().then(s => {
      setSession(s)
      setLoading(false)
      if (s) loadDashboard(s.access_token)
    })
  }, [])

  async function loadDashboard(token) {
    try {
      const res = await fetch(`${API_URL}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setDashData(await res.json())
    } catch (e) {
      console.error('Dashboard load error:', e)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setMessage('Check your email for the magic link!')
    const { error } = await signInWithMagicLink(email)
    if (error) setMessage(`Error: ${error}`)
  }

  async function handleLogout() {
    await signOut()
    setSession(null)
    setDashData(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <Navbar />
        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-[var(--bg-card)] rounded-xl h-64 animate-pulse" />
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <Navbar />
        <div className="max-w-md mx-auto p-8 mt-20">
          <div className="bg-[var(--bg-card)] rounded-xl p-8">
            <h1 className="text-2xl font-bold mb-4">Sign In</h1>
            <p className="text-[var(--text-secondary)] mb-6">Enter your email to receive a magic link.</p>
            <form onSubmit={handleLogin}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-gray-700 text-white mb-4 focus:outline-none focus:border-[var(--accent-blue)]"
                required
              />
              <button type="submit" className="w-full bg-[var(--accent-blue)] text-white py-2 rounded-lg font-semibold hover:opacity-90 transition">
                Send Magic Link
              </button>
            </form>
            {message && <p className="text-sm text-[var(--text-secondary)] mt-4">{message}</p>}
            <p className="text-sm text-[var(--text-secondary)] mt-6">
              Don't have an account? <a href="/#pricing" className="text-[var(--accent-blue)]">View pricing</a> to subscribe first.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const subscriber = dashData?.subscriber || {}
  const signals = dashData?.signals || []

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar />
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-[var(--text-secondary)]">{subscriber.email} · <span className="capitalize font-semibold text-[var(--accent-blue)]">{subscriber.tier}</span></p>
          </div>
          <button onClick={handleLogout} className="text-sm text-[var(--text-secondary)] hover:text-white transition">
            Sign Out
          </button>
        </div>

        {/* Telegram Setup */}
        <div className="bg-[var(--bg-card)] rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">Telegram Alerts</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            1. Message <code className="bg-[var(--bg-secondary)] px-1 rounded">@AutopolyBot</code> on Telegram with <code className="bg-[var(--bg-secondary)] px-1 rounded">/start</code>
            <br />
            2. Enter your Chat ID below to enable alerts.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={chatId || subscriber.telegram_chat_id || ''}
              onChange={e => setChatId(e.target.value)}
              placeholder="Your Telegram Chat ID"
              className="flex-1 px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-gray-700 text-white focus:outline-none focus:border-[var(--accent-blue)]"
            />
            <button className="bg-[var(--accent-blue)] text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition">
              Save
            </button>
          </div>
        </div>

        {/* Signals */}
        <div className="bg-[var(--bg-card)] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Your Signals ({signals.length})</h2>
          {signals.length === 0 ? (
            <p className="text-[var(--text-secondary)]">No signals yet. Check back soon!</p>
          ) : (
            <div className="space-y-3">
              {signals.map((s, i) => (
                <div key={i} className="bg-[var(--bg-secondary)] p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{s.market_question}</p>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">
                        {s.signal_type} · Price: {Number(s.current_price).toFixed(4)} · Confidence: {(Number(s.confidence) * 100).toFixed(0)}%
                        {s.ai_verified === false && <span className="text-yellow-500 ml-2">Rule-based</span>}
                      </p>
                      {s.reasoning && subscriber.tier !== 'free' && (
                        <p className="text-xs text-[var(--text-secondary)] mt-2">{s.reasoning}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
