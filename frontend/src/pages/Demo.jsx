import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

const STEPS = [
  { label: 'Landing Page', path: '/', duration: 4000, description: 'AI-powered prediction market signals with live performance data' },
  { label: 'Live Stats', path: '/', duration: 3000, description: 'Animated counters showing real-time win rate and P&L' },
  { label: 'Performance Proof', path: '/proof', duration: 5000, description: 'Auditable P&L curves from 90+ days of backtested data' },
  { label: 'Live Trading Feed', path: '/proof', duration: 4000, description: 'Real-time paper trades streaming via Supabase Realtime' },
  { label: 'Signal Dashboard', path: '/dashboard', duration: 4000, description: 'Tier-gated signals with AI confidence and reasoning' },
  { label: 'Telegram Alerts', path: '/dashboard', duration: 3000, description: 'Instant notifications for high-confidence signals' },
]

export default function Demo() {
  const [searchParams] = useSearchParams()
  const autoplay = searchParams.get('autoplay') === 'true'
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(autoplay)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!isPlaying) return

    timerRef.current = setTimeout(() => {
      setCurrentStep(prev => {
        if (prev >= STEPS.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, STEPS[currentStep].duration)

    return () => clearTimeout(timerRef.current)
  }, [isPlaying, currentStep])

  function restart() {
    setCurrentStep(0)
    setIsPlaying(true)
  }

  const step = STEPS[currentStep]

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {/* Progress bar */}
      <div className="flex gap-1 p-4">
        {STEPS.map((s, i) => (
          <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-[var(--bg-card)]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                i < currentStep ? 'bg-[var(--accent-green)] w-full'
                : i === currentStep ? 'bg-[var(--accent-blue)] animate-pulse w-full'
                : 'w-0'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl text-center">
          <div className="mb-4">
            <span className="text-sm text-[var(--accent-blue)] font-semibold">
              Step {currentStep + 1} of {STEPS.length}
            </span>
          </div>
          <h1 className="text-4xl font-bold mb-4">{step.label}</h1>
          <p className="text-xl text-[var(--text-secondary)] mb-8">{step.description}</p>
          <div className="bg-[var(--bg-card)] rounded-xl p-8 mb-8">
            <p className="text-[var(--text-secondary)] text-sm">
              Preview: <code className="text-[var(--accent-blue)]">{step.path}</code>
            </p>
            <div className="mt-4 h-48 bg-[var(--bg-secondary)] rounded-lg flex items-center justify-center">
              <span className="text-[var(--text-secondary)]">
                {isPlaying ? '▶ Playing...' : '⏸ Paused'}
              </span>
            </div>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="bg-[var(--accent-blue)] text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={restart}
              className="bg-[var(--bg-card)] text-white px-6 py-2 rounded-lg font-semibold hover:bg-opacity-80 transition"
            >
              Restart Demo
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 text-center text-sm text-[var(--text-secondary)]">
        Tip: Add <code>?autoplay=true</code> to the URL for hands-free demo recording
      </div>
    </div>
  )
}
