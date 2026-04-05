import { useState, useEffect, useCallback } from 'react'
import { getSession } from '../lib/auth'
import {
  fetchMarkets, fetchMarketDetail, executePaperTrade,
  fetchPaperPositions, fetchPaperSummary,
} from '../lib/api'

// Trading components
import TradingNavbar from '../components/trading/TradingNavbar'
import CategoryBar from '../components/trading/CategoryBar'
import FeaturedMarket from '../components/trading/FeaturedMarket'
import BreakingNews from '../components/trading/BreakingNews'
import MarketGrid from '../components/trading/MarketGrid'
import MarketDetail from '../components/trading/MarketDetail'
import TopicPills from '../components/trading/TopicPills'
import Portfolio from '../components/trading/Portfolio'
import ActivityLog from '../components/trading/ActivityLog'

export default function Trading() {
  // Auth
  const [session, setSession] = useState(null)

  // Mode
  const [mode, setMode] = useState(() => localStorage.getItem('trading_mode') || 'paper')

  // View state
  const [view, setView] = useState('feed') // feed | detail | portfolio | activity
  const [selectedMarket, setSelectedMarket] = useState(null)

  // Data
  const [markets, setMarkets] = useState([])
  const [summary, setSummary] = useState(null)
  const [positions, setPositions] = useState([])
  const [loadingMarkets, setLoadingMarkets] = useState(true)

  // Filters
  const [category, setCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState(null)

  // Activity log (in-memory for session)
  const [activityLog, setActivityLog] = useState([])

  useEffect(() => {
    getSession().then(s => setSession(s))
  }, [])

  // Persist mode
  useEffect(() => {
    localStorage.setItem('trading_mode', mode)
  }, [mode])

  // Load data
  const loadData = useCallback(async () => {
    setLoadingMarkets(true)
    const [m, s, p] = await Promise.all([
      fetchMarkets(category === 'all' ? 'all' : category, 'volume', 50),
      fetchPaperSummary(),
      fetchPaperPositions('all'),
    ])
    if (m.data) setMarkets(m.data.markets || [])
    if (s.data) setSummary(s.data)
    if (p.data) setPositions(p.data.positions || [])
    setLoadingMarkets(false)
  }, [category])

  useEffect(() => { loadData() }, [loadData])

  // Filtered markets
  const filteredMarkets = markets.filter(m => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!m.question.toLowerCase().includes(q)) return false
    }
    if (topicFilter) {
      if (!m.question.toLowerCase().includes(topicFilter.toLowerCase())) return false
    }
    return true
  })

  // Extract topics from market questions
  const topics = [...new Set(
    markets.flatMap(m => {
      const words = m.question.split(/\s+/)
      return words.filter(w => w.length > 3 && w[0] === w[0].toUpperCase() && w !== 'Will' && w !== 'What' && w !== 'When' && w !== 'Does' && w !== 'Have')
    })
  )].slice(0, 15)

  // Featured market = highest volume
  const featuredMarket = markets[0]
  const gridMarkets = filteredMarkets.slice(1)

  // Handlers
  async function handleSelectMarket(market) {
    // Fetch full details
    const { data } = await fetchMarketDetail(market.id)
    setSelectedMarket(data || market)
    setView('detail')
  }

  async function handleTrade(marketId, side, amount) {
    const { data, error } = await executePaperTrade(marketId, side, amount)
    if (error) {
      setActivityLog(prev => [{ time: new Date(), type: 'error', msg: error }, ...prev])
      return
    }
    const tradeMsg = `${side} ${data.trade?.market?.slice(0, 50)}... @ ${data.trade?.entry_price} ($${amount})`
    setActivityLog(prev => [{ time: new Date(), type: 'trade', msg: tradeMsg }, ...prev])
    loadData() // Refresh positions + summary
  }

  function handleBack() {
    setSelectedMarket(null)
    setView('feed')
  }

  // Related markets (same category, different from selected)
  const relatedMarkets = selectedMarket
    ? markets.filter(m => m.id !== selectedMarket.id && m.category === selectedMarket.category).slice(0, 5)
    : []

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <TradingNavbar
        mode={mode}
        onModeChange={setMode}
        balance={summary?.current_balance}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <CategoryBar active={category} onChange={(c) => { setCategory(c); setTopicFilter(null) }} />

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Tab navigation */}
        {view !== 'detail' && (
          <div className="flex gap-4 mb-4 border-b border-gray-800">
            {[
              { key: 'feed', label: 'Markets', count: filteredMarkets.length },
              { key: 'portfolio', label: 'Portfolio', count: positions.filter(p => p.status === 'open').length },
              { key: 'activity', label: 'Activity', count: activityLog.length },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setView(t.key)}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition ${
                  view === t.key
                    ? 'border-white text-white'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className="ml-1.5 text-xs bg-[var(--bg-card)] px-1.5 py-0.5 rounded">{t.count}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Market Detail View */}
        {view === 'detail' && selectedMarket && (
          <MarketDetail
            market={selectedMarket}
            relatedMarkets={relatedMarkets}
            mode={mode}
            onBack={handleBack}
            onTrade={handleTrade}
            onSelectRelated={handleSelectMarket}
          />
        )}

        {/* Market Feed View */}
        {view === 'feed' && (
          <div className="flex gap-6">
            {/* Main feed */}
            <div className="flex-1 min-w-0">
              {/* Featured Market */}
              {featuredMarket && !searchQuery && !topicFilter && (
                <div className="mb-4">
                  <FeaturedMarket market={featuredMarket} onClick={handleSelectMarket} />
                </div>
              )}

              {/* Topic pills */}
              {topics.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-[var(--text-secondary)]">All markets</h3>
                    <span className="text-xs text-[var(--text-secondary)]">{filteredMarkets.length} markets</span>
                  </div>
                  <TopicPills topics={topics} active={topicFilter} onChange={setTopicFilter} />
                </div>
              )}

              {/* Market Grid */}
              <MarketGrid
                markets={gridMarkets}
                loading={loadingMarkets}
                onSelectMarket={handleSelectMarket}
              />
            </div>

            {/* Sidebar */}
            <div className="w-72 shrink-0 hidden lg:block">
              <BreakingNews
                markets={markets}
                summary={summary}
                onSelectMarket={handleSelectMarket}
              />
            </div>
          </div>
        )}

        {/* Portfolio View */}
        {view === 'portfolio' && (
          <Portfolio positions={positions} />
        )}

        {/* Activity Log View */}
        {view === 'activity' && (
          <ActivityLog log={activityLog} />
        )}
      </div>
    </div>
  )
}
