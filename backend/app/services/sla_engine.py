import datetime as dt

from sqlalchemy.orm import Session

from app import models
from app.config import settings


def seed_default_sla_rules(db: Session) -> None:
    defaults = {
        5: settings.default_sla_critical,
        4: settings.default_sla_high,
        3: settings.default_sla_medium,
        2: settings.default_sla_low,
        1: settings.default_sla_low,
    }
    for severity, days in defaults.items():
        existing = db.query(models.SLARule).filter_by(severity=severity).first()
        if not existing:
            db.add(models.SLARule(severity=severity, sla_days=days))
    db.commit()


def _sla_days_for_severity(db: Session, severity: int, is_if_or_pci: bool = False) -> int:
    """
    SLA Rules:
    - Severity 5: 30 days
    - Severity 4: 120 days (reduced to 90 days if Internet-Facing or PCI Scope)
    - Severity 3: 180 days
    - Severity 2 / 1: 180 days
    """
    if severity == 5:
        return 30
    if severity == 4:
        return 90 if is_if_or_pci else 120
    if severity == 3:
        return 180
    return 180


def compute_sla_for_detection(db: Session, detection: models.HostDetection, vuln: models.Vulnerability) -> None:
    """Mutates `detection` in place with age_days, sla_days, sla_status based on asset IF/PCI scope."""
    if detection.exception_id:
        detection.sla_status = "EXCEPTION"
        return

    if detection.status == "Fixed":
        detection.sla_status = "FIXED"
        return

    anchor = detection.first_found or detection.last_detected
    if not anchor:
        detection.age_days = None
        detection.sla_status = None
        return

    age = (dt.datetime.utcnow() - anchor).days
    
    # Check if parent asset is in Internet-Facing or PCI scope
    is_if_or_pci = False
    if detection.asset:
        is_if_or_pci = bool(detection.asset.internet_facing or detection.asset.pci_scope or detection.pci_vuln)

    sla_days = _sla_days_for_severity(db, vuln.severity, is_if_or_pci=is_if_or_pci)

    detection.age_days = age
    detection.sla_days = sla_days
    detection.sla_status = "BREACHED" if age > sla_days else "WITHIN_SLA"


def recompute_all_sla(db: Session) -> int:
    """Batch recompute - useful to run daily/after SLA-rule changes."""
    count = 0
    q = (
        db.query(models.HostDetection, models.Vulnerability)
        .join(models.Vulnerability, models.HostDetection.vulnerability_id == models.Vulnerability.id)
        .filter(models.HostDetection.status != "Fixed")
    )
    for detection, vuln in q:
        compute_sla_for_detection(db, detection, vuln)
        count += 1
    db.commit()
    return count
