"""app/routers/adjudication.py"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import require_auth
from app.models.schemas import AdjudicationRequest, AdjudicationResponse
from app.services.adjudication_service import adjudicate_claim

router = APIRouter(prefix="/adjudication", tags=["Adjudication"])

@router.post("/decide", response_model=AdjudicationResponse,
             summary="Score a claim and produce AUTO_APPROVED / ADJUSTER_REVIEW / ESCALATED decision")
async def adjudication_decide(request: AdjudicationRequest, _: dict = Depends(require_auth)):
    try:
        return adjudicate_claim(request)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
