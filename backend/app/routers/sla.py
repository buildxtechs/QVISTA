import datetime as dt
from typing import Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services.sla_engine import recompute_all_sla

router = APIRouter(prefix="/api/sla", tags=["sla"])


@router.get("/rules", response_model=list[schemas.SLARuleOut])
def list_rules(db: Session = Depends(get_db)):
    return db.query(models.SLARule).order_by(models.SLARule.severity.desc()).all()


@router.put("/rules", response_model=list[schemas.SLARuleOut])
def update_rules(rules: list[schemas.SLARuleIn], db: Session = Depends(get_db)):
    for rule_in in rules:
        rule = db.query(models.SLARule).filter_by(severity=rule_in.severity).first()
        if rule:
            rule.sla_days = rule_in.sla_days
        else:
            db.add(models.SLARule(severity=rule_in.severity, sla_days=rule_in.sla_days))
    db.commit()

    recompute_all_sla(db)
    return db.query(models.SLARule).order_by(models.SLARule.severity.desc()).all()


@router.get("/governance-overview")
def governance_overview(
    apm_id: str | None = None,
    asset_group: str | None = None,
    db: Session = Depends(get_db),
):
    """Provides comprehensive SLA governance metrics, aging distribution, breach velocity, and remediation priority queue."""
    q = (
        db.query(models.HostDetection)
        .join(models.Asset, models.HostDetection.asset_id == models.Asset.id)
        .join(models.Vulnerability, models.HostDetection.vulnerability_id == models.Vulnerability.id)
    )
    if apm_id:
        q = q.filter(models.Asset.apm_id.ilike(f"%{apm_id}%"))
    if asset_group:
        q = q.filter(models.Asset.asset_group == asset_group.upper())

    open_detections = q.filter(models.HostDetection.status != "Fixed").all()
    fixed_detections = q.filter(models.HostDetection.status == "Fixed").all()

    total_open = len(open_detections)
    total_fixed = len(fixed_detections)
    breached_count = sum(1 for d in open_detections if d.sla_status == "BREACHED")
    within_sla_count = sum(1 for d in open_detections if d.sla_status == "WITHIN_SLA" or d.sla_status is None)
    
    compliance_rate = round((within_sla_count / total_open * 100), 1) if total_open > 0 else 100.0

    # Severity Breakdown with SLA definitions
    sev_stats: dict[int, dict[str, Any]] = {
        5: {"severity": 5, "label": "Severity 5 - Critical", "target_days": 30, "total": 0, "breached": 0, "within": 0},
        4: {"severity": 4, "label": "Severity 4 - High", "target_days": 120, "special_target": "90d for IF/PCI", "total": 0, "breached": 0, "within": 0},
        3: {"severity": 3, "label": "Severity 3 - Medium", "target_days": 180, "total": 0, "breached": 0, "within": 0},
        2: {"severity": 2, "label": "Severity 2 - Low", "target_days": 180, "total": 0, "breached": 0, "within": 0},
        1: {"severity": 1, "label": "Severity 1 - Info", "target_days": 180, "total": 0, "breached": 0, "within": 0},
    }

    # High-Risk At-Risk Detection Queue (Overdue or within 5 days of breach)
    priority_queue = []

    for d in open_detections:
        v = d.vulnerability
        a = d.asset
        sev = v.severity if v else 3
        if sev in sev_stats:
            sev_stats[sev]["total"] = int(sev_stats[sev]["total"]) + 1
            if d.sla_status == "BREACHED":
                sev_stats[sev]["breached"] = int(sev_stats[sev]["breached"]) + 1
            else:
                sev_stats[sev]["within"] = int(sev_stats[sev]["within"]) + 1

        # Calculate days left
        sla_target = d.sla_days or 30
        age = d.age_days or 0
        days_left = sla_target - age

        if d.sla_status == "BREACHED" or (days_left <= 7 and sev >= 4):
            priority_queue.append({
                "id": d.id,
                "qid": v.qid if v else "—",
                "title": v.title if v else "Unnamed Finding",
                "severity": sev,
                "cve": v.cve if v else "—",
                "hostname": a.dns or a.fqdn or a.ip if a else "—",
                "ip": a.ip if a else "—",
                "cloud_provider": a.cloud_provider if a else "Network",
                "apm_id": a.apm_id if a else "—",
                "app_owner": a.app_owner if a else "Unassigned",
                "internet_facing": a.internet_facing if a else False,
                "pci_scope": a.pci_scope if a else False,
                "age_days": age,
                "sla_target_days": sla_target,
                "days_left": days_left,
                "is_breached": d.sla_status == "BREACHED",
            })

    # Sort priority queue by severity desc and days_left asc
    priority_queue.sort(key=lambda x: (x["severity"] * -1, x["days_left"]))

    # APM SLA Compliance Leaderboard
    apm_compliance = {}
    for d in open_detections:
        a = d.asset
        if not a:
            continue
        apm_key = a.apm_id or (a.application.name if a.application else "Unassigned APM")
        if apm_key not in apm_compliance:
            apm_compliance[apm_key] = {
                "apm_id": a.apm_id or "N/A",
                "app_name": a.application.name if a.application else "General App",
                "app_owner": a.app_owner or "Unassigned",
                "business_owner": a.business_owner or "Unassigned",
                "total_open": 0,
                "breached": 0,
                "within": 0,
                "crit": 0,
                "high": 0,
                "internet_facing": a.internet_facing,
                "pci_scope": a.pci_scope,
            }
        apm_compliance[apm_key]["total_open"] += 1
        if d.sla_status == "BREACHED":
            apm_compliance[apm_key]["breached"] += 1
        else:
            apm_compliance[apm_key]["within"] += 1
        if d.vulnerability:
            if d.vulnerability.severity == 5:
                apm_compliance[apm_key]["crit"] += 1
            elif d.vulnerability.severity == 4:
                apm_compliance[apm_key]["high"] += 1

    leaderboard = []
    for apm in apm_compliance.values():
        rate = round((apm["within"] / apm["total_open"] * 100), 1) if apm["total_open"] > 0 else 100.0
        apm["compliance_rate"] = rate
        leaderboard.append(apm)

    leaderboard.sort(key=lambda x: (x["breached"], x["crit"]), reverse=True)

    return {
        "total_open": total_open,
        "total_fixed": total_fixed,
        "breached_count": breached_count,
        "within_sla_count": within_sla_count,
        "compliance_rate": compliance_rate,
        "severity_breakdown": list(sev_stats.values()),
        "priority_queue": priority_queue[:40],
        "apm_leaderboard": leaderboard[:25],
    }
