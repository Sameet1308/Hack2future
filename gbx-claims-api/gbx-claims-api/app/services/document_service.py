"""
app/services/document_service.py
Streams uploaded files to Azure Blob Storage using Managed Identity.
Records document metadata in gbx.gbx_Documents for the claim record.
"""

import uuid
import logging
from datetime import datetime
from azure.storage.blob.aio import BlobServiceClient
from azure.identity.aio import DefaultAzureCredential
from app.core.config import get_settings
from app.core.database import db_cursor
from app.models.schemas import DocumentUploadResponse

logger = logging.getLogger(__name__)
settings = get_settings()


async def upload_document(
    claim_id: str,
    document_type: str,
    filename: str,
    content: bytes,
    content_type: str,
) -> DocumentUploadResponse:
    """
    1. Upload file to Azure Blob under  claims/{claim_id}/{doc_id}/{filename}
    2. Write document metadata row to gbx.gbx_Documents
    3. Return blob URL + document_id to caller
    """
    doc_id = f"DOC-{uuid.uuid4().hex[:10].upper()}"
    blob_name = f"claims/{claim_id}/{doc_id}/{filename}"
    now = datetime.utcnow()

    # ── Upload to Azure Blob (Managed Identity) ───────────────────────────────
    async with DefaultAzureCredential() as credential:
        async with BlobServiceClient(
            account_url=settings.BLOB_ACCOUNT_URL,
            credential=credential,
        ) as blob_client:
            container = blob_client.get_container_client(settings.BLOB_CONTAINER)
            blob = container.get_blob_client(blob_name)
            await blob.upload_blob(content, overwrite=True, content_type=content_type)
            blob_url = blob.url

    # ── Persist metadata to Azure SQL ─────────────────────────────────────────
    with db_cursor() as cur:
        # ── STORED PROCEDURE PLACEHOLDER ──────────────────────────────
        # Replace with: EXEC sp_CreateDocument @doc_id, @claim_id, ...
        cur.execute("""
            INSERT INTO gbx.gbx_Documents (
                gbx_doc_id, gbx_claim_id, gbx_document_type,
                gbx_filename, gbx_blob_url, gbx_content_type,
                gbx_uploaded_at
            ) VALUES (?,?,?,?,?,?,?)
        """,
            doc_id, claim_id, document_type,
            filename, blob_url, content_type, now,
        )

    logger.info(f"Document uploaded: {doc_id} | Claim: {claim_id} | Type: {document_type}")

    return DocumentUploadResponse(
        success=True,
        claim_id=claim_id,
        document_id=doc_id,
        document_type=document_type,
        blob_url=blob_url,
        message=f"Document {doc_id} uploaded successfully.",
    )
