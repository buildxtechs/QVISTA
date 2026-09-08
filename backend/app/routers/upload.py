from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.services.file_ingestion import ingest_cloud_inventory
from app.services.matching_engine import rematch_all

router = APIRouter(prefix="/api/upload", tags=["upload"])

ALLOWED_EXTENSIONS = (".csv", ".xlsx", ".xls")


@router.post("/cloud-inventory")
async def upload_cloud_inventory(
    file: UploadFile = File(...),
    cloud_provider: str = Form(...),  # "AWS" | "AZURE"
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith(ALLOWED_EXTENSIONS):
        raise HTTPException(400, f"Unsupported file type. Allowed: {ALLOWED_EXTENSIONS}")
    if cloud_provider.upper() not in ("AWS", "AZURE"):
        raise HTTPException(400, "cloud_provider must be AWS or AZURE")

    content = await file.read()
    try:
        result = ingest_cloud_inventory(db, file.filename, content, cloud_provider.upper())
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(400, f"Could not parse file: {exc}")

    return result


@router.post("/rematch")
def rematch(db: Session = Depends(get_db)):
    """Re-run the matching engine against all uploaded cloud inventory rows -
    useful after a fresh Qualys sync brings in new assets."""
    return rematch_all(db)


@router.get("/history")
def upload_history(db: Session = Depends(get_db)):
    rows = (
        db.query(
            models.CloudInventory.source_file,
            models.CloudInventory.cloud_provider,
            models.CloudInventory.uploaded_at,
        )
        .distinct()
        .order_by(models.CloudInventory.uploaded_at.desc())
        .limit(20)
        .all()
    )
    return [{"filename": r[0], "cloud_provider": r[1], "uploaded_at": r[2]} for r in rows]
