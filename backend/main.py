import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

from dotenv import load_dotenv
load_dotenv()

from backend.routers.analytics import router as analytics_router
from backend.routers.signals import router as signals_router
from backend.routers.auth import router as auth_router
from backend.routers.webhook import router as webhook_router
from backend.services.rate_limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Autopoly API", lifespan=lifespan)

# CORS - allow Vercel frontend
origins = [
    os.environ.get("FRONTEND_URL", "http://localhost:5173"),
    "http://localhost:5173",
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics_router, prefix="/api")
app.include_router(signals_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(webhook_router, prefix="/api")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 1)
    print(f"{request.method} {request.url.path} -> {response.status_code} ({duration}ms)")
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc) if os.environ.get("DEBUG") else None},
    )


@app.get("/health")
def health():
    from backend.services.supabase_client import health_check
    db_ok = health_check()
    return {
        "status": "ok" if db_ok else "degraded",
        "db": "connected" if db_ok else "unreachable",
    }
