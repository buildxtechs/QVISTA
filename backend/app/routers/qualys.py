import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db, SessionLocal
from app.qualys_client import QualysClient, QualysAPIError
from app.security import encrypt_secret, decrypt_secret
from app.services.sync_service import run_sync

router = APIRouter(prefix="/api/qualys", tags=["qualys"])


@router.get("/connections", response_model=list[schemas.QualysConnectionOut])
def list_connections(db: Session = Depends(get_db)):
    """List all configured Qualys VMDR connection profiles."""
    return db.query(models.QualysConnection).order_by(models.QualysConnection.created_at.desc()).all()


@router.get("/connection", response_model=schemas.QualysConnectionOut | None)
def get_active_connection(db: Session = Depends(get_db)):
    """Get the currently active Qualys VMDR connection."""
    return db.query(models.QualysConnection).filter_by(is_active=True).first()


@router.get("/connections/{conn_id}", response_model=schemas.QualysConnectionOut)
def get_connection_by_id(conn_id: int, db: Session = Depends(get_db)):
    conn = db.query(models.QualysConnection).get(conn_id)
    if not conn:
        raise HTTPException(404, "Connection profile not found")
    return conn


@router.post("/connection", response_model=schemas.QualysConnectionOut)
@router.post("/connections", response_model=schemas.QualysConnectionOut)
def create_connection(payload: schemas.QualysConnectionIn, db: Session = Depends(get_db)):
    """Create a new Qualys VMDR connection profile (CRUD - Create)."""
    # Deactivate existing if this is set as active
    db.query(models.QualysConnection).update({"is_active": False})

    conn = models.QualysConnection(
        name=payload.name,
        platform_url=payload.platform_url.rstrip("/"),
        username=payload.username,
        encrypted_password=encrypt_secret(payload.password),
        is_active=True,
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return conn


@router.put("/connections/{conn_id}", response_model=schemas.QualysConnectionOut)
def update_connection(conn_id: int, payload: schemas.QualysConnectionUpdate, db: Session = Depends(get_db)):
    """Update an existing Qualys connection profile (CRUD - Update)."""
    conn = db.query(models.QualysConnection).get(conn_id)
    if not conn:
        raise HTTPException(404, "Connection profile not found")

    if payload.name is not None:
        conn.name = payload.name
    if payload.platform_url is not None:
        conn.platform_url = payload.platform_url.rstrip("/")
    if payload.username is not None:
        conn.username = payload.username
    if payload.password is not None and payload.password.strip():
        conn.encrypted_password = encrypt_secret(payload.password)
    if payload.is_active is not None and payload.is_active:
        db.query(models.QualysConnection).update({"is_active": False})
        conn.is_active = True

    db.commit()
    db.refresh(conn)
    return conn


@router.delete("/connections/{conn_id}")
def delete_connection(conn_id: int, db: Session = Depends(get_db)):
    """Delete a Qualys connection profile (CRUD - Delete)."""
    conn = db.query(models.QualysConnection).get(conn_id)
    if not conn:
        raise HTTPException(404, "Connection profile not found")
    db.delete(conn)
    db.commit()
    return {"status": "success", "message": f"Connection {conn_id} deleted successfully."}


@router.post("/connections/{conn_id}/set-active", response_model=schemas.QualysConnectionOut)
def set_active_connection(conn_id: int, db: Session = Depends(get_db)):
    """Set a specific Qualys connection as active."""
    conn = db.query(models.QualysConnection).get(conn_id)
    if not conn:
        raise HTTPException(404, "Connection profile not found")
    db.query(models.QualysConnection).update({"is_active": False})
    conn.is_active = True
    db.commit()
    db.refresh(conn)
    return conn


@router.post("/connection/test")
@router.post("/connections/{conn_id}/test")
def test_connection(conn_id: int | None = None, db: Session = Depends(get_db)):
    """Test Qualys API credentials and platform URL."""
    if conn_id:
        conn = db.query(models.QualysConnection).get(conn_id)
    else:
        conn = db.query(models.QualysConnection).filter_by(is_active=True).first()

    if not conn:
        raise HTTPException(404, "No Qualys connection configured yet.")

    try:
        client = QualysClient(conn.platform_url, conn.username, decrypt_secret(conn.encrypted_password))
        client.test_connection()
        conn.last_test_status = "success"
        conn.last_tested_at = dt.datetime.utcnow()
        db.commit()
        return {"status": "success", "message": f"Successfully connected to Qualys API at {conn.platform_url}."}
    except Exception as exc:
        conn.last_test_status = "failed"
        conn.last_tested_at = dt.datetime.utcnow()
        db.commit()
        raise HTTPException(400, str(exc))


def _run_sync_job(sync_id: int):
    db = SessionLocal()
    try:
        sync_record = db.query(models.SyncHistory).get(sync_id)
        run_sync(db, sync_record)
    finally:
        db.close()


@router.post("/sync", response_model=schemas.SyncStatusOut)
def trigger_sync(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    conn = db.query(models.QualysConnection).filter_by(is_active=True).first()
    if not conn:
        raise HTTPException(400, "Configure and activate a Qualys connection before syncing.")

    sync_record = models.SyncHistory(status="running")
    db.add(sync_record)
    db.commit()
    db.refresh(sync_record)

    sync_id = int(sync_record.id)
    background_tasks.add_task(_run_sync_job, sync_id)
    return sync_record


@router.get("/sync/history", response_model=list[schemas.SyncStatusOut])
def sync_history(db: Session = Depends(get_db)):
    return (
        db.query(models.SyncHistory)
        .order_by(models.SyncHistory.started_at.desc())
        .limit(20)
        .all()
    )


@router.get("/sync/{sync_id}", response_model=schemas.SyncStatusOut)
def sync_status(sync_id: int, db: Session = Depends(get_db)):
    record = db.query(models.SyncHistory).get(sync_id)
    if not record:
        raise HTTPException(404, "Sync job not found")
    return record
