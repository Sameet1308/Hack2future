"""
app/services/fnol_service.py + document_service.py
"""

# ── FNOL ──────────────────────────────────────────────────────────────────────

import uuid
import logging
from datetime import datetime
from app.core.database import db_cursor
from app.models.schemas import FnolRequest, FnolResponse

logger = logging.getLogger(__name__)


def submit_fnol(req: FnolRequest) -> FnolResponse:
    """
    Persists the FNOL record. Returns an fnol_id that the Claim Creation
    service uses to link the two records.
    """
    fnol_id = f"FNOL-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.utcnow()

    with db_cursor() as cur:
        # ── STORED PROCEDURE PLACEHOLDER ──────────────────────────────
        # Replace with: EXEC sp_CreateFNOL @fnol_id, @policy_id, ...
        cur.execute("""
            INSERT INTO gbx.gbx_FNOL (
                gbx_fnol_id, gbx_policy_id, gbx_loss_type,
                gbx_collision_sub_type, gbx_incident_date, gbx_incident_time,
                gbx_incident_location, gbx_incident_state, gbx_narrative_text,
                gbx_airbag_deployed, gbx_injury_flag,
                gbx_police_report_filed, gbx_police_report_number,
                gbx_vehicle_drivable, gbx_other_party_involved,
                gbx_fault_assessment, gbx_distress_flag,
                gbx_auto_escalate, gbx_channel, gbx_created_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
            fnol_id, req.policy_id, req.loss_type,
            req.collision_sub_type, req.incident_date, req.incident_time,
            req.incident_location, req.incident_state, req.narrative_text,
            req.airbag_deployed, req.injury_flag,
            req.police_report_filed, req.police_report_number,
            req.vehicle_drivable, req.other_party_involved,
            req.fault_assessment, req.distress_flag,
            req.auto_escalate, req.channel, now,
        )

    routing_flags = {
        "auto_escalate": req.auto_escalate,
        "distress_flag": req.distress_flag,
        "injury_flag": req.injury_flag,
        "airbag_deployed": req.airbag_deployed,
        "no_police_report": not req.police_report_filed,
    }

    logger.info(f"FNOL created: {fnol_id} | Policy: {req.policy_id} | Loss: {req.loss_type}")

    return FnolResponse(
        success=True,
        fnol_id=fnol_id,
        policy_id=req.policy_id,
        message=f"FNOL {fnol_id} submitted. Proceed to claim creation.",
        routing_flags=routing_flags,
    )
