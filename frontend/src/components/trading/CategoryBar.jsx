const CATEGORIES = [
  { key: 'all', label: '← Trending' },
  { key: 'new', label: 'New' },
  { key: 'politics', label: 'Politics' },
  { key: 'sports', label: 'Sports' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'esports', label: 'Esports' },
  { key: 'tech', label: 'Tech' },
  { key: 'culture', label: 'Culture' },
  { key: 'business', label: 'Business' },
  { key: 'science', label: 'Science' },
]

export default function CategoryBar({ active, onChange }) {
  return (
    <div className="border-b border-gray-800 overflow-x-auto scrollbar-hide">
      <div className="max-w-7xl mx-auto px-4 flex gap-1 py-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => onChange(cat.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              active === cat.key
                ? 'bg-[var(--accent-blue)] text-white'
                : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  )
}
