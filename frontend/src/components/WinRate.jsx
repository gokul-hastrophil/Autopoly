import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'

ChartJS.register(ArcElement, Tooltip)

export default function WinRate({ wins = 0, losses = 0 }) {
  const total = wins + losses
  const rate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0'

  const data = {
    labels: ['Wins', 'Losses'],
    datasets: [{
      data: [wins, losses],
      backgroundColor: ['#00d68f', '#ff4d6a'],
      borderWidth: 0,
      cutout: '75%',
    }]
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-6 flex flex-col items-center">
      <h3 className="text-lg font-semibold mb-4">Win Rate</h3>
      <div className="relative w-40 h-40">
        <Doughnut data={data} options={{ plugins: { legend: { display: false } } }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-[var(--accent-green)]">{rate}%</span>
        </div>
      </div>
      <p className="text-[var(--text-secondary)] mt-2">{wins}W / {losses}L ({total} trades)</p>
    </div>
  )
}
