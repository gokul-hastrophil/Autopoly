"""Trading endpoints: wallet management, positions, risk settings."""
import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from backend.services.supabase_client import get_supabase
from backend.services.encryption import encrypt, decrypt
from backend.routers.auth import get_current_subscriber

router = APIRouter()


class WalletSetup(BaseModel):
    api_key: str
    api_secret: str
    api_passphrase: str
    private_key: str


class RiskSettings(BaseModel):
    max_position_size: float = 50
    max_open_positions: int = 5
    max_daily_loss: float = 100


@router.post("/wallet/setup")
def setup_wallet(data: WalletSetup, subscriber=Depends(get_current_subscriber)):
    """Save encrypted wallet credentials."""
    user_id = subscriber["id"]
    supabase = get_supabase()

    # Encrypt all credentials
    encrypted = {
        "user_id": user_id,
        "encrypted_api_key": encrypt(data.api_key),
        "encrypted_api_secret": encrypt(data.api_secret),
        "encrypted_api_passphrase": encrypt(data.api_passphrase),
        "encrypted_private_key": encrypt(data.private_key),
        "is_active": True,
    }

    supabase.table("user_wallets").upsert(encrypted, on_conflict="user_id").execute()

    # Optionally test connection
    try:
        from backend.services.polymarket_trader import create_trader, test_connection
        client = create_trader(data.api_key, data.api_secret, data.api_passphrase, data.private_key)
        connected = test_connection(client) if client else False
    except Exception:
        connected = False

    return {"status": "saved", "connection_tested": connected}


@router.get("/wallet/status")
def wallet_status(subscriber=Depends(get_current_subscriber)):
    """Check if wallet is configured (never returns keys)."""
    user_id = subscriber["id"]
    supabase = get_supabase()
    result = supabase.table("user_wallets").select("is_active, created_at, updated_at").eq(
        "user_id", user_id
    ).execute()

    if not result.data:
        return {"configured": False}

    w = result.data[0]
    return {"configured": True, "is_active": w["is_active"], "created_at": w["created_at"]}


@router.post("/wallet/delete")
def delete_wallet(subscriber=Depends(get_current_subscriber)):
    """Remove wallet credentials and disable auto-trading."""
    user_id = subscriber["id"]
    supabase = get_supabase()
    supabase.table("user_wallets").delete().eq("user_id", user_id).execute()
    supabase.table("risk_settings").update(
        {"auto_trade_enabled": False}
    ).eq("user_id", user_id).execute()
    return {"status": "deleted"}


@router.get("/positions")
def get_positions(status: str = "all", subscriber=Depends(get_current_subscriber)):
    """Get user's positions."""
    user_id = subscriber["id"]
    supabase = get_supabase()
    query = supabase.table("positions").select("*").eq("user_id", user_id).order("created_at", desc=True)
    if status != "all":
        query = query.eq("status", status)
    result = query.limit(50).execute()
    return {"positions": result.data or []}


@router.get("/positions/history")
def get_trade_history(limit: int = 50, offset: int = 0, subscriber=Depends(get_current_subscriber)):
    """Get trade history."""
    user_id = subscriber["id"]
    supabase = get_supabase()
    result = supabase.table("trade_history").select("*").eq(
        "user_id", user_id
    ).order("executed_at", desc=True).range(offset, offset + limit - 1).execute()
    return {"trades": result.data or [], "limit": limit, "offset": offset}


@router.get("/risk/settings")
def get_risk_settings(subscriber=Depends(get_current_subscriber)):
    """Get risk settings (or defaults)."""
    user_id = subscriber["id"]
    supabase = get_supabase()
    result = supabase.table("risk_settings").select("*").eq("user_id", user_id).execute()
    if result.data:
        return result.data[0]
    return {
        "max_position_size": 50,
        "max_open_positions": 5,
        "max_daily_loss": 100,
        "auto_trade_enabled": False,
    }


@router.post("/risk/settings")
def update_risk_settings(data: RiskSettings, subscriber=Depends(get_current_subscriber)):
    """Update risk settings."""
    user_id = subscriber["id"]
    if data.max_position_size <= 0 or data.max_open_positions < 1 or data.max_daily_loss <= 0:
        raise HTTPException(status_code=400, detail="Invalid risk parameters")
    supabase = get_supabase()
    supabase.table("risk_settings").upsert({
        "user_id": user_id,
        "max_position_size": data.max_position_size,
        "max_open_positions": data.max_open_positions,
        "max_daily_loss": data.max_daily_loss,
    }, on_conflict="user_id").execute()
    return {"status": "updated"}


@router.post("/trading/enable")
def enable_trading(subscriber=Depends(get_current_subscriber)):
    """Enable auto-trading. Requires wallet to be configured."""
    user_id = subscriber["id"]
    supabase = get_supabase()
    wallet = supabase.table("user_wallets").select("id").eq("user_id", user_id).eq("is_active", True).execute()
    if not wallet.data:
        raise HTTPException(status_code=400, detail="Configure wallet first")
    supabase.table("risk_settings").upsert({
        "user_id": user_id, "auto_trade_enabled": True
    }, on_conflict="user_id").execute()
    return {"status": "enabled"}


@router.post("/trading/disable")
def disable_trading(subscriber=Depends(get_current_subscriber)):
    """Disable auto-trading immediately."""
    user_id = subscriber["id"]
    supabase = get_supabase()
    supabase.table("risk_settings").update(
        {"auto_trade_enabled": False}
    ).eq("user_id", user_id).execute()
    return {"status": "disabled"}
