"""
app/core/dataverse.py
Thin async client that syncs completed claim records to Dataverse
so Copilot Studio agents can read them via the standard D365 connector.
Called after a claim is created in Azure SQL (fire-and-forget via background task).
"""

import logging
import httpx
from azure.identity.aio import DefaultAzureCredential
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def _get_dataverse_token() -> str:
    async with DefaultAzureCredential() as credential:
        token = await credential.get_token(settings.DATAVERSE_SCOPE)
        return token.token


async def sync_claim_to_dataverse(claim_payload: dict) -> bool:
    """
    Upserts a claim record in the Dataverse 'gbx_claims' custom table.
    Returns True on success, False on failure (non-blocking — Azure SQL is source of truth).

    Dataverse table API name: gbx_claims
    Primary field: gbx_claimid (maps to our ClaimID)
    """
    try:
        token = await _get_dataverse_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            "Prefer": "return=representation",
        }

        # Map to Dataverse column names
        dv_record = {
            "gbx_claimid":          claim_payload.get("claim_id"),
            "gbx_policyid":         claim_payload.get("policy_id"),
            "gbx_losstype":         claim_payload.get("loss_type"),
            "gbx_status":           claim_payload.get("status"),
            "gbx_incidentdate":     claim_payload.get("incident_date"),
            "gbx_incidentlocation": claim_payload.get("incident_location"),
            "gbx_channel":          claim_payload.get("channel"),
            "gbx_autoescalate":     claim_payload.get("auto_escalate", False),
            "gbx_distressflag":     claim_payload.get("distress_flag", False),
        }

        url = f"{settings.DATAVERSE_URL}/api/data/v9.2/gbx_claims"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, json=dv_record, headers=headers)
            resp.raise_for_status()
            logger.info(f"Claim {claim_payload.get('claim_id')} synced to Dataverse")
            return True

    except Exception as e:
        # Non-fatal — Azure SQL is source of truth
        logger.error(f"Dataverse sync failed for claim {claim_payload.get('claim_id')}: {e}")
        return False
