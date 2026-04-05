const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function fetchJSON(path) {
  try {
    const res = await fetch(`${API_URL}${path}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { data: await res.json(), error: null }
  } catch (e) {
    return { data: null, error: e.message }
  }
}

export const fetchAnalytics = () => fetchJSON('/api/analytics')
export const fetchProof = () => fetchJSON('/api/proof')
export const fetchSignals = (tier = 'free') => fetchJSON(`/api/signals?tier=${tier}`)

// Authenticated fetch helper
async function fetchWithAuth(path, options = {}) {
  const { getAccessToken } = await import('./auth')
  const token = await getAccessToken()
  if (!token) return { data: null, error: 'Not authenticated' }
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `HTTP ${res.status}`)
    }
    return { data: await res.json(), error: null }
  } catch (e) {
    return { data: null, error: e.message }
  }
}

// Wallet
export const setupWallet = (data) => fetchWithAuth('/api/wallet/setup', { method: 'POST', body: JSON.stringify(data) })
export const getWalletStatus = () => fetchWithAuth('/api/wallet/status')
export const deleteWallet = () => fetchWithAuth('/api/wallet/delete', { method: 'POST' })

// Positions
export const getPositions = (status = 'all') => fetchWithAuth(`/api/positions?status=${status}`)
export const getTradeHistory = (limit = 50, offset = 0) => fetchWithAuth(`/api/positions/history?limit=${limit}&offset=${offset}`)

// Risk
export const getRiskSettings = () => fetchWithAuth('/api/risk/settings')
export const updateRiskSettings = (data) => fetchWithAuth('/api/risk/settings', { method: 'POST', body: JSON.stringify(data) })

// Trading control
export const enableTrading = () => fetchWithAuth('/api/trading/enable', { method: 'POST' })
export const disableTrading = () => fetchWithAuth('/api/trading/disable', { method: 'POST' })
