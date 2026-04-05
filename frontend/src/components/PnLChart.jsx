import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip, Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

export default function PnLChart({ trades = [] }) {
  if (!trades.length) return <div className="h-64 bg-[var(--bg-card)] rounded-xl flex items-center justify-center text-[var(--text-secondary)]">Loading chart...</div>

  // Compute cumulative P&L
  const sorted = [...trades].sort((a, b) => new Date(a.exit_date) - new Date(b.exit_date))
  let cumulative = 0
  const dataPoints = sorted.map(t => {
    cumulative += (t.profit_pct || 0)
    return { date: new Date(t.exit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: cumulative }
  })

  const data = {
    labels: dataPoints.map(d => d.date),
    datasets: [{
      label: 'Cumulative P&L %',
      data: dataPoints.map(d => d.value),
      borderColor: '#00d68f',
      backgroundColor: 'rgba(0, 214, 143, 0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 2,
    }]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: {
      x: { ticks: { color: '#8b8fa3', maxTicksLimit: 8 }, grid: { display: false } },
      y: { ticks: { color: '#8b8fa3', callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,0.05)' } },
    },
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Cumulative P&L</h3>
      <div className="h-64"><Line data={data} options={options} /></div>
    </div>
  )
}
