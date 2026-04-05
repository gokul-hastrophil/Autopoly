import { Link } from 'react-router-dom'

export default function TradingNavbar({ mode, onModeChange, balance, searchQuery, onSearchChange }) {
  return (
    <nav className="bg-[#0f1117] border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="text-lg font-bold shrink-0">
          <span className="text-[var(--accent-blue)]">Auto</span>poly
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search markets..."
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-secondary)] rounded-full text-sm text-white placeholder-[var(--text-secondary)] border border-gray-700 focus:outline-none focus:border-[var(--accent-blue)]"
            />
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-[var(--bg-secondary)] rounded-full p-0.5 text-xs">
          <button
            onClick={() => onModeChange('paper')}
            className={`px-3 py-1.5 rounded-full font-medium transition ${
              mode === 'paper' ? 'bg-[var(--accent-blue)] text-white' : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >Paper</button>
          <button
            onClick={() => onModeChange('live')}
            className={`px-3 py-1.5 rounded-full font-medium transition ${
              mode === 'live' ? 'bg-[var(--accent-green)] text-black' : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >Live</button>
        </div>

        {/* Balance */}
        <div className="hidden md:flex items-center gap-3 text-sm">
          <div className="bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg">
            <span className="text-[var(--text-secondary)]">Portfolio </span>
            <span className="font-semibold">${typeof balance === 'number' ? balance.toLocaleString() : '10,000'}</span>
          </div>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-2">
          <Link to="/proof" className="text-xs text-[var(--text-secondary)] hover:text-white transition px-2 py-1">Proof</Link>
          <Link to="/dashboard" className="text-xs text-[var(--text-secondary)] hover:text-white transition px-2 py-1">Dashboard</Link>
        </div>
      </div>
    </nav>
  )
}
