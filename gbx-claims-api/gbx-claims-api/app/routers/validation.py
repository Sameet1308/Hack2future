"""app/routers/validation.py"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import require_auth
from app.models.schemas import ValidationRequest, ValidationResponse
from app.services.validation_service import run_validation

router = APIRouter(prefix="/validation", tags=["Validation"])

@router.post("/run", response_model=ValidationResponse,
             summary="Run NOAA / NICB / ISO validation checks against a claim")
async def validation_run(request: ValidationRequest, _: dict = Depends(require_auth)):
    try:
        return await run_validation(request)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
