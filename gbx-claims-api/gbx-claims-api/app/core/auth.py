"""
app/core/auth.py
Validates Azure AD Bearer tokens on every request.
AI agents in the same AKS workspace authenticate using their
own Managed Identity — they acquire a token for the audience
'api://gbx-claims-api' and pass it as:  Authorization: Bearer <token>
"""

import logging
import httpx
from functools import lru_cache
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
bearer_scheme = HTTPBearer()


@lru_cache(maxsize=1)
def _get_jwks() -> dict:
    """
    Fetch Microsoft's public signing keys (JWKS).
    Cached in memory — rotates automatically when jose can't find the kid.
    """
    url = (
        f"https://login.microsoftonline.com/"
        f"{settings.AZURE_TENANT_ID}/discovery/v2.0/keys"
    )
    resp = httpx.get(url, timeout=10)
    resp.raise_for_status()
    return resp.json()


def _validate_token(token: str) -> dict:
    try:
        jwks = _get_jwks()
        header = jwt.get_unverified_header(token)
        # Find matching public key by kid
        key = next(
            (k for k in jwks["keys"] if k["kid"] == header.get("kid")), None
        )
        if not key:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Signing key not found")

        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=settings.AAD_AUDIENCE,
            issuer=f"https://sts.windows.net/{settings.AZURE_TENANT_ID}/",
        )
        return payload

    except JWTError as e:
        logger.warning(f"Token validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    FastAPI dependency — inject into any route to enforce auth.
    Returns the decoded token claims (appid, oid, etc.).

    Usage:
        @router.post("/")
        async def my_endpoint(claims: dict = Depends(require_auth)):
            ...
    """
    return _validate_token(credentials.credentials)
