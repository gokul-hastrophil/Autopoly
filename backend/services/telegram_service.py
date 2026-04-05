"""Telegram alert service using Bot API directly via httpx."""
import os
import time
import httpx

TELEGRAM_API = "https://api.telegram.org"
BATCH_DELAY = 0.05  # 50ms between messages


def send_alert(chat_id: str, message: str) -> bool:
    """Send a single Telegram message."""
    token = os.environ.get("TELEGRAM_TOKEN", "")
    if not token or not chat_id:
        return False

    try:
        with httpx.Client(timeout=10) as client:
            resp = client.post(
                f"{TELEGRAM_API}/bot{token}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": message,
                    "parse_mode": "Markdown",
                },
            )
            return resp.status_code == 200
    except Exception as e:
        print(f"  Telegram send error: {e}")
        return False


def send_signal_alert(chat_id: str, market_question: str, confidence: float,
                      reasoning: str, current_price: float, ai_verified: bool) -> bool:
    """Send a formatted signal alert."""
    verified_tag = "" if ai_verified else "\n⚠️ _Rule-based signal -- not AI-verified_"

    message = (
        f"🔔 *New Signal*\n\n"
        f"📊 {market_question}\n"
        f"💰 Price: {current_price:.4f}\n"
        f"🎯 Confidence: {confidence*100:.0f}%\n"
        f"💡 {reasoning[:150]}"
        f"{verified_tag}"
    )
    return send_alert(chat_id, message)


def broadcast_signal(subscribers: list[dict], market_question: str, confidence: float,
                     reasoning: str, current_price: float, ai_verified: bool, max_messages: int = 20) -> int:
    """Send signal to all subscribers with telegram_chat_id. Returns count sent."""
    sent = 0
    for sub in subscribers[:max_messages]:
        chat_id = sub.get("telegram_chat_id")
        if not chat_id:
            continue
        if send_signal_alert(chat_id, market_question, confidence, reasoning, current_price, ai_verified):
            sent += 1
        time.sleep(BATCH_DELAY)
    return sent
