"""app/routers/documents.py"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from app.core.auth import require_auth
from app.models.schemas import DocumentUploadResponse
from app.services.document_service import upload_document

router = APIRouter(prefix="/documents", tags=["Documents"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "application/pdf"}
MAX_SIZE_MB = 20

@router.post("/upload", response_model=DocumentUploadResponse,
             summary="Upload a claim document to Azure Blob Storage")
async def document_upload(
    claim_id: str = Form(...),
    document_type: str = Form(..., examples=["Police Report"]),
    file: UploadFile = File(...),
    _: dict = Depends(require_auth),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type '{file.content_type}' not allowed. Accepted: JPEG, PNG, PDF.",
        )
    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {MAX_SIZE_MB}MB limit.",
        )
    try:
        return await upload_document(claim_id, document_type, file.filename, content, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
