"""Signals endpoint - public with tier gating."""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Query, Request
from backend.services.supabase_client import get_supabase
from backend.services.cache import cache_get, cache_set
from backend.services.rate_limiter import limiter

router = APIRouter()

SIGNALS_CACHE_TTL = 60  # 1 minute
FREE_SIGNAL_LIMIT = 3
PRO_SIGNAL_LIMIT = 20


@router.get("/signals")
@limiter.limit("30/minute")
def get_signals(request: Request, tier: str = Query("free", regex="^(free|pro|premium)$")):
    """Returns latest signals. Free=3, Pro=20, Premium=all."""
    cache_key = f"v1:signals:{tier}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    supabase = get_supabase()

    # Exclude expired signals (older than 24h)
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

    # Use view for public access
    query = supabase.from_("v_signals_public").select("*").gte("created_at", cutoff).order("created_at", desc=True)

    if tier == "free":
        query = query.limit(FREE_SIGNAL_LIMIT)
    elif tier == "pro":
        query = query.limit(PRO_SIGNAL_LIMIT)
    # premium: no limit (but still capped by what exists)

    result = query.execute()

    signals = result.data or []

    # For free tier, redact reasoning
    if tier == "free":
        for s in signals:
            s.pop("reasoning", None)

    response = {
        "signals": signals,
        "tier": tier,
        "count": len(signals),
    }

    cache_set(cache_key, response, SIGNALS_CACHE_TTL)
    return response
