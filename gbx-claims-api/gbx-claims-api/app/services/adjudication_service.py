"""
app/services/adjudication_service.py
Scoring engine — takes validation confidence + claim flags,
produces a decision and logs to Decision_Rationale table.
"""

import logging
from datetime import datetime
from app.core.database import db_cursor
from app.models.schemas import AdjudicationRequest, AdjudicationResponse

logger = logging.getLogger(__name__)


def _compute_decision(req: AdjudicationRequest) -> tuple[str, int, str]:
    """
    Returns (decision, adjuster_tier, rationale_text).
    Decision rules — in priority order:
      1. Hard escalate flags → Tier 3 always
      2. Confidence < 60 or auto_escalate → Tier 2 review
      3. Confidence >= 90 and no flags → Tier 1 auto-approve
      4. Default → Tier 2 adjuster review
    """
    reasons = []

    # Hard escalate
    if req.injury_flag and req.estimated_amount and req.estimated_amount > 25_000:
        reasons.append("Injury + high-value estimate")
        return "ESCALATED", 3, " | ".join(reasons)

    if req.auto_escalate:
        reasons.append("Auto-escalate flag set during intake")
        return "ESCALATED", 3, " | ".join(reasons)

    # Distress or injury → minimum Tier 2
    if req.distress_flag:
        reasons.append("Caller distress flag set")
    if req.injury_flag:
        reasons.append("Injury reported")

    # Confidence thresholds
    if req.validation_confidence >= 90.0 and not reasons:
        reasons.append(f"Confidence {req.validation_confidence:.1f}% exceeds auto-approve threshold")
        return "AUTO_APPROVED", 1, " | ".join(reasons)

    if req.validation_confidence < 60.0:
        reasons.append(f"Confidence {req.validation_confidence:.1f}% below review threshold")
        return "ADJUSTER_REVIEW", 2, " | ".join(reasons)

    if reasons:
        return "ADJUSTER_REVIEW", 2, " | ".join(reasons)

    return "ADJUSTER_REVIEW", 2, f"Standard review — confidence {req.validation_confidence:.1f}%"


def _estimated_payout(req: AdjudicationRequest) -> float | None:
    if req.estimated_amount is None:
        return None
    deductible = req.deductible or 0
    return max(0.0, req.estimated_amount - deductible)


def _log_decision_rationale(req: AdjudicationRequest, decision: str, tier: int, rationale: str) -> None:
    """Write to Decision_Rationale table — Glass Box audit trail."""
    with db_cursor() as cur:
        # ── STORED PROCEDURE PLACEHOLDER ───────────────────────────
        # Replace with: EXEC sp_LogDecisionRationale ...
        cur.execute("""
            INSERT INTO gbx.gbx_DecisionRationale (
                gbx_claim_id, gbx_agent_name, gbx_action,
                gbx_decision, gbx_adjuster_tier,
                gbx_confidence_score, gbx_human_readable_explanation,
                gbx_created_at
            ) VALUES (?,?,?,?,?,?,?,?)
        """,
            req.claim_id, "AdjudicationAgent", "Claim scoring + decision",
            decision, tier, req.validation_confidence, rationale,
            datetime.utcnow(),
        )


def adjudicate_claim(req: AdjudicationRequest) -> AdjudicationResponse:
    decision, tier, rationale = _compute_decision(req)
    payout = _estimated_payout(req)

    try:
        _log_decision_rationale(req, decision, tier, rationale)
        logged = True
    except Exception as e:
        logger.error(f"Decision rationale log failed: {e}")
        logged = False

    logger.info(f"Adjudication | Claim: {req.claim_id} | Decision: {decision} | Tier: {tier}")

    return AdjudicationResponse(
        success=True,
        claim_id=req.claim_id,
        decision=decision,
        adjuster_tier=tier,
        confidence_score=req.validation_confidence,
        recommended_payout=payout,
        rationale=rationale,
        decision_rationale_logged=logged,
    )
