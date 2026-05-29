"""
app/routers/policy.py
POST /api/v1/policy/lookup
"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import require_auth
from app.models.schemas import PolicyLookupRequest, PolicyLookupResponse, ErrorResponse
from app.services.policy_service import get_policy

router = APIRouter(prefix="/policy", tags=["Policy"])


@router.post(
    "/lookup",
    response_model=PolicyLookupResponse,
    responses={404: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    summary="Retrieve full policy details by policy ID",
    description=(
        "Calls sp_GetPolicyDetails stored procedure. Returns structured policy JSON "
        "including insured details, coverages, deductibles, vehicles, drivers, "
        "and routing flags for downstream agents."
    ),
)
async def lookup_policy(
    request: PolicyLookupRequest,
    _claims: dict = Depends(require_auth),
) -> PolicyLookupResponse:
    try:
        return get_policy(request.policy_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Policy lookup failed: {str(e)}",
        )
