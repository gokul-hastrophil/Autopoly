import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { pathname } = useLocation()

  const links = [
    { to: '/', label: 'Home' },
    { to: '/proof', label: 'Proof' },
    { to: '/dashboard', label: 'Dashboard' },
  ]

  return (
    <nav className="border-b border-gray-800 bg-[var(--bg-primary)] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold">
          <span className="text-[var(--accent-blue)]">Auto</span>poly
        </Link>
        <div className="flex gap-6">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`text-sm font-medium transition ${
                pathname === to ? 'text-white' : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
