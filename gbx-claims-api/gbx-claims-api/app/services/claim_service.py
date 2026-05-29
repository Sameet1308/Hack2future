"""
app/services/claim_service.py
Generates a Claim ID, persists the claim row to Azure SQL,
and fires an async sync to Dataverse.
"""

import uuid
import logging
from datetime import datetime
from app.core.database import db_cursor
from app.core.dataverse import sync_claim_to_dataverse
from app.models.schemas import ClaimCreateRequest, ClaimCreateResponse

logger = logging.getLogger(__name__)


def _generate_claim_id() -> str:
    """
    Format: CLM-YYYYMMDD-<8 char UUID hex>
    Example: CLM-20241115-A3F2B91C
    """
    date_str = datetime.utcnow().strftime("%Y%m%d")
    uid = uuid.uuid4().hex[:8].upper()
    return f"CLM-{date_str}-{uid}"


def _determine_tier(req: ClaimCreateRequest) -> int:
    """
    Adjuster tier based on intake flags.
    Tier 1 = auto-process | Tier 2 = adjuster review | Tier 3 = senior + legal
    """
    if req.auto_escalate or req.adjuster_tier == 3:
        return 3
    if req.distress_flag or req.adjuster_tier == 2:
        return 2
    return 1


def create_claim(req: ClaimCreateRequest) -> ClaimCreateResponse:
    claim_id = _generate_claim_id()
    tier = _determine_tier(req)
    status = "Submitted"
    now = datetime.utcnow()

    with db_cursor() as cur:
        # ── STORED PROCEDURE PLACEHOLDER ──────────────────────────────
        # Replace with: EXEC sp_CreateClaim @claim_id, @policy_id, ...
        cur.execute("""
            INSERT INTO gbx.gbx_Claims (
                gbx_claim_id, gbx_policy_id, gbx_fnol_id,
                gbx_loss_type, gbx_incident_date, gbx_incident_location,
                gbx_incident_state, gbx_narrative_text,
                gbx_status, gbx_adjuster_tier, gbx_channel,
                gbx_auto_escalate, gbx_distress_flag,
                gbx_created_at, gbx_updated_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
            claim_id, req.policy_id, req.fnol_id,
            req.loss_type, req.incident_date, req.incident_location,
            req.incident_state, req.narrative_text,
            status, tier, req.channel,
            req.auto_escalate, req.distress_flag,
            now, now,
        )

    # Async Dataverse sync (best-effort — Azure SQL is source of truth)
    import asyncio
    dv_payload = {
        "claim_id": claim_id,
        "policy_id": req.policy_id,
        "loss_type": req.loss_type,
        "status": status,
        "incident_date": str(req.incident_date),
        "incident_location": req.incident_location,
        "channel": req.channel,
        "auto_escalate": req.auto_escalate,
        "distress_flag": req.distress_flag,
    }
    try:
        loop = asyncio.get_event_loop()
        dv_synced = loop.run_until_complete(sync_claim_to_dataverse(dv_payload))
    except Exception:
        dv_synced = False

    logger.info(f"Claim created: {claim_id} | Tier: {tier} | DV synced: {dv_synced}")

    return ClaimCreateResponse(
        success=True,
        claim_id=claim_id,
        policy_id=req.policy_id,
        status=status,
        adjuster_tier=tier,
        dataverse_synced=dv_synced,
        message=f"Claim {claim_id} created successfully. Adjuster tier: {tier}.",
    )
