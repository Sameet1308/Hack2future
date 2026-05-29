"""app/routers/claims.py"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import require_auth
from app.models.schemas import ClaimCreateRequest, ClaimCreateResponse
from app.services.claim_service import create_claim

router = APIRouter(prefix="/claims", tags=["Claims"])

@router.post("/create", response_model=ClaimCreateResponse,
             summary="Generate a Claim ID and persist the claim record")
async def claim_create(request: ClaimCreateRequest, _: dict = Depends(require_auth)):
    try:
        return create_claim(request)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
