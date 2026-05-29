"""app/routers/fnol.py"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import require_auth
from app.models.schemas import FnolRequest, FnolResponse
from app.services.fnol_service import submit_fnol

router = APIRouter(prefix="/fnol", tags=["FNOL"])

@router.post("/submit", response_model=FnolResponse,
             summary="Submit First Notice of Loss from voice/digital intake agent")
async def fnol_submit(request: FnolRequest, _: dict = Depends(require_auth)):
    try:
        return submit_fnol(request)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
