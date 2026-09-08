from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.database import get_db

router = APIRouter(prefix="/api/vulnerabilities", tags=["vulnerabilities"])


@router.get("")
def list_vulnerabilities(
    severity: int | None = None,
    category: str | None = None,
    status: str | None = None,
    qid: str | None = None,
    cve: str | None = None,
    search: str | None = None,
    sla_status: str | None = None,
    asset_group: str | None = None,
    apm_id: str | None = None,
    app_owner: str | None = None,
    if_only: bool | None = None,
    pci_only: bool | None = None,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
):
    q = (
        db.query(
            models.Vulnerability.id,
            models.Vulnerability.qid,
            models.Vulnerability.title,
            models.Vulnerability.severity,
            models.Vulnerability.cve,
            models.Vulnerability.category,
            func.count(models.HostDetection.id).label("affected_assets"),
        )
        .join(models.HostDetection, models.HostDetection.vulnerability_id == models.Vulnerability.id)
        .join(models.Asset, models.HostDetection.asset_id == models.Asset.id)
        .group_by(models.Vulnerability.id)
    )

    if severity:
        q = q.filter(models.Vulnerability.severity == severity)
    if category:
        if category.lower() in ("confirmed", "confirmed vulnerability"):
            q = q.filter(
                (models.Vulnerability.category.ilike("%confirmed%")) |
                (models.Vulnerability.category.is_(None)) |
                (models.Vulnerability.vulnerability_category.ilike("%confirmed%"))
            )
        elif category.lower() in ("potential", "potential vulnerability"):
            q = q.filter(
                (models.Vulnerability.category.ilike("%potential%")) |
                (models.Vulnerability.vulnerability_category.ilike("%potential%"))
            )
        else:
            q = q.filter(models.Vulnerability.category.ilike(f"%{category}%"))
    if qid:
        q = q.filter(models.Vulnerability.qid.ilike(f"%{qid}%"))
    if cve:
        q = q.filter(models.Vulnerability.cve.ilike(f"%{cve}%"))
    if search:
        like = f"%{search}%"
        q = q.filter(
            (models.Vulnerability.qid.ilike(like))
            | (models.Vulnerability.title.ilike(like))
            | (models.Vulnerability.cve.ilike(like))
        )
    if status:
        q = q.filter(models.HostDetection.status == status)
    if sla_status:
        q = q.filter(models.HostDetection.sla_status == sla_status)
    if asset_group:
        q = q.filter(models.Asset.asset_group == asset_group.upper())
    if apm_id:
        q = q.filter(models.Asset.apm_id.ilike(f"%{apm_id}%"))
    if app_owner:
        q = q.filter(models.Asset.app_owner.ilike(f"%{app_owner}%"))
    if if_only:
        q = q.filter(models.Asset.internet_facing == True)
    if pci_only:
        q = q.filter(models.Asset.pci_scope == True)

    total = q.count()
    rows = q.order_by(models.Vulnerability.severity.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "results": [
            {
                "id": r[0],
                "qid": r[1],
                "title": r[2],
                "severity": r[3],
                "cve": r[4],
                "category": r[5] or "Confirmed",
                "affected_assets": r[6],
            }
            for r in rows
        ],
    }


@router.get("/detections-grid")
def list_detections_grid(
    severity: int | None = None,
    category: str | None = None,
    status: str | None = None,
    qid: str | None = Query(None, alias="vulnerability_id"),
    search: str | None = None,
    sla_status: str | None = None,
    asset_group: str | None = None,
    apm_id: str | None = None,
    app_owner: str | None = None,
    if_only: bool | None = None,
    pci_only: bool | None = None,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
):
    """Returns detections formatted with Power BI headers and metadata columns (Vulnerability ID is QID)."""
    q = (
        db.query(models.HostDetection)
        .join(models.Asset, models.HostDetection.asset_id == models.Asset.id)
        .join(models.Vulnerability, models.HostDetection.vulnerability_id == models.Vulnerability.id)
    )

    if severity:
        q = q.filter(models.Vulnerability.severity == severity)
    if category:
        if category.lower() in ("confirmed", "confirmed vulnerability"):
            q = q.filter(
                (models.Vulnerability.category.ilike("%confirmed%")) |
                (models.Vulnerability.category.is_(None)) |
                (models.Vulnerability.vulnerability_category.ilike("%confirmed%"))
            )
        elif category.lower() in ("potential", "potential vulnerability"):
            q = q.filter(
                (models.Vulnerability.category.ilike("%potential%")) |
                (models.Vulnerability.vulnerability_category.ilike("%potential%"))
            )
        else:
            q = q.filter(models.Vulnerability.category.ilike(f"%{category}%"))
    if qid:
        q = q.filter(models.Vulnerability.qid.ilike(f"%{qid}%"))
    if search:
        like = f"%{search}%"
        q = q.filter(
            (models.Vulnerability.qid.ilike(like))
            | (models.Vulnerability.title.ilike(like))
            | (models.Vulnerability.cve.ilike(like))
            | (models.Asset.ip.ilike(like))
            | (models.Asset.dns.ilike(like))
            | (models.Asset.apm_id.ilike(like))
            | (models.Asset.app_owner.ilike(like))
        )
    if status:
        q = q.filter(models.HostDetection.status == status)
    if sla_status:
        q = q.filter(models.HostDetection.sla_status == sla_status)
    if asset_group:
        q = q.filter(models.Asset.asset_group == asset_group.upper())
    if apm_id:
        q = q.filter(models.Asset.apm_id.ilike(f"%{apm_id}%"))
    if app_owner:
        q = q.filter(models.Asset.app_owner.ilike(f"%{app_owner}%"))
    if if_only:
        q = q.filter(models.Asset.internet_facing == True)
    if pci_only:
        q = q.filter(models.Asset.pci_scope == True)

    total = q.count()
    detections = (
        q.order_by(models.Vulnerability.severity.desc(), models.HostDetection.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    results = []
    risk_map = {5: "5 - Critical", 4: "4 - High", 3: "3 - Medium", 2: "2 - Low", 1: "1 - Info"}

    for d in detections:
        a = d.asset
        v = d.vulnerability
        app = a.application

        is_if = "Yes" if a.internet_facing else "No"
        is_pci = "Yes" if a.pci_scope else "No"
        if_or_pci = "Both" if (a.internet_facing and a.pci_scope) else ("IF" if a.internet_facing else ("PCI" if a.pci_scope else "None"))

        results.append({
            "id": d.id,
            "application_name": (app.name if app else None) or a.apm_id or "General Platform",
            "apm_id": a.apm_id or (app.apm_id if app else "") or "N/A",
            "scan_type": d.scan_type or "Qualys VMDR",
            "ip": a.ip,
            "dns": a.dns or a.fqdn or "—",
            "netbios": a.netbios or "—",
            "tracking_method": a.tracking_method or "IP",
            "os": a.os or "Unknown",
            "ip_status": a.asset_status or "Active",
            "unique_id": f"{a.id}-{v.qid}",
            "vulnerability_name": v.title,
            "vulnerability_status": d.status or "Active",
            "type": v.category or "Confirmed",
            "risk_rating": risk_map.get(v.severity, f"{v.severity} - Medium"),
            "severity": v.severity,
            "port": d.port or "0",
            "protocol": d.protocol or "TCP",
            "fqdn": a.fqdn or a.dns or "—",
            "ssl": "No",
            "first_found_date": d.first_found.strftime("%Y-%m-%d") if d.first_found else "—",
            "last_detected": d.last_detected.strftime("%Y-%m-%d") if d.last_detected else "—",
            "times_detected": d.times_detected or 1,
            "date_last_fixed": d.date_last_fixed.strftime("%Y-%m-%d") if d.date_last_fixed else "—",
            "cve_id": v.cve or "—",
            "threat": v.threat or "",
            "impact": v.impact or "",
            "recommendation": v.solution or "",
            "exploitability": v.exploitability or "No Known Exploit",
            "pci_vuln": "Yes" if (d.pci_vuln or a.pci_scope) else "No",
            "ticket_state": d.ticket_state or "OPEN",
            "instance": d.instance_name or a.cloud_instance_id or "—",
            "category": v.category or "General",
            "qds": d.qds or (v.severity * 18),
            "ars": d.ars or (v.severity * 19),
            "acs": d.acs or (v.severity * 17),
            "trurisk_score": d.trurisk_score or (v.severity * 190),
            "if_or_pci": if_or_pci,
            "source": "Qualys VMDR Agent / Scanner",
            "sla": d.sla_status or "WITHIN_SLA",
            "vulnerability_age": d.age_days or 0,
            "app_owner": a.app_owner or (app.owner.name if app and app.owner else "Unassigned"),
            "business_owner": a.business_owner or "Unassigned",
            "correlation_id": a.correlation_id or "—",
            "organization": a.organization or (app.organization if app else "IVM Operations"),
            "if": is_if,
            "pci": is_pci,
            "impacted_asset": a.dns or a.fqdn or a.ip,
            "cloud_account_name": a.cloud_account_name or (f"Corr-{a.correlation_id}" if a.correlation_id else "—"),
            "environment": a.environment or (app.environment if app else "Production"),
            "csp": a.csp or a.cloud_provider or "On-Premises",
            "vulnerability_id": v.qid,
            "vulnerability_category": v.category or "Security Flaw",
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "results": results,
    }


@router.get("/{qid}")
def vulnerability_detail(qid: str, db: Session = Depends(get_db)):
    vuln = db.query(models.Vulnerability).filter_by(qid=qid).first()
    if not vuln:
        raise HTTPException(404, "QID not found")

    detections = (
        db.query(models.HostDetection)
        .filter_by(vulnerability_id=vuln.id)
        .all()
    )

    by_cloud: dict = {}
    for d in detections:
        provider = d.asset.cloud_provider or "Unknown"
        by_cloud[provider] = by_cloud.get(provider, 0) + 1

    return {
        "qid": vuln.qid,
        "title": vuln.title,
        "severity": vuln.severity,
        "category": vuln.category,
        "cve": vuln.cve,
        "threat": vuln.threat,
        "impact": vuln.impact,
        "solution": vuln.solution,
        "affected_assets": len(detections),
        "by_cloud": by_cloud,
        "fixed": sum(1 for d in detections if d.status == "Fixed"),
        "open": sum(1 for d in detections if d.status != "Fixed"),
        "sla_breached": sum(1 for d in detections if d.sla_status == "BREACHED"),
        "assets": [
            {
                "asset_id": d.asset_id,
                "hostname": d.asset.dns or d.asset.fqdn or d.asset.ip,
                "ip": d.asset.ip,
                "status": d.status,
                "age_days": d.age_days,
            }
            for d in detections
        ],
    }


@router.get("/reopened/summary")
def reopened_summary(db: Session = Depends(get_db)):
    rows = (
        db.query(
            models.Vulnerability.qid,
            func.count(models.HostDetection.id).label("assets"),
            func.sum(models.HostDetection.times_reopened).label("total_reopens"),
        )
        .join(models.HostDetection, models.HostDetection.vulnerability_id == models.Vulnerability.id)
        .filter(models.HostDetection.times_reopened > 0)
        .group_by(models.Vulnerability.qid)
        .order_by(func.sum(models.HostDetection.times_reopened).desc())
        .limit(20)
        .all()
    )
    return [{"qid": r[0], "assets": r[1], "total_reopens": r[2]} for r in rows]
