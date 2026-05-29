"""
app/services/policy_service.py
Business logic for policy lookup.
Calls the stored procedure: EXEC sp_GetPolicyDetails @policy_id
The SP is expected to return multiple result sets:
  RS0 — core policy row
  RS1 — vehicles
  RS2 — drivers
  RS3 — attributes (category / code / value rows)
"""

import logging
from datetime import datetime, date
from app.core.database import db_cursor
from app.models.schemas import (
    PolicyInfo, InsuredDetails, Address,
    PolicyAttributes, Coverages, Deductibles,
    Vehicle, Driver, RoutingFlags, AgentMeta, PolicyLookupResponse,
)

logger = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _to_int(val) -> int | None:
    try:
        return int(val)
    except (TypeError, ValueError):
        return None


def _to_bool(val) -> bool:
    if isinstance(val, bool):
        return val
    return str(val).strip().lower() in ("1", "true", "yes")


def _rows_to_dicts(cursor) -> list[dict]:
    cols = [col[0] for col in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]


# ── Stored Procedure Call ─────────────────────────────────────────────────────

def _call_sp(policy_id: str) -> tuple[list, list, list, list]:
    """
    ╔══════════════════════════════════════════════════════════════╗
    ║  STORED PROCEDURE PLACEHOLDER                                ║
    ║  Replace the body of this function with your actual SP call  ║
    ║  once sp_GetPolicyDetails is deployed to Azure SQL.          ║
    ║                                                              ║
    ║  Expected SP signature:                                      ║
    ║    EXEC sp_GetPolicyDetails @policy_id = 'POL-2024-0001'     ║
    ║                                                              ║
    ║  Expected result sets returned by the SP:                    ║
    ║    RS0: one row  — core policy fields                        ║
    ║    RS1: n rows   — vehicles                                  ║
    ║    RS2: n rows   — drivers                                   ║
    ║    RS3: n rows   — attributes (category, code, value)        ║
    ╚══════════════════════════════════════════════════════════════╝
    """
    with db_cursor() as cur:
        # ── CALL THE STORED PROCEDURE ──────────────────────────────
        cur.execute("EXEC sp_GetPolicyDetails @policy_id = ?", policy_id)

        # RS0 — core policy
        rs0 = _rows_to_dicts(cur)

        # RS1 — vehicles
        cur.nextset()
        rs1 = _rows_to_dicts(cur)

        # RS2 — drivers
        cur.nextset()
        rs2 = _rows_to_dicts(cur)

        # RS3 — attributes
        cur.nextset()
        rs3 = _rows_to_dicts(cur)

    return rs0, rs1, rs2, rs3


# ── Mapping Helpers ───────────────────────────────────────────────────────────

def _map_policy_info(row: dict) -> PolicyInfo:
    return PolicyInfo(
        policy_id=row["gbx_policy_id"],
        policy_type=row["gbx_policy_type"],
        status=row["gbx_status"],
        state=row["gbx_state"],
        no_fault_state=_to_bool(row.get("gbx_no_fault_flag", False)),
        effective_date=row["gbx_start_date"],
        expiry_date=row["gbx_end_date"],
        policy_pdf_url=row.get("gbx_policy_pdf_url"),
        insured_details=InsuredDetails(
            first_name=row["gbx_holder_firstname"],
            last_name=row["gbx_holder_lastname"],
            email=row["gbx_holder_email"],
            phone=row["gbx_holder_phone"],
        ),
        residential_addr=Address(
            street=row["gbx_res_addr_street"],
            apartment=row.get("gbx_res_addr_apt") or "",
            city=row["gbx_res_addr_city"],
            state=row["gbx_res_addr_state"],
            zip=row["gbx_res_addr_zip"],
        ),
        mailing_addr=Address(
            street=row["gbx_mail_addr_street"],
            apartment=row.get("gbx_mail_addr_apt") or "",
            city=row["gbx_mail_addr_city"],
            state=row["gbx_mail_addr_state"],
            zip=row["gbx_mail_addr_zip"],
        ),
    )


def _map_attributes(rs3: list[dict]) -> PolicyAttributes:
    """Pivot attribute rows into category buckets."""
    buckets: dict[str, dict] = {}
    for row in rs3:
        cat = row.get("gbx_attr_category", "Other")
        code = row["gbx_attr_code"]
        val = row["gbx_attr_value"]
        buckets.setdefault(cat, {})[code] = val

    cov = buckets.get("Coverage", {})
    ded = buckets.get("Deductible", {})

    return PolicyAttributes(
        coverages_summary=buckets.get("Summary", {}).get("COVERAGE_SUMMARY", ""),
        coverages=Coverages(
            coverage_A_BI_per_person=_to_int(cov.get("COVERAGE_A_BI_PER_PERSON")),
            coverage_B_BI_per_accident=_to_int(cov.get("COVERAGE_B_BI_PER_ACCIDENT")),
            coverage_C_property_damage=_to_int(cov.get("COVERAGE_C_PD")),
            coverage_D_comprehensive=_to_int(cov.get("COVERAGE_D_COMP")),
            coverage_E_collision=_to_int(cov.get("COVERAGE_E_COLL")),
            coverage_PIP=_to_int(cov.get("COVERAGE_PIP")),
            coverage_UM_per_person=_to_int(cov.get("COVERAGE_UM_PER_PERSON")),
            coverage_UIM_per_person=_to_int(cov.get("COVERAGE_UIM_PER_PERSON")),
            rental_reimbursement=cov.get("COVERAGE_RENTAL"),
            roadside_assistance=cov.get("COVERAGE_ROADSIDE"),
        ),
        deductibles=Deductibles(
            deductible_collision=_to_int(ded.get("DEDUCTIBLE_COLLISION")),
            deductible_comprehensive=_to_int(ded.get("DEDUCTIBLE_COMP")),
            deductible_glass_waiver=_to_bool(ded.get("DEDUCTIBLE_GLASS_WAIVER", False)),
        ),
        endorsements=buckets.get("Endorsement", {}),
        discounts=buckets.get("Discount", {}),
        limits=buckets.get("Limit", {}),
        payment_plan=buckets.get("Billing", {}).get("PAYMENT_PLAN", ""),
        premium_amount=float(
            buckets.get("Billing", {}).get("PREMIUM_AMOUNT", 0) or 0
        ),
    )


def _map_vehicles(rs1: list[dict]) -> list[Vehicle]:
    return [
        Vehicle(
            vehicle_id=r["gbx_vehicle_id"],
            vin=r["gbx_vin"],
            make=r["gbx_make"],
            model=r["gbx_model"],
            year=str(r["gbx_year"]),
            primary_vehicle=_to_bool(r.get("gbx_primary_vehicle", False)),
        )
        for r in rs1
    ]


def _map_drivers(rs2: list[dict]) -> list[Driver]:
    return [
        Driver(
            driver_id=r["gbx_drv_id"],
            first_name=r["gbx_drv_firstname"],
            last_name=r["gbx_drv_lastname"],
            status=r["gbx_drv_status"],
            age=r.get("gbx_drv_age"),
            license_no=r.get("gbx_drv_license_no"),
        )
        for r in rs2
    ]


def _build_routing_flags(policy_row: dict, passed: bool, msg: str) -> RoutingFlags:
    status = policy_row["gbx_status"]
    end_date = policy_row["gbx_end_date"]
    today = date.today()

    policy_active = (
        status == "Active"
        and (not isinstance(end_date, date) or end_date >= today)
    )
    return RoutingFlags(
        policy_active=policy_active,
        no_fault_state=_to_bool(policy_row.get("gbx_no_fault_flag", False)),
        escalation_needed=not policy_active,
        policy_validation_passed=passed,
        validation_message=msg,
    )


# ── Public Entry Point ────────────────────────────────────────────────────────

def get_policy(policy_id: str) -> PolicyLookupResponse:
    """
    Called by the /policy/lookup router.
    Raises ValueError if policy not found; lets DB errors bubble up naturally.
    """
    rs0, rs1, rs2, rs3 = _call_sp(policy_id)

    if not rs0:
        raise ValueError(f"Policy '{policy_id}' not found")

    policy_row = rs0[0]

    status = policy_row["gbx_status"]
    end_date = policy_row["gbx_end_date"]
    today = date.today()

    if status == "Active" and (not isinstance(end_date, date) or end_date >= today):
        valid, msg = True, "Policy active and in force"
    elif status in ("Lapsed", "Cancelled"):
        valid, msg = False, f"Policy status is '{status}' — escalation required"
    elif isinstance(end_date, date) and end_date < today:
        valid, msg = False, f"Policy expired on {end_date}"
    else:
        valid, msg = True, f"Policy status: {status}"

    return PolicyLookupResponse(
        success=True,
        agent_meta=AgentMeta(
            agent_name="PolicyLookupAgent",
            generated_at=datetime.utcnow(),
        ),
        policy_info=_map_policy_info(policy_row),
        policy_attributes=_map_attributes(rs3),
        vehicles=_map_vehicles(rs1),
        drivers=_map_drivers(rs2),
        routing_flags=_build_routing_flags(policy_row, valid, msg),
    )
