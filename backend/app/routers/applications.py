from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.database import get_db

router = APIRouter(prefix="/api/applications", tags=["applications"])


@router.get("")
def list_applications(db: Session = Depends(get_db)):
    apps = db.query(models.Application).all()
    results = []
    for app in apps:
        detections = [d for a in app.assets for d in a.detections if d.status != "Fixed"]
        results.append(
            {
                "id": app.id,
                "name": app.name,
                "environment": app.environment,
                "business_owner": app.business_owner,
                "assets": len(app.assets),
                "critical": sum(1 for d in detections if d.vulnerability.severity == 5),
                "high": sum(1 for d in detections if d.vulnerability.severity == 4),
                "medium": sum(1 for d in detections if d.vulnerability.severity == 3),
                "sla_breached": sum(1 for d in detections if d.sla_status == "BREACHED"),
            }
        )
    return sorted(results, key=lambda r: r["critical"] + r["high"], reverse=True)


@router.get("/{app_id}")
def application_detail(app_id: int, db: Session = Depends(get_db)):
    app = db.query(models.Application).get(app_id)
    if not app:
        raise HTTPException(404, "Application not found")

    detections = [d for a in app.assets for d in a.detections]
    open_detections = [d for d in detections if d.status != "Fixed"]

    qid_counts: dict = {}
    for d in open_detections:
        qid_counts[d.vulnerability.qid] = qid_counts.get(d.vulnerability.qid, 0) + 1
    top_qids = sorted(qid_counts.items(), key=lambda kv: kv[1], reverse=True)[:10]

    asset_counts = sorted(
        ((a.dns or a.fqdn or a.ip, sum(1 for d in a.detections if d.status != "Fixed")) for a in app.assets),
        key=lambda x: x[1],
        reverse=True,
    )[:10]

    return {
        "id": app.id,
        "name": app.name,
        "environment": app.environment,
        "business_owner": app.business_owner,
        "technical_owner": app.owner.name if app.owner else None,
        "assets": len(app.assets),
        "vulnerabilities_open": len(open_detections),
        "fixed": sum(1 for d in detections if d.status == "Fixed"),
        "reopened": sum(1 for d in detections if d.times_reopened > 0),
        "sla_breached": sum(1 for d in open_detections if d.sla_status == "BREACHED"),
        "top_qids": [{"qid": q, "count": c} for q, c in top_qids],
        "most_vulnerable_servers": [{"hostname": h, "open_findings": c} for h, c in asset_counts],
    }
