import io
from datetime import datetime, timezone
from typing import cast, Any
import pandas as pd
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import models
from app.database import get_db

router = APIRouter(prefix="/api/reports", tags=["reports"])


IASP_HEADERS = [
    "IP", "DNS", "NetBIOS", "Tracking Method", "OS", "IP Status", "Unique Id",
    "Vulnerability Name", "Vulnerability Status", "Type", "Risk Rating", "Port",
    "Protocol", "FQDN", "SSL", "First Detected", "Last Detected", "Times Detected",
    "Date Last Fixed", "First Reopened", "Last Reopened", "Times Reopened", "CVE ID",
    "Vendor Reference", "Bugtraq ID", "Threat", "Impact", "Recommendation",
    "Exploitability", "Associated Malware", "Results", "PCI Vuln", "Ticket State",
    "Instance", "Category", "QDS", "ARS", "ACS", "TruRisk Score", "IF or PCI",
    "Scan Type", "APM ID", "SLA", "App Owner", "Organization", "Exception Start Date",
    "Exception End Date", "IF", "PCI", "CSP", "Cloud Account Name", "Environment",
    "Impacted Asset", "Vulnerability Category"
]

POWERBI_HEADERS = [
    "Application Name", "APM ID", "Scan Type", "IP", "DNS", "NetBIOS", "Tracking Method",
    "OS", "IP Status", "Unique id", "Vulnerability Name", "Vulnerability Status", "Type",
    "Risk Rating", "Port", "Protocol", "FQDN", "SSL", "First Found date", "Last Detected",
    "Times Detected", "Date Last Fixed", "First Reopened", "Last Reopened", "Times Reopened",
    "CVE ID", "Vendor Reference", "Bugtraq ID", "Threat", "Impact", "Recommendation",
    "Exploitability", "Results", "PCI Vuln", "Ticket State", "Instance", "Category",
    "QDS", "ARS", "ACS", "TruRisk Score", "IF or PCI", "Source", "SLA", "Vulnerability Age",
    "App Owner", "Organization", "IF", "PCI", "Impacted Asset", "Cloud Account Name",
    "Environment", "CSP", "Vulnerability ID", "Vulnerability Category"
]


def _filter_detections(
    db: Session,
    asset_group: str | None = None,
    apm_id: str | None = None,
    app_owner: str | None = None,
    severity: int | None = None,
    status: str | None = None,
    if_only: bool | None = None,
    pci_only: bool | None = None,
    exception_only: bool | None = None,
    search: str | None = None,
):
    q = (
        db.query(models.HostDetection)
        .join(models.Asset, models.HostDetection.asset_id == models.Asset.id)
        .join(models.Vulnerability, models.HostDetection.vulnerability_id == models.Vulnerability.id)
    )

    if asset_group:
        q = q.filter(models.Asset.asset_group == asset_group.upper())
    if apm_id:
        q = q.filter(models.Asset.apm_id.ilike(f"%{apm_id}%"))
    if app_owner:
        q = q.filter(models.Asset.app_owner.ilike(f"%{app_owner}%"))
    if severity:
        q = q.filter(models.Vulnerability.severity == severity)
    if status:
        q = q.filter(models.HostDetection.status == status)
    else:
        # Default only open unless specifically requested
        q = q.filter(models.HostDetection.status != "Fixed")
    if if_only:
        q = q.filter(models.Asset.internet_facing == True)
    if pci_only:
        q = q.filter(models.Asset.pci_scope == True)
    if exception_only:
        q = q.filter(models.HostDetection.is_exception_approved == True)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (models.Asset.ip.ilike(like))
            | (models.Asset.dns.ilike(like))
            | (models.Vulnerability.title.ilike(like))
            | (models.Vulnerability.cve.ilike(like))
            | (models.Vulnerability.qid.ilike(like))
        )

    return q.all()


def _xlsx_response(df: pd.DataFrame, filename: str) -> StreamingResponse:
    buffer = io.BytesIO()
    with pd.ExcelWriter(cast(Any, buffer), engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Findings")
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export/iasp.xlsx")
def export_iasp_template(
    asset_group: str | None = None,
    apm_id: str | None = None,
    app_owner: str | None = None,
    severity: int | None = None,
    status: str | None = None,
    if_only: bool | None = None,
    pci_only: bool | None = None,
    exception_only: bool | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    """Export findings formatted for IASP Template with exact 53 headers."""
    detections = _filter_detections(
        db,
        asset_group=asset_group,
        apm_id=apm_id,
        app_owner=app_owner,
        severity=severity,
        status=status,
        if_only=if_only,
        pci_only=pci_only,
        exception_only=exception_only,
        search=search,
    )

    rows = []
    for d in detections:
        a = d.asset
        v = d.vulnerability
        app = a.application

        is_if = "Yes" if a.internet_facing else "No"
        is_pci = "Yes" if a.pci_scope else "No"
        if_or_pci = "Both" if (a.internet_facing and a.pci_scope) else ("IF" if a.internet_facing else ("PCI" if a.pci_scope else "None"))
        
        # Risk Rating description
        risk_map = {5: "5 - Critical", 4: "4 - High", 3: "3 - Medium", 2: "2 - Low", 1: "1 - Info"}
        risk_rating = risk_map.get(v.severity, f"{v.severity} - Medium")

        rows.append({
            "IP": a.ip,
            "DNS": a.dns or "",
            "NetBIOS": a.netbios or "",
            "Tracking Method": a.tracking_method or "IP",
            "OS": a.os or "Unknown",
            "IP Status": a.asset_status or "Active",
            "Unique Id": f"{a.id}-{v.qid}",
            "Vulnerability Name": f"[Exception Approved] {v.title}" if d.is_exception_approved else v.title,
            "Vulnerability Status": d.status or "Active",
            "Type": v.category or "Confirmed",
            "Risk Rating": risk_rating,
            "Port": d.port or "0",
            "Protocol": d.protocol or "TCP",
            "FQDN": a.fqdn or a.dns or "",
            "SSL": "No",
            "First Detected": d.first_found.strftime("%Y-%m-%d %H:%M:%S") if d.first_found else "",
            "Last Detected": d.last_detected.strftime("%Y-%m-%d %H:%M:%S") if d.last_detected else "",
            "Times Detected": d.times_detected or 1,
            "Date Last Fixed": "",
            "First Reopened": "",
            "Last Reopened": "",
            "Times Reopened": d.times_reopened or 0,
            "CVE ID": v.cve or "",
            "Vendor Reference": v.vendor_reference or "",
            "Bugtraq ID": v.bugtraq_id or "",
            "Threat": v.threat or "",
            "Impact": v.impact or "",
            "Recommendation": v.solution or "",
            "Exploitability": v.exploitability or "No Known Exploit",
            "Associated Malware": v.associated_malware or "None",
            "Results": d.results or "",
            "PCI Vuln": "Yes" if (d.pci_vuln or a.pci_scope) else "No",
            "Ticket State": d.ticket_state or "OPEN",
            "Instance": d.instance_name or a.cloud_instance_id or "",
            "Category": v.category or "General",
            "QDS": d.qds or (v.severity * 18),
            "ARS": d.ars or (v.severity * 19),
            "ACS": d.acs or (v.severity * 17),
            "TruRisk Score": d.trurisk_score or (v.severity * 190),
            "IF or PCI": if_or_pci,
            "Scan Type": d.scan_type or "Qualys VMDR",
            "APM ID": a.apm_id or (app.apm_id if app else "") or "",
            "SLA": d.sla_status or "WITHIN_SLA",
            "App Owner": a.app_owner or (app.owner.name if app and app.owner else "") or "Unassigned",
            "Organization": a.organization or (app.organization if app else "") or "IVM Operations",
            "Exception Start Date": d.exception_start_date.strftime("%Y-%m-%d") if d.exception_start_date else "",
            "Exception End Date": d.exception_end_date.strftime("%Y-%m-%d") if d.exception_end_date else "",
            "IF": is_if,
            "PCI": is_pci,
            "CSP": a.csp or a.cloud_provider or "On-Premises",
            "Cloud Account Name": a.cloud_account_name or (f"Corr-{a.correlation_id}" if a.correlation_id else ""),
            "Environment": a.environment or (app.environment if app else "") or "Production",
            "Impacted Asset": a.dns or a.fqdn or a.ip,
            "Vulnerability Category": v.category or "Security Flaw",
        })

    df = pd.DataFrame(rows, columns=IASP_HEADERS)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return _xlsx_response(df, f"QVISTA_IASP_Report_{timestamp}.xlsx")


@router.get("/export/powerbi.xlsx")
def export_powerbi_template(
    asset_group: str | None = None,
    apm_id: str | None = None,
    app_owner: str | None = None,
    severity: int | None = None,
    status: str | None = None,
    if_only: bool | None = None,
    pci_only: bool | None = None,
    exception_only: bool | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    """Export findings formatted for Power BI with exact requested schema."""
    detections = _filter_detections(
        db,
        asset_group=asset_group,
        apm_id=apm_id,
        app_owner=app_owner,
        severity=severity,
        status=status,
        if_only=if_only,
        pci_only=pci_only,
        exception_only=exception_only,
        search=search,
    )

    rows = []
    for d in detections:
        a = d.asset
        v = d.vulnerability
        app = a.application

        is_if = "Yes" if a.internet_facing else "No"
        is_pci = "Yes" if a.pci_scope else "No"
        if_or_pci = "Both" if (a.internet_facing and a.pci_scope) else ("IF" if a.internet_facing else ("PCI" if a.pci_scope else "None"))
        
        risk_map = {5: "5 - Critical", 4: "4 - High", 3: "3 - Medium", 2: "2 - Low", 1: "1 - Info"}
        risk_rating = risk_map.get(v.severity, f"{v.severity} - Medium")

        rows.append({
            "Application Name": (app.name if app else None) or a.apm_id or "General Platform",
            "APM ID": a.apm_id or (app.apm_id if app else "") or "",
            "Scan Type": d.scan_type or "Qualys VMDR",
            "IP": a.ip,
            "DNS": a.dns or "",
            "NetBIOS": a.netbios or "",
            "Tracking Method": a.tracking_method or "IP",
            "OS": a.os or "Unknown",
            "IP Status": a.asset_status or "Active",
            "Unique id": f"{a.id}-{v.qid}",
            "Vulnerability Name": f"[Exception Approved] {v.title}" if d.is_exception_approved else v.title,
            "Vulnerability Status": d.status or "Active",
            "Type": v.category or "Confirmed",
            "Risk Rating": risk_rating,
            "Port": d.port or "0",
            "Protocol": d.protocol or "TCP",
            "FQDN": a.fqdn or a.dns or "",
            "SSL": "No",
            "First Found date": d.first_found.strftime("%Y-%m-%d %H:%M:%S") if d.first_found else "",
            "Last Detected": d.last_detected.strftime("%Y-%m-%d %H:%M:%S") if d.last_detected else "",
            "Times Detected": d.times_detected or 1,
            "Date Last Fixed": "",
            "First Reopened": "",
            "Last Reopened": "",
            "Times Reopened": d.times_reopened or 0,
            "CVE ID": v.cve or "",
            "Vendor Reference": v.vendor_reference or "",
            "Bugtraq ID": v.bugtraq_id or "",
            "Threat": v.threat or "",
            "Impact": v.impact or "",
            "Recommendation": v.solution or "",
            "Exploitability": v.exploitability or "No Known Exploit",
            "Results": d.results or "",
            "PCI Vuln": "Yes" if (d.pci_vuln or a.pci_scope) else "No",
            "Ticket State": d.ticket_state or "OPEN",
            "Instance": d.instance_name or a.cloud_instance_id or "",
            "Category": v.category or "General",
            "QDS": d.qds or (v.severity * 18),
            "ARS": d.ars or (v.severity * 19),
            "ACS": d.acs or (v.severity * 17),
            "TruRisk Score": d.trurisk_score or (v.severity * 190),
            "IF or PCI": if_or_pci,
            "Source": "Qualys VMDR Agent / Scanner",
            "SLA": d.sla_status or "WITHIN_SLA",
            "Vulnerability Age": d.age_days or 0,
            "App Owner": a.app_owner or (app.owner.name if app and app.owner else "") or "Unassigned",
            "Organization": a.organization or (app.organization if app else "") or "IVM Operations",
            "IF": is_if,
            "PCI": is_pci,
            "Impacted Asset": a.dns or a.fqdn or a.ip,
            "Cloud Account Name": a.cloud_account_name or (f"Corr-{a.correlation_id}" if a.correlation_id else ""),
            "Environment": a.environment or (app.environment if app else "") or "Production",
            "CSP": a.csp or a.cloud_provider or "On-Premises",
            "Vulnerability ID": v.qid,
            "Vulnerability Category": v.category or "Security Flaw",
        })

    df = pd.DataFrame(rows, columns=POWERBI_HEADERS)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return _xlsx_response(df, f"QVISTA_PowerBI_Report_{timestamp}.xlsx")


@router.get("/vulnerabilities.xlsx")
def legacy_vulnerability_report(db: Session = Depends(get_db)):
    return export_iasp_template(db=db)

