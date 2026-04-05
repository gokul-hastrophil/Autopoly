import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

export default function PriceChart({ yesPrice, noPrice }) {
  // Generate simulated price history for visual appeal
  const points = 50
  const generateHistory = (currentPrice) => {
    const data = []
    let price = currentPrice - 0.1 + Math.random() * 0.2
    for (let i = 0; i < points; i++) {
      price += (Math.random() - 0.48) * 0.02
      price = Math.max(0.01, Math.min(0.99, price))
      data.push(price)
    }
    data[points - 1] = currentPrice // End at current price
    return data
  }

  const yesHistory = generateHistory(yesPrice)

  const data = {
    labels: Array.from({ length: points }, (_, i) => ''),
    datasets: [
      {
        label: 'Yes',
        data: yesHistory.map(p => p * 100),
        borderColor: '#00d68f',
        backgroundColor: 'rgba(0, 214, 143, 0.05)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { display: false },
      y: {
        display: true,
        min: 0,
        max: 100,
        ticks: { color: '#8b8fa3', callback: v => v + '%', stepSize: 25 },
        grid: { color: 'rgba(255,255,255,0.03)' },
        border: { display: false },
      },
    },
  }

  return (
    <div className="relative">
      {/* Price labels overlay */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <span className="text-sm font-bold text-[var(--accent-green)] bg-[var(--bg-primary)]/80 px-2 py-0.5 rounded">
          {(yesPrice * 100).toFixed(1)}%
        </span>
        <span className="text-sm font-bold text-[var(--accent-red)] bg-[var(--bg-primary)]/80 px-2 py-0.5 rounded">
          {(noPrice * 100).toFixed(1)}%
        </span>
      </div>
      <div className="h-64">
        <Line data={data} options={options} />
      </div>
      {/* Time controls */}
      <div className="flex gap-1 mt-2">
        {['1H', '6H', '1D', '1W', '1M', 'ALL'].map((t, i) => (
          <button key={t} className={`px-2.5 py-1 rounded text-xs font-medium ${
            i === 4 ? 'bg-[var(--bg-secondary)] text-white' : 'text-[var(--text-secondary)] hover:text-white'
          }`}>{t}</button>
        ))}
      </div>
    </div>
  )
}
