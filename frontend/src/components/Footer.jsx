export default function Footer() {
  return (
    <footer className="border-t border-gray-800 mt-20">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center text-sm text-[var(--text-secondary)]">
        <p>&copy; {new Date().getFullYear()} Autopoly. AI-powered prediction market signals.</p>
        <div className="flex gap-4 mt-4 md:mt-0">
          <a href="/proof" className="hover:text-white transition">Proof</a>
          <a href="/dashboard" className="hover:text-white transition">Dashboard</a>
        </div>
      </div>
    </footer>
  )
}
