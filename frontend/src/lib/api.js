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
