"""Auth endpoints: magic link verify, subscribe via Stripe."""
import os
import jwt
import httpx
from fastapi import APIRouter, Depends, HTTPException, Header
from backend.services.supabase_client import get_supabase

router = APIRouter()

# JWKS cache
_jwks_cache = {"keys": None, "fetched_at": 0}
JWKS_CACHE_TTL = 3600  # 1 hour


def _get_jwks():
    """Fetch Supabase JWKS with caching."""
    import time
    now = time.time()
    if _jwks_cache["keys"] and (now - _jwks_cache["fetched_at"]) < JWKS_CACHE_TTL:
        return _jwks_cache["keys"]

    supabase_url = os.environ.get("SUPABASE_URL", "")
    if not supabase_url:
        raise HTTPException(status_code=500, detail="SUPABASE_URL not configured")

    try:
        jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
        with httpx.Client(timeout=10) as client:
            resp = client.get(jwks_url)
            resp.raise_for_status()
            keys = resp.json()
            _jwks_cache["keys"] = keys
            _jwks_cache["fetched_at"] = now
            return keys
    except Exception:
        # Fallback: use JWT secret directly
        return None


def _validate_token(token: str) -> dict:
    """Validate Supabase JWT and return claims."""
    jwks = _get_jwks()

    if jwks and "keys" in jwks:
        # Validate with JWKS
        try:
            from jwt import PyJWKClient
            jwk_client = PyJWKClient(
                f"{os.environ.get('SUPABASE_URL', '')}/auth/v1/.well-known/jwks.json"
            )
            signing_key = jwk_client.get_signing_key_from_jwt(token)
            return jwt.decode(
                token, signing_key.key,
                algorithms=["RS256"],
                audience="authenticated",
            )
        except Exception:
            pass

    # Fallback: decode with JWT secret
    jwt_secret = os.environ.get("SUPABASE_JWT_SECRET", "")
    if jwt_secret:
        return jwt.decode(token, jwt_secret, algorithms=["HS256"], audience="authenticated")

    raise HTTPException(status_code=401, detail="Unable to validate token")


def get_current_subscriber(authorization: str = Header(None)):
    """FastAPI dependency to get the current subscriber from JWT."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")

    token = authorization.split(" ", 1)[1]
    claims = _validate_token(token)

    supabase_user_id = claims.get("sub", "")
    email = claims.get("email", "")

    if not supabase_user_id:
        raise HTTPException(status_code=401, detail="Invalid token claims")

    # Upsert subscriber on first auth
    supabase = get_supabase()
    result = supabase.table("subscribers").upsert(
        {
            "supabase_user_id": supabase_user_id,
            "email": email,
        },
        on_conflict="supabase_user_id",
    ).execute()

    subscriber = result.data[0] if result.data else None
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    return subscriber


@router.post("/auth/verify")
def verify_token(subscriber=Depends(get_current_subscriber)):
    """Verify JWT and return subscriber info."""
    return {
        "email": subscriber.get("email"),
        "tier": subscriber.get("tier", "free"),
        "is_active": subscriber.get("is_active", True),
    }


@router.post("/subscribe")
def create_checkout(tier: str = "pro"):
    """Create Stripe Checkout session."""
    import stripe
    stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")

    price_map = {
        "pro": os.environ.get("STRIPE_PRO_PRICE_ID", ""),
        "premium": os.environ.get("STRIPE_PREMIUM_PRICE_ID", ""),
    }

    price_id = price_map.get(tier)
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Invalid tier: {tier}")

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{frontend_url}/dashboard?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/#pricing",
        )
        return {"checkout_url": session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard")
def get_dashboard(subscriber=Depends(get_current_subscriber)):
    """Protected dashboard data."""
    supabase = get_supabase()
    tier = subscriber.get("tier", "free")

    # Signals based on tier
    if tier == "premium":
        signals = supabase.table("signals").select("*").order("created_at", desc=True).execute()
    elif tier == "pro":
        signals = supabase.table("signals").select("*").order("created_at", desc=True).limit(20).execute()
    else:
        signals = supabase.from_("v_signals_public").select("*").limit(3).execute()

    return {
        "subscriber": {
            "email": subscriber.get("email"),
            "tier": tier,
            "telegram_chat_id": subscriber.get("telegram_chat_id"),
        },
        "signals": signals.data or [],
    }
