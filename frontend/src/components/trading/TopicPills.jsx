export default function TopicPills({ topics, active, onChange }) {
  if (!topics.length) return null

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2">
      {topics.map(topic => (
        <button
          key={topic}
          onClick={() => onChange(active === topic ? null : topic)}
          className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition ${
            active === topic
              ? 'border-[var(--accent-blue)] text-[var(--accent-blue)] bg-[var(--accent-blue)]/10'
              : 'border-gray-700 text-[var(--text-secondary)] hover:text-white hover:border-gray-500'
          }`}
        >
          {topic}
        </button>
      ))}
    </div>
  )
}
