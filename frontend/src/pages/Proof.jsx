import { useState, useEffect } from 'react'
import { fetchProof, fetchAnalytics } from '../lib/api'
import { useRealtimeTrades } from '../hooks/useSupabase'
import PnLChart from '../components/PnLChart'
import WinRate from '../components/WinRate'
import SignalFeed from '../components/SignalFeed'

export default function Proof() {
  const [proofData, setProofData] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const { trades: liveTrades, connectionMode } = useRealtimeTrades()

  useEffect(() => {
    async function load() {
      const [proof, stats] = await Promise.all([fetchProof(), fetchAnalytics()])
      if (proof.data) setProofData(proof.data)
      if (stats.data) setAnalytics(stats.data)
      setLoading(false)
    }
    load()
  }, [])

  const backtestStats = analytics?.backtest?.all_time || {}
  const wins = Math.round((backtestStats.win_rate || 0) / 100 * (backtestStats.total_trades || 0))
  const losses = (backtestStats.total_trades || 0) - wins

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Performance Proof</h1>
          <div className="grid gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="bg-[var(--bg-card)] rounded-xl h-64 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Performance Proof</h1>
        <p className="text-[var(--text-secondary)] mb-8">
          Real backtest data from 90+ days of Polymarket history. Updated approximately every 5-15 minutes.
        </p>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Trades', value: backtestStats.total_trades || 0 },
            { label: 'Win Rate', value: `${(backtestStats.win_rate || 0).toFixed(1)}%`, color: 'text-[var(--accent-green)]' },
            { label: 'Total Profit', value: `${(backtestStats.total_profit_pct || 0).toFixed(1)}%`, color: 'text-[var(--accent-green)]' },
            { label: 'Avg Profit', value: `${(backtestStats.avg_profit_pct || 0).toFixed(1)}%` },
            { label: 'Max Drawdown', value: `${(backtestStats.max_drawdown_pct || 0).toFixed(1)}%`, color: 'text-[var(--accent-red)]' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[var(--bg-card)] rounded-xl p-4 text-center">
              <p className="text-[var(--text-secondary)] text-sm">{label}</p>
              <p className={`text-2xl font-bold ${color || ''}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2">
            <PnLChart trades={proofData?.backtest_trades || []} />
          </div>
          <WinRate wins={wins} losses={losses} />
        </div>

        {/* Live Feed */}
        <SignalFeed trades={liveTrades} connectionMode={connectionMode} />
      </div>
    </div>
  )
}
