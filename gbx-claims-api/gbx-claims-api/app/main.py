"""
app/main.py
FastAPI application entry point.
All routers registered here. Uvicorn runs this module.
"""

import logging
import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.routers import policy, fnol, claims, documents, validation, adjudication

settings = get_settings()

# ── Structured logging ────────────────────────────────────────────────────────
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    logger_factory=structlog.stdlib.LoggerFactory(),
)
logging.basicConfig(level=settings.LOG_LEVEL)

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"])

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Glass Box AI — P&C Claims API. "
        "Provides policy lookup, FNOL intake, claim creation, document upload, "
        "external validation, and adjudication scoring for AI agent pipelines. "
        "All endpoints require Azure AD Bearer token (Managed Identity)."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Restrict to internal AKS cluster in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENV == "development" else ["https://*.internal.gbx.io"],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Request logging middleware ────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger = structlog.get_logger()
    logger.info("request", method=request.method, path=request.url.path,
                client=request.client.host if request.client else "unknown")
    response = await call_next(request)
    logger.info("response", status_code=response.status_code, path=request.url.path)
    return response

# ── Routers ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"
app.include_router(policy.router,      prefix=API_PREFIX)
app.include_router(fnol.router,        prefix=API_PREFIX)
app.include_router(claims.router,      prefix=API_PREFIX)
app.include_router(documents.router,   prefix=API_PREFIX)
app.include_router(validation.router,  prefix=API_PREFIX)
app.include_router(adjudication.router, prefix=API_PREFIX)

# ── Health + readiness probes (used by AKS liveness/readiness checks) ─────────
@app.get("/health", tags=["Health"], include_in_schema=False)
async def health():
    return {"status": "healthy", "version": settings.APP_VERSION}

@app.get("/ready", tags=["Health"], include_in_schema=False)
async def ready():
    """Readiness — lightweight DB ping."""
    try:
        from app.core.database import get_connection, release_connection
        conn = get_connection()
        conn.execute("SELECT 1")
        release_connection(conn)
        return {"status": "ready"}
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "not ready", "detail": str(e)})
