import datetime as dt

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=schemas.DashboardSummary)
def summary(
    apm_id: str | None = None,
    asset_group: str | None = None,
    app_owner: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    open_q = (
        db.query(models.HostDetection)
        .join(models.Asset, models.HostDetection.asset_id == models.Asset.id)
    )
    if status:
        open_q = open_q.filter(models.HostDetection.status.ilike(f"%{status}%"))
    else:
        open_q = open_q.filter(models.HostDetection.status != "Fixed")

    asset_q = db.query(models.Asset)

    if apm_id:
        open_q = open_q.filter(models.Asset.apm_id.ilike(f"%{apm_id}%"))
        asset_q = asset_q.filter(models.Asset.apm_id.ilike(f"%{apm_id}%"))
    if asset_group:
        open_q = open_q.filter(models.Asset.asset_group == asset_group.upper())
        asset_q = asset_q.filter(models.Asset.asset_group == asset_group.upper())
    if app_owner:
        open_q = open_q.filter(models.Asset.app_owner.ilike(f"%{app_owner}%"))
        asset_q = asset_q.filter(models.Asset.app_owner.ilike(f"%{app_owner}%"))

    def count_by_severity(sev):
        return (
            open_q.join(models.Vulnerability, models.HostDetection.vulnerability_id == models.Vulnerability.id)
            .filter(models.Vulnerability.severity == sev)
            .count()
        )

    week_ago = dt.datetime.utcnow() - dt.timedelta(days=7)

    return schemas.DashboardSummary(
        assets=asset_q.count(),
        vulnerabilities_open=open_q.count(),
        critical=count_by_severity(5),
        high=count_by_severity(4),
        medium=count_by_severity(3),
        low=open_q.join(models.Vulnerability, models.HostDetection.vulnerability_id == models.Vulnerability.id).filter(models.Vulnerability.severity <= 2).count(),
        sla_breached=open_q.filter(models.HostDetection.sla_status == "BREACHED").count(),
        new_last_7_days=open_q.filter(models.HostDetection.first_found >= week_ago).count(),
        fixed_last_7_days=(
            db.query(models.HostDetection)
            .join(models.Asset, models.HostDetection.asset_id == models.Asset.id)
            .filter(models.HostDetection.status == "Fixed", models.HostDetection.date_last_fixed >= week_ago)
            .count()
        ),
        reopened_total=open_q.filter(models.HostDetection.times_reopened > 0).count(),
        cloud_matched=db.query(models.CloudInventory).filter_by(match_status="MATCHED").count(),
        cloud_unmatched=db.query(models.CloudInventory).filter_by(match_status="UNMATCHED").count(),
        aws_assets=asset_q.filter(
            (models.Asset.asset_group == "AWS") | (models.Asset.cloud_provider == "AWS")
        ).count(),
        azure_assets=asset_q.filter(
            (models.Asset.asset_group == "AZURE") | (models.Asset.cloud_provider == "AZURE")
        ).count(),
        network_assets=asset_q.filter(
            (models.Asset.asset_group == "NETWORK") | (models.Asset.os.ilike("%cisco%"))
        ).count(),
    )


@router.get("/aging", response_model=list[schemas.AgingBucket])
def aging_buckets(
    apm_id: str | None = None,
    asset_group: str | None = None,
    db: Session = Depends(get_db),
):
    buckets = [
        ("0-7 days", 0, 7),
        ("8-30 days", 8, 30),
        ("31-60 days", 31, 60),
        ("61-90 days", 61, 90),
        ("91-180 days", 91, 180),
        ("180+ days", 181, 100000),
    ]
    open_q = (
        db.query(models.HostDetection)
        .join(models.Asset, models.HostDetection.asset_id == models.Asset.id)
        .filter(models.HostDetection.status != "Fixed", models.HostDetection.age_days.isnot(None))
    )
    if apm_id:
        open_q = open_q.filter(models.Asset.apm_id.ilike(f"%{apm_id}%"))
    if asset_group:
        open_q = open_q.filter(models.Asset.asset_group == asset_group.upper())

    results = []
    for label, lo, hi in buckets:
        count = open_q.filter(models.HostDetection.age_days >= lo, models.HostDetection.age_days <= hi).count()
        results.append(schemas.AgingBucket(label=label, count=count))
    return results


@router.get("/trend")
def vulnerability_trend(db: Session = Depends(get_db)):
    """Daily new-vs-fixed counts for the last 30 days, for the dashboard sparkline."""
    since = dt.datetime.utcnow() - dt.timedelta(days=30)
    rows = (
        db.query(
            func.date(models.HostDetection.first_found).label("day"),
            func.count().label("new_count"),
        )
        .filter(models.HostDetection.first_found >= since)
        .group_by("day")
        .order_by("day")
        .all()
    )
    return [{"date": str(r.day), "new_findings": r.new_count} for r in rows if r.day]


@router.get("/top-vulnerable-applications")
def top_vulnerable_applications(limit: int = 10, db: Session = Depends(get_db)):
    rows = (
        db.query(models.Application.name, func.count(models.HostDetection.id).label("count"))
        .join(models.Asset, models.Asset.application_id == models.Application.id)
        .join(models.HostDetection, models.HostDetection.asset_id == models.Asset.id)
        .filter(models.HostDetection.status != "Fixed")
        .group_by(models.Application.name)
        .order_by(func.count(models.HostDetection.id).desc())
        .limit(limit)
        .all()
    )
    return [{"application": r[0], "open_findings": r[1]} for r in rows]


@router.get("/top-critical-qids")
def top_critical_qids(limit: int = 10, db: Session = Depends(get_db)):
    rows = (
        db.query(
            models.Vulnerability.qid,
            models.Vulnerability.title,
            models.Vulnerability.severity,
            func.count(models.HostDetection.id).label("affected_assets"),
        )
        .join(models.HostDetection, models.HostDetection.vulnerability_id == models.Vulnerability.id)
        .filter(models.Vulnerability.severity == 5, models.HostDetection.status != "Fixed")
        .group_by(models.Vulnerability.id)
        .order_by(func.count(models.HostDetection.id).desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "qid": r[0],
            "title": r[1],
            "severity": r[2],
            "affected_assets": r[3],
        }
        for r in rows
    ]
