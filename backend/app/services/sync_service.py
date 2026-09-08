import datetime as dt

# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app import models
from app.qualys_client import QualysClient, HostRecord
from app.security import decrypt_secret
from app.services.sla_engine import compute_sla_for_detection


def get_active_client(db: Session) -> QualysClient:
    conn = db.query(models.QualysConnection).filter_by(is_active=True).first()
    if not conn:
        raise RuntimeError("No active Qualys connection configured. Add one under Settings > Qualys.")
    password = decrypt_secret(conn.encrypted_password)
    return QualysClient(conn.platform_url, conn.username, password)


def _get_or_create_vulnerability(db: Session, qid: str, severity: int | None, vuln_type: str | None) -> models.Vulnerability:
    vuln = db.query(models.Vulnerability).filter_by(qid=qid).first()
    if vuln:
        return vuln
    vuln = models.Vulnerability(
        qid=qid,
        title=f"QID {qid}",  # Enriched later via KnowledgeBase API (not called here to keep sync fast)
        severity=severity or 1,
        category=vuln_type,
    )
    db.add(vuln)
    db.flush()
    return vuln


def _upsert_asset(db: Session, host: HostRecord) -> models.Asset:
    asset = db.query(models.Asset).filter_by(qualys_host_id=host.host_id).first()
    if not asset:
        asset = models.Asset(qualys_host_id=host.host_id)
        db.add(asset)

    asset.ip = host.ip
    asset.dns = host.dns
    asset.netbios = host.netbios
    asset.fqdn = host.fqdn
    asset.os = host.os
    asset.tracking_method = host.tracking_method
    asset.cloud_provider = host.cloud_provider
    asset.cloud_instance_id = host.cloud_instance_id
    if host.cloud_account_name:
        asset.cloud_account_name = host.cloud_account_name
    asset.last_vm_scan = host.last_vuln_scan_datetime
    asset.agent_id = host.agent_id
    asset.agent_status = host.agent_status or ("Active" if host.tracking_method == "AGENT" else None)
    
    # Classify asset group directly from Qualys telemetry
    from app.models import classify_asset_group
    asset.asset_group = classify_asset_group(host.os, host.cloud_provider, host.dns or host.fqdn)
    
    asset.updated_at = dt.datetime.utcnow()
    db.flush()
    return asset


def run_sync(db: Session, sync_record: models.SyncHistory) -> None:
    """
    Pulls the full Host List Detection feed from Qualys and upserts
    assets / vulnerabilities / host_detections. Designed to be called
    from a background task so the HTTP request returns immediately.
    """
    client = get_active_client(db)

    hosts_processed = 0
    findings_processed = 0
    new_findings = 0
    fixed_findings = 0

    try:
        for host in client.fetch_host_list_detection():
            asset = _upsert_asset(db, host)
            hosts_processed += 1

            host_det_map = {}
            for existing_d in db.query(models.HostDetection).filter_by(asset_id=asset.id).all():
                host_det_map[(existing_d.vulnerability_id, existing_d.port, existing_d.protocol)] = existing_d

            for det in host.detections:
                vuln = _get_or_create_vulnerability(db, det.qid, det.severity, det.type)
                det_key = (vuln.id, det.port, det.protocol)

                existing = host_det_map.get(det_key)
                is_new = existing is None
                if is_new:
                    existing = models.HostDetection(
                        asset_id=asset.id,
                        vulnerability_id=vuln.id,
                        port=det.port,
                        protocol=det.protocol,
                    )
                    db.add(existing)
                    host_det_map[det_key] = existing
                    new_findings += 1

                was_active = existing.status == "Active" if existing.status else False
                existing.ssl = det.ssl
                existing.status = det.status or existing.status or "Active"
                existing.first_found = det.first_found or existing.first_found
                existing.last_detected = det.last_found or existing.last_detected
                existing.times_detected = det.times_found
                existing.date_last_fixed = det.last_fixed
                existing.first_reopened = det.first_reopened
                existing.last_reopened = det.last_reopened
                existing.times_reopened = det.times_reopened

                if existing.status == "Fixed" and was_active:
                    fixed_findings += 1

                compute_sla_for_detection(db, existing, vuln)
                findings_processed += 1

            db.commit()

        # Automatically correlate with AWS, Azure, and CMDB upon scan completion
        from app.services.matching_engine import match_all_post_scan
        match_all_post_scan(db)

        sync_record.status = "success"
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        sync_record.status = "failed"
        sync_record.error_message = str(exc)
        raise
    finally:
        sync_record.finished_at = dt.datetime.utcnow()
        sync_record.hosts_processed = hosts_processed
        sync_record.findings_processed = findings_processed
        sync_record.new_findings = new_findings
        sync_record.fixed_findings = fixed_findings
        db.add(sync_record)
        db.commit()

