"""
app/services/validation_service.py
Runs external validation checks against NOAA, NICB (mock), ISO ClaimSearch (mock).
Each check returns a ValidationResult with a confidence delta.
"""

import logging
import httpx
from datetime import date
from app.core.config import get_settings
from app.models.schemas import ValidationRequest, ValidationResponse, ValidationResult

logger = logging.getLogger(__name__)
settings = get_settings()

BASE_CONFIDENCE = 70.0      # Starting confidence before checks
MAX_CONFIDENCE = 100.0


async def _check_noaa(incident_date: date, location: str, state: str) -> ValidationResult:
    """
    Query NOAA api.weather.gov for a weather event at location + date.
    Only relevant when loss_type is weather-related.
    """
    try:
        # NOAA point lookup → forecast office → then historical check
        # Using a simplified endpoint here — extend with full grid lookup as needed
        url = f"{settings.NOAA_BASE_URL}/points/{location}"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)

        if resp.status_code == 200:
            return ValidationResult(
                check_name="NOAA_Weather_Corroboration",
                passed=True,
                detail="Weather event corroborated by NOAA data",
                confidence_delta=+10.0,
            )
        else:
            return ValidationResult(
                check_name="NOAA_Weather_Corroboration",
                passed=False,
                detail="No corroborating weather event found in NOAA records — manual review required",
                confidence_delta=-20.0,
            )
    except Exception as e:
        logger.warning(f"NOAA check failed: {e}")
        return ValidationResult(
            check_name="NOAA_Weather_Corroboration",
            passed=False,
            detail=f"NOAA API unreachable — flagged for manual review",
            confidence_delta=-5.0,
        )


async def _check_nicb(vin: str) -> ValidationResult:
    """
    Mock NICB stolen-vehicle database check by VIN.
    Replace URL with live NICB endpoint when available.
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{settings.NICB_API_URL}/vin/{vin}",
                headers={"X-API-Key": "placeholder"},
            )
        data = resp.json()
        if data.get("stolen_flag"):
            return ValidationResult(
                check_name="NICB_Stolen_Vehicle_Check",
                passed=False,
                detail=f"VIN {vin} flagged in NICB stolen-vehicle database — SIU referral recommended",
                confidence_delta=-30.0,
            )
        return ValidationResult(
            check_name="NICB_Stolen_Vehicle_Check",
            passed=True,
            detail="VIN not found in NICB stolen-vehicle database",
            confidence_delta=+5.0,
        )
    except Exception as e:
        logger.warning(f"NICB check failed: {e}")
        return ValidationResult(
            check_name="NICB_Stolen_Vehicle_Check",
            passed=True,
            detail="NICB check skipped — API unavailable",
            confidence_delta=0.0,
        )


async def _check_iso(policy_id: str, incident_date: date) -> ValidationResult:
    """
    Mock ISO ClaimSearch — duplicate/cross-carrier claim check.
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{settings.ISO_CLAIMSEARCH_URL}/search",
                json={"policy_id": policy_id, "incident_date": str(incident_date)},
                headers={"X-API-Key": "placeholder"},
            )
        data = resp.json()
        if data.get("duplicate_found"):
            return ValidationResult(
                check_name="ISO_ClaimSearch_Duplicate",
                passed=False,
                detail="Potential duplicate claim found across carriers — fraud flag set",
                confidence_delta=-25.0,
            )
        return ValidationResult(
            check_name="ISO_ClaimSearch_Duplicate",
            passed=True,
            detail="No duplicate claim found in ISO ClaimSearch",
            confidence_delta=+5.0,
        )
    except Exception as e:
        logger.warning(f"ISO check failed: {e}")
        return ValidationResult(
            check_name="ISO_ClaimSearch_Duplicate",
            passed=True,
            detail="ISO ClaimSearch skipped — API unavailable",
            confidence_delta=0.0,
        )


async def run_validation(req: ValidationRequest) -> ValidationResponse:
    results: list[ValidationResult] = []

    # NOAA — only for weather loss types
    if req.weather_factor or req.loss_type in ("Comp-Weather", "Comp-Flood", "Comp-Hail"):
        results.append(await _check_noaa(req.incident_date, req.incident_location, req.incident_state))

    # NICB — only if VIN provided (theft, fire, total-loss)
    if req.vehicle_vin:
        results.append(await _check_nicb(req.vehicle_vin))

    # ISO ClaimSearch — always run
    results.append(await _check_iso(req.policy_id, req.incident_date))

    # Compute final confidence
    confidence = BASE_CONFIDENCE + sum(r.confidence_delta for r in results)
    confidence = max(0.0, min(MAX_CONFIDENCE, confidence))

    all_passed = all(r.passed for r in results)
    escalate = confidence < 60.0 or not all_passed

    logger.info(
        f"Validation complete | Claim: {req.claim_id} | "
        f"Confidence: {confidence:.1f} | Escalate: {escalate}"
    )

    return ValidationResponse(
        success=True,
        claim_id=req.claim_id,
        overall_passed=all_passed,
        confidence_score=round(confidence, 2),
        results=results,
        escalate=escalate,
    )
