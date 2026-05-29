"""
app/models/schemas.py
All Pydantic request/response models for every service.
Kept in one file — split by service section.
"""

from __future__ import annotations
from datetime import date, datetime
from typing import Any
from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════
# SHARED
# ═══════════════════════════════════════════════════════

class AgentMeta(BaseModel):
    agent_name: str
    generated_at: datetime
    schema_version: str = "1.0"


class ErrorResponse(BaseModel):
    success: bool = False
    error_code: str
    message: str


# ═══════════════════════════════════════════════════════
# POLICY LOOKUP
# ═══════════════════════════════════════════════════════

class PolicyLookupRequest(BaseModel):
    policy_id: str = Field(..., examples=["POL-2024-0001"])


class InsuredDetails(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str


class Address(BaseModel):
    street: str
    apartment: str = ""
    city: str
    state: str
    zip: str


class Coverages(BaseModel):
    coverage_A_BI_per_person: int | None = None
    coverage_B_BI_per_accident: int | None = None
    coverage_C_property_damage: int | None = None
    coverage_D_comprehensive: int | None = None
    coverage_E_collision: int | None = None
    coverage_PIP: int | None = None
    coverage_UM_per_person: int | None = None
    coverage_UIM_per_person: int | None = None
    rental_reimbursement: str | None = None
    roadside_assistance: str | None = None


class Deductibles(BaseModel):
    deductible_collision: int | None = None
    deductible_comprehensive: int | None = None
    deductible_glass_waiver: bool = False


class PolicyAttributes(BaseModel):
    coverages_summary: str
    coverages: Coverages
    deductibles: Deductibles
    endorsements: dict[str, Any] = {}
    discounts: dict[str, Any] = {}
    limits: dict[str, Any] = {}
    payment_plan: str
    premium_amount: float


class Vehicle(BaseModel):
    vehicle_id: str
    vin: str
    make: str
    model: str
    year: str
    primary_vehicle: bool


class Driver(BaseModel):
    driver_id: str
    first_name: str
    last_name: str
    status: str       # Insured | Excluded | Inexperienced
    age: int | None = None
    license_no: str | None = None


class RoutingFlags(BaseModel):
    policy_active: bool
    no_fault_state: bool
    escalation_needed: bool
    policy_validation_passed: bool
    validation_message: str


class PolicyInfo(BaseModel):
    policy_id: str
    policy_type: str
    status: str
    state: str
    no_fault_state: bool
    effective_date: date
    expiry_date: date
    policy_pdf_url: str | None = None
    insured_details: InsuredDetails
    residential_addr: Address
    mailing_addr: Address


class PolicyLookupResponse(BaseModel):
    success: bool
    agent_meta: AgentMeta
    policy_info: PolicyInfo
    policy_attributes: PolicyAttributes
    vehicles: list[Vehicle]
    drivers: list[Driver]
    routing_flags: RoutingFlags


# ═══════════════════════════════════════════════════════
# FNOL INTAKE
# ═══════════════════════════════════════════════════════

class FnolRequest(BaseModel):
    policy_id: str
    loss_type: str = Field(..., examples=["Collision"])
    collision_sub_type: str | None = None
    incident_date: date
    incident_time: str | None = None
    incident_location: str
    incident_state: str
    narrative_text: str
    airbag_deployed: bool = False
    injury_flag: bool = False
    police_report_filed: bool = False
    police_report_number: str | None = None
    responding_agency: str | None = None
    vehicle_drivable: bool = True
    other_party_involved: bool = False
    fault_assessment: str | None = None
    distress_flag: bool = False
    auto_escalate: bool = False
    channel: str = "Voice"


class FnolResponse(BaseModel):
    success: bool
    fnol_id: str
    policy_id: str
    message: str
    routing_flags: dict[str, Any]


# ═══════════════════════════════════════════════════════
# CLAIM CREATION
# ═══════════════════════════════════════════════════════

class ClaimCreateRequest(BaseModel):
    policy_id: str
    fnol_id: str
    loss_type: str
    incident_date: date
    incident_location: str
    incident_state: str
    narrative_text: str
    auto_escalate: bool = False
    distress_flag: bool = False
    channel: str = "Voice"
    adjuster_tier: int = Field(default=1, ge=1, le=3)


class ClaimCreateResponse(BaseModel):
    success: bool
    claim_id: str
    policy_id: str
    status: str
    adjuster_tier: int
    dataverse_synced: bool
    message: str


# ═══════════════════════════════════════════════════════
# DOCUMENT UPLOAD
# ═══════════════════════════════════════════════════════

class DocumentUploadResponse(BaseModel):
    success: bool
    claim_id: str
    document_id: str
    document_type: str
    blob_url: str
    message: str


# ═══════════════════════════════════════════════════════
# VALIDATION
# ═══════════════════════════════════════════════════════

class ValidationRequest(BaseModel):
    claim_id: str
    policy_id: str
    loss_type: str
    incident_date: date
    incident_location: str
    incident_state: str
    weather_factor: bool = False
    vehicle_vin: str | None = None
    estimated_amount: float | None = None


class ValidationResult(BaseModel):
    check_name: str
    passed: bool
    detail: str
    confidence_delta: float     # positive = confidence boost, negative = reduction


class ValidationResponse(BaseModel):
    success: bool
    claim_id: str
    overall_passed: bool
    confidence_score: float
    results: list[ValidationResult]
    escalate: bool


# ═══════════════════════════════════════════════════════
# ADJUDICATION
# ═══════════════════════════════════════════════════════

class AdjudicationRequest(BaseModel):
    claim_id: str
    policy_id: str
    loss_type: str
    validation_confidence: float
    auto_escalate: bool = False
    distress_flag: bool = False
    injury_flag: bool = False
    estimated_amount: float | None = None
    deductible: float | None = None


class AdjudicationResponse(BaseModel):
    success: bool
    claim_id: str
    decision: str           # AUTO_APPROVED | ADJUSTER_REVIEW | ESCALATED
    adjuster_tier: int      # 1 | 2 | 3
    confidence_score: float
    recommended_payout: float | None = None
    rationale: str
    decision_rationale_logged: bool
