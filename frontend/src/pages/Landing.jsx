import { useState, useEffect } from 'react'
import { fetchAnalytics } from '../lib/api'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AnimatedCounter from '../components/AnimatedCounter'
import PricingCards from '../components/PricingCards'

export default function Landing() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchAnalytics().then(({ data }) => {
      if (data?.backtest?.all_time) setStats(data.backtest.all_time)
    })
  }, [])

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
          AI-Powered Polymarket Signals,
          <br />
          <span className="text-[var(--accent-blue)]">Backed by Proof</span>
        </h1>
        <p className="text-xl text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto">
          Real-time trading signals verified by AI and backed by auditable performance data.
          See the results before you subscribe.
        </p>
        <div className="flex gap-4 justify-center">
          <a href="/proof" className="bg-[var(--accent-blue)] text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition">
            See the Proof
          </a>
          <a href="#pricing" className="bg-[var(--bg-card)] text-white px-8 py-3 rounded-lg font-semibold hover:bg-opacity-80 transition">
            View Pricing
          </a>
        </div>
      </section>

      {/* Live Stats Bar */}
      {stats && (
        <section className="bg-[var(--bg-secondary)] py-8">
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold">
                <AnimatedCounter end={stats.total_trades || 0} decimals={0} />
              </p>
              <p className="text-[var(--text-secondary)] text-sm">Total Trades</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[var(--accent-green)]">
                <AnimatedCounter end={stats.win_rate || 0} suffix="%" decimals={1} />
              </p>
              <p className="text-[var(--text-secondary)] text-sm">Win Rate</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[var(--accent-green)]">
                <AnimatedCounter end={stats.total_profit_pct || 0} prefix="+" suffix="%" decimals={1} />
              </p>
              <p className="text-[var(--text-secondary)] text-sm">Total Profit</p>
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '1', title: 'AI Scans Markets', desc: 'Our bot scans every Polymarket event every 5-15 minutes, identifying high-probability outcomes using AI analysis.' },
            { step: '2', title: 'Signals Delivered', desc: 'Get actionable signals with AI confidence scores, reasoning, and entry prices delivered to your dashboard and Telegram.' },
            { step: '3', title: 'Verified Performance', desc: 'Every signal is tracked. See real P&L curves, win rates, and paper trading results on our public proof page.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="bg-[var(--bg-card)] rounded-xl p-6 text-center">
              <div className="w-10 h-10 bg-[var(--accent-blue)] bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-[var(--accent-blue)] font-bold">{step}</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-[var(--text-secondary)] text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Simple Pricing</h2>
        <p className="text-[var(--text-secondary)] text-center mb-12">Start free. Upgrade when you're convinced.</p>
        <PricingCards />
      </section>

      {/* CTA */}
      <section className="bg-[var(--bg-secondary)] py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Don't Take Our Word For It</h2>
        <p className="text-[var(--text-secondary)] mb-8">See 90+ days of verified backtest results and live paper trading data.</p>
        <a href="/proof" className="bg-[var(--accent-green)] text-black px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition">
          See the Proof &#8594;
        </a>
      </section>

      <Footer />
    </div>
  )
}
