import datetime as dt
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app import models

router = APIRouter(prefix="/api/exceptions", tags=["Exceptions & Risk Acceptance"])


class ExceptionCreate(BaseModel):
    qid: str
    title: str
    cve: str | None = None
    asset_group: str = "AWS"
    hostname: str | None = None
    requested_by: str | None = "Security Team"
    approved_by: str | None = "CISO Office"
    reason: str
    status: str = "APPROVED"  # APPROVED, PENDING_APPROVAL, FALSE_POSITIVE
    expires_in_days: int = 60


class ExceptionUpdate(BaseModel):
    title: str | None = None
    reason: str | None = None
    status: str | None = None
    approved_by: str | None = None
    expires_in_days: int | None = None


@router.get("")
def list_exceptions(
    search: str = Query(None),
    status: str = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(models.Exception_)

    if status and status != "ALL":
        query = query.filter(models.Exception_.status == status)

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                models.Exception_.title.ilike(s),
                models.Exception_.qid.ilike(s),
                models.Exception_.cve.ilike(s),
                models.Exception_.hostname.ilike(s),
                models.Exception_.requested_by.ilike(s),
                models.Exception_.approved_by.ilike(s),
                models.Exception_.reason.ilike(s),
            )
        )

    items = query.order_by(models.Exception_.id.desc()).all()
    
    # Auto-seed initial enterprise items if table is completely empty
    if not items and not search and not status:
        initial = [
            models.Exception_(
                qid="38173",
                cve="CVE-2023-48795",
                title="Terrapin SSH Attack Mitigated by WAF",
                asset_group="AWS",
                hostname="aws-ec2-prod-gateway-01",
                requested_by="Alex Morgan (Cloud Sec)",
                approved_by="CISO Office",
                reason="Compensating network controls implemented at perimeter ALB.",
                status="APPROVED",
                expires_in_days=42,
                created_at=dt.datetime.utcnow() - dt.timedelta(days=18),
            ),
            models.Exception_(
                qid="379234",
                cve="CVE-2024-21626",
                title="runc Container Breakout Risk Acceptance",
                asset_group="AZURE",
                hostname="azure-vm-prod-k8s-node-04",
                requested_by="DevOps Lead",
                approved_by="Security Council",
                reason="Vendor upstream kernel patch scheduled for Q4 maintenance window.",
                status="APPROVED",
                expires_in_days=18,
                created_at=dt.datetime.utcnow() - dt.timedelta(days=12),
            ),
            models.Exception_(
                qid="105342",
                cve="CVE-2024-38077",
                title="Windows Remote Desktop Licensing Service RCE",
                asset_group="NETWORK",
                hostname="cisco-gw-dc01-core",
                requested_by="Network Admin",
                approved_by="Pending CISO",
                reason="Isolated inside non-routable management VLAN with air-gap.",
                status="PENDING_APPROVAL",
                expires_in_days=90,
                created_at=dt.datetime.utcnow() - dt.timedelta(days=5),
            ),
            models.Exception_(
                qid="91543",
                cve="CVE-2024-6387",
                title="OpenSSH RegreSSHion False Positive",
                asset_group="AWS",
                hostname="aws-ec2-auth-svc-02",
                requested_by="AppSec Team",
                approved_by="Lead Auditor",
                reason="Verified glibc version is hardened against race condition exploitation.",
                status="FALSE_POSITIVE",
                expires_in_days=365,
                created_at=dt.datetime.utcnow() - dt.timedelta(days=2),
            ),
        ]
        db.add_all(initial)
        db.commit()
        for item in initial:
            db.refresh(item)
        items = initial

    return [
        {
            "id": ex.id,
            "qid": ex.qid or "",
            "cve": ex.cve or "",
            "title": ex.title,
            "asset_group": ex.asset_group or "AWS",
            "hostname": ex.hostname or "",
            "requested_by": ex.requested_by or "",
            "approved_by": ex.approved_by or "",
            "reason": ex.reason,
            "status": ex.status,
            "expires_in_days": ex.expires_in_days,
            "created_at": ex.created_at.strftime("%Y-%m-%d") if ex.created_at else "",
        }
        for ex in items
    ]


@router.post("")
def create_exception(payload: ExceptionCreate, db: Session = Depends(get_db)):
    cve = payload.cve
    if not cve and payload.qid:
        vuln = db.query(models.Vulnerability).filter_by(qid=payload.qid).first()
        if vuln and vuln.cve:
            cve = vuln.cve

    ex = models.Exception_(
        qid=payload.qid,
        cve=cve or "",
        title=payload.title,
        asset_group=payload.asset_group,
        hostname=payload.hostname or "",
        requested_by=payload.requested_by or "Security Analyst",
        approved_by=payload.approved_by or "Pending CISO",
        reason=payload.reason,
        status=payload.status,
        expires_in_days=payload.expires_in_days,
        expires_at=dt.datetime.utcnow() + dt.timedelta(days=payload.expires_in_days),
        created_at=dt.datetime.utcnow(),
    )
    db.add(ex)
    db.commit()
    db.refresh(ex)

    if payload.qid:
        vuln = db.query(models.Vulnerability).filter_by(qid=payload.qid).first()
        if vuln:
            db.query(models.HostDetection).filter(
                models.HostDetection.vulnerability_id == vuln.id
            ).update(
                {
                    "is_exception_approved": True,
                    "exception_id": ex.id,
                    "sla_status": "EXCEPTION",
                },
                synchronize_session=False,
            )
            db.commit()

    return {
        "id": ex.id,
        "qid": ex.qid,
        "cve": ex.cve,
        "title": ex.title,
        "asset_group": ex.asset_group,
        "hostname": ex.hostname,
        "requested_by": ex.requested_by,
        "approved_by": ex.approved_by,
        "reason": ex.reason,
        "status": ex.status,
        "expires_in_days": ex.expires_in_days,
        "created_at": ex.created_at.strftime("%Y-%m-%d"),
    }


@router.put("/{id}")
def update_exception(id: int, payload: ExceptionUpdate, db: Session = Depends(get_db)):
    ex = db.query(models.Exception_).filter_by(id=id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exception not found")

    if payload.title is not None:
        ex.title = payload.title
    if payload.reason is not None:
        ex.reason = payload.reason
    if payload.status is not None:
        ex.status = payload.status
    if payload.approved_by is not None:
        ex.approved_by = payload.approved_by
    if payload.expires_in_days is not None:
        ex.expires_in_days = payload.expires_in_days

    db.commit()
    db.refresh(ex)
    return {"status": "ok", "id": ex.id, "current_status": ex.status}


@router.delete("/{id}")
def delete_exception(id: int, db: Session = Depends(get_db)):
    ex = db.query(models.Exception_).filter_by(id=id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exception not found")

    db.query(models.HostDetection).filter_by(exception_id=ex.id).update(
        {
            "is_exception_approved": False,
            "exception_id": None,
            "sla_status": "WITHIN_SLA",
        },
        synchronize_session=False,
    )

    db.delete(ex)
    db.commit()
    return {"status": "deleted", "id": id}
