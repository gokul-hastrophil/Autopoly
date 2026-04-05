"""Groq AI service with 3-tier confidence waterfall."""
import os
import time
import json
from backend.services.supabase_client import get_supabase


def _load_groq_config() -> dict:
    """Load Groq config from strategy_config table."""
    supabase = get_supabase()
    result = supabase.table("strategy_config").select("key, value").in_(
        "key", ["groq_primary_model", "groq_fallback_model", "groq_prompt_template", "rule_based_fallback_confidence"]
    ).execute()
    config = {row["key"]: row["value"] for row in (result.data or [])}
    return {
        "primary_model": config.get("groq_primary_model", "llama-3.3-70b-versatile"),
        "fallback_model": config.get("groq_fallback_model", "llama-3.1-8b-instant"),
        "prompt_template": config.get("groq_prompt_template", "You are a prediction market analyst. Assess the probability that this market resolves YES."),
        "rule_based_confidence": float(config.get("rule_based_fallback_confidence", 0.60)),
    }


def _call_groq(model: str, system_prompt: str, user_prompt: str, api_key: str) -> dict | None:
    """Call Groq API with timeout and error handling."""
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=500,
            timeout=30,
        )
        content = response.choices[0].message.content
        # Try to parse JSON from response
        try:
            # Look for JSON in the response
            if "{" in content:
                json_str = content[content.index("{"):content.rindex("}") + 1]
                parsed = json.loads(json_str)
                return {
                    "confidence": float(parsed.get("confidence", parsed.get("probability", 0.5))),
                    "reasoning": parsed.get("reasoning", parsed.get("explanation", content[:200])),
                }
        except (json.JSONDecodeError, ValueError):
            pass
        # Fallback: extract a number from response
        return {"confidence": 0.5, "reasoning": content[:200]}
    except Exception as e:
        print(f"  Groq error ({model}): {e}")
        return None


def analyze_market(market_question: str, current_price: float, volume: float, days_to_close: float) -> dict:
    """
    3-tier confidence waterfall:
    1. Primary model (llama-3.3-70b-versatile)
    2. Fallback model (llama-3.1-8b-instant)
    3. Rule-based only (ai_verified=false)

    Returns: {confidence, reasoning, ai_verified, model_used}
    """
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        print("  No GROQ_API_KEY, using rule-based fallback")
        return _rule_based_fallback(current_price)

    config = _load_groq_config()

    user_prompt = (
        f"Market: {market_question}\n"
        f"Current price: {current_price:.4f} (implies {current_price*100:.1f}% probability)\n"
        f"Volume: ${volume:,.0f} USDC\n"
        f"Days until close: {days_to_close:.1f}\n\n"
        f"Respond with JSON: {{\"confidence\": 0.0-1.0, \"reasoning\": \"...\"}}"
    )

    # Tier 1: Primary model
    result = _call_groq(config["primary_model"], config["prompt_template"], user_prompt, api_key)
    if result:
        time.sleep(2)  # Rate limiting: 2s between calls
        return {
            "confidence": result["confidence"],
            "reasoning": result["reasoning"],
            "ai_verified": True,
            "model_used": config["primary_model"],
        }

    print(f"  Primary model failed, trying fallback...")
    time.sleep(2)

    # Tier 2: Fallback model
    result = _call_groq(config["fallback_model"], config["prompt_template"], user_prompt, api_key)
    if result:
        return {
            "confidence": result["confidence"],
            "reasoning": result["reasoning"],
            "ai_verified": True,
            "model_used": config["fallback_model"],
        }

    print(f"  Fallback model failed, using rule-based signal")

    # Tier 3: Rule-based
    return _rule_based_fallback(current_price, config.get("rule_based_confidence", 0.60))


def _rule_based_fallback(current_price: float, default_confidence: float = 0.60) -> dict:
    """Generate rule-based signal without AI verification."""
    return {
        "confidence": default_confidence,
        "reasoning": "Rule-based signal -- AI verification unavailable",
        "ai_verified": False,
        "model_used": "rule_based",
    }
