"""Upstash Redis cache wrapper with graceful fallback."""
import os
import json

_redis = None


def _get_redis():
    global _redis
    if _redis is None:
        url = os.environ.get("UPSTASH_REDIS_URL")
        token = os.environ.get("UPSTASH_REDIS_TOKEN")
        if url and token:
            try:
                from upstash_redis import Redis
                _redis = Redis(url=url, token=token)
            except Exception as e:
                print(f"Redis init failed: {e}")
                _redis = False  # Mark as unavailable
        else:
            _redis = False
    return _redis if _redis is not False else None


def cache_get(key: str):
    """Get cached value. Returns None on miss or Redis failure."""
    try:
        redis = _get_redis()
        if redis is None:
            return None
        value = redis.get(key)
        if value is None:
            return None
        return json.loads(value) if isinstance(value, str) else value
    except Exception:
        return None


def cache_set(key: str, value, ttl_seconds: int = 60):
    """Set cached value. Silently fails if Redis unavailable."""
    try:
        redis = _get_redis()
        if redis is None:
            return
        redis.set(key, json.dumps(value), ex=ttl_seconds)
    except Exception:
        pass
