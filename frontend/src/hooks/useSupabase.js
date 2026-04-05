import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { fetchProof } from '../lib/api'

const POLL_INTERVAL = 30000 // 30 seconds
const MAX_ITEMS = 20

// Columns safe to expose from paper_trades (client-side filter)
const PUBLIC_COLUMNS = [
  'market_question', 'entry_price', 'current_price',
  'status', 'outcome', 'profit_pct', 'ai_confidence',
  'ai_verified', 'entry_date', 'exit_date'
]

function filterColumns(row) {
  const filtered = {}
  for (const col of PUBLIC_COLUMNS) {
    if (col in row) filtered[col] = row[col]
  }
  return filtered
}

export function useRealtimeTrades() {
  const [trades, setTrades] = useState([])
  const [connectionMode, setConnectionMode] = useState('offline') // realtime | polling | offline
  const pollRef = useRef(null)
  const channelRef = useRef(null)

  const startPolling = useCallback(() => {
    if (pollRef.current) return
    setConnectionMode('polling')

    const poll = async () => {
      const { data } = await fetchProof()
      if (data?.paper_trades) {
        setTrades(data.paper_trades.slice(0, MAX_ITEMS))
      }
    }

    poll() // immediate first fetch
    pollRef.current = setInterval(poll, POLL_INTERVAL)
  }, [])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => {
    // Initial data load
    fetchProof().then(({ data }) => {
      if (data?.paper_trades) {
        setTrades(data.paper_trades.slice(0, MAX_ITEMS))
      }
    })

    if (!supabase) {
      startPolling()
      return
    }

    // Subscribe to paper_trades TABLE (not view - Realtime needs WAL events)
    const channel = supabase
      .channel('paper_trades_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'paper_trades' },
        (payload) => {
          const filtered = filterColumns(payload.new)
          setTrades(prev => [filtered, ...prev].slice(0, MAX_ITEMS))
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionMode('realtime')
          stopPolling()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          startPolling()
        }
      })

    channelRef.current = channel

    return () => {
      stopPolling()
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [startPolling, stopPolling])

  return { trades, connectionMode }
}
