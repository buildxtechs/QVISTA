"""
Correlates scanned Qualys assets with AWS accounts, Azure subscriptions, and enterprise CMDB records.

Performs:
1. Cloud Inventory (AWS / Azure) <-> Qualys Asset Matching:
   - Priority 1: Private IP -> Asset.ip
   - Priority 2: Public IP -> Asset.ip
   - Priority 3: Hostname -> Asset.dns / Asset.netbios
   - Priority 4: FQDN -> Asset.fqdn
   - Priority 5: Instance ID -> Asset.cloud_instance_id
   - Priority 6: Correlation ID -> Asset.correlation_id

2. CMDB <-> Qualys Asset & Application Correlation:
   - Maps 5-digit Correlation IDs to Assets
   - Maps APM IDs, App Owners, Business Owners, IF/PCI flags
   - Assigns Asset Group (AWS, AZURE, NETWORK)
"""
from sqlalchemy import func
from sqlalchemy.orm import Session
from app import models
from app.models import classify_asset_group


def _candidates(db: Session, field, value):
    if not value or not str(value).strip():
        return []
    val_clean = str(value).strip()
    return db.query(models.Asset).filter(func.trim(field) == val_clean).all()


def match_cloud_record(db: Session, record: models.CloudInventory) -> None:
    # Priority 1: Private IP -> Asset.ip
    # Priority 2: Public IP -> Asset.ip
    priv_ip = record.private_ip.strip() if record.private_ip else None
    pub_ip = record.public_ip.strip() if record.public_ip else None

    asset_field_pairs = [
        (models.Asset.ip, priv_ip, "private_ip"),
        (models.Asset.ip, pub_ip, "public_ip"),
        (models.Asset.dns, record.instance_name, "hostname"),
        (models.Asset.netbios, record.instance_name, "hostname"),
        (models.Asset.fqdn, record.instance_name, "fqdn"),
        (models.Asset.cloud_instance_id, record.instance_id, "instance_id"),
        (models.Asset.correlation_id, record.correlation_id, "correlation_id"),
    ]

    for field, value, method in asset_field_pairs:
        if not value:
            continue
        matches = _candidates(db, field, value)
        if len(matches) == 1:
            asset = matches[0]
            record.asset_id = asset.id
            record.match_method = method
            record.match_status = "MATCHED"
            _apply_cloud_metadata_to_asset(db, asset, record)
            return
        if len(matches) > 1:
            record.match_status = "CONFLICT"
            record.match_method = method
            return

    record.match_status = "UNMATCHED"
    record.match_method = None


def _apply_cloud_metadata_to_asset(db: Session, asset: models.Asset, record: models.CloudInventory) -> None:
    """Once matched, enrich the unified asset with cloud/application/owner context."""
    asset.cloud_provider = record.cloud_provider or asset.cloud_provider
    asset.cloud_instance_id = record.instance_id or asset.cloud_instance_id
    if record.account_or_subscription:
        asset.cloud_account_name = record.account_or_subscription
    if record.correlation_id and not asset.correlation_id:
        asset.correlation_id = record.correlation_id
    if record.status:
        asset.asset_status = record.status

    # Re-classify asset group
    asset.asset_group = classify_asset_group(asset.os, asset.cloud_provider)

    if record.application_name:
        app = db.query(models.Application).filter_by(name=record.application_name).first()
        if not app:
            app = models.Application(name=record.application_name, environment=_guess_environment(record))
            db.add(app)
            db.flush()
        asset.application_id = app.id

    if record.owner_name:
        owner = db.query(models.Owner).filter_by(name=record.owner_name).first()
        if not owner:
            owner = models.Owner(name=record.owner_name)
            db.add(owner)
            db.flush()
        asset.owner_id = owner.id


def _guess_environment(record: models.CloudInventory) -> str | None:
    text = " ".join(filter(None, [record.account_or_subscription, record.resource_group])).lower()
    for env in ("production", "prod", "uat", "staging", "development", "dev"):
        if env in text:
            return "Production" if env.startswith("prod") else env.title()
    return None


def match_all_post_scan(db: Session) -> dict:
    """
    Complete correlation engine run triggered after a Qualys scan completes or via user button.
    Matches Qualys assets against:
    - AWS Inventory records
    - Azure Inventory records
    - CMDB Records (APM ID, Correlation IDs, App Owners, IF/PCI flags)
    
    Returns comprehensive counts and posture metrics.
    """
    # 1. Match Cloud Inventory (AWS and Azure)
    cloud_records = db.query(models.CloudInventory).all()
    for record in cloud_records:
        match_cloud_record(db, record)

    # 2. Match CMDB Records to Assets
    cmdb_records = db.query(models.CMDBRecord).all()
    cmdb_matched_assets = set()
    for cmdb in cmdb_records:
        asset_matches = []
        if cmdb.ip:
            asset_matches.extend(db.query(models.Asset).filter(models.Asset.ip == cmdb.ip).all())
        if cmdb.impacted_asset:
            asset_matches.extend(db.query(models.Asset).filter(
                (models.Asset.dns == cmdb.impacted_asset) | (models.Asset.fqdn == cmdb.impacted_asset)
            ).all())
        if cmdb.correlation_id:
            asset_matches.extend(db.query(models.Asset).filter(models.Asset.correlation_id == cmdb.correlation_id).all())

        # Also match by Application Name
        if cmdb.application_name:
            app = db.query(models.Application).filter_by(name=cmdb.application_name).first()
            if app:
                asset_matches.extend(db.query(models.Asset).filter(models.Asset.application_id == app.id).all())

        for asset in set(asset_matches):
            cmdb_matched_assets.add(asset.id)
            if cmdb.apm_id:
                asset.apm_id = cmdb.apm_id
            if cmdb.correlation_id and not asset.correlation_id:
                asset.correlation_id = cmdb.correlation_id
            if cmdb.internet_facing:
                asset.internet_facing = True
            if cmdb.pci_scope:
                asset.pci_scope = True
            if cmdb.environment:
                asset.environment = cmdb.environment
            if cmdb.organization:
                asset.organization = cmdb.organization
            if cmdb.business_owner:
                asset.business_owner = cmdb.business_owner
            if cmdb.app_owner:
                asset.app_owner = cmdb.app_owner

    # 3. Ensure all assets have accurate Asset Group classification
    all_assets = db.query(models.Asset).all()
    for asset in all_assets:
        asset.asset_group = classify_asset_group(asset.os, asset.cloud_provider)

    db.commit()

    # Calculate detailed counts and breakdown values
    total_assets = len(all_assets)
    
    aws_records = [r for r in cloud_records if r.cloud_provider == "AWS"]
    azure_records = [r for r in cloud_records if r.cloud_provider == "AZURE"]

    aws_matched = sum(1 for r in aws_records if r.match_status == "MATCHED")
    aws_unmatched = sum(1 for r in aws_records if r.match_status != "MATCHED")
    aws_coverage = round((aws_matched / len(aws_records) * 100), 1) if aws_records else 0.0

    azure_matched = sum(1 for r in azure_records if r.match_status == "MATCHED")
    azure_unmatched = sum(1 for r in azure_records if r.match_status != "MATCHED")
    azure_coverage = round((azure_matched / len(azure_records) * 100), 1) if azure_records else 0.0

    aws_assets_count = sum(1 for a in all_assets if a.asset_group == "AWS")
    azure_assets_count = sum(1 for a in all_assets if a.asset_group == "AZURE")
    network_assets_count = sum(1 for a in all_assets if a.asset_group == "NETWORK")

    cmdb_total = len(cmdb_records)
    cmdb_unique_apms = len({r.apm_id for r in cmdb_records if r.apm_id})
    cmdb_if_count = sum(1 for a in all_assets if a.internet_facing)
    cmdb_pci_count = sum(1 for a in all_assets if a.pci_scope)

    # Calculate findings breakdown
    open_findings = db.query(models.HostDetection).filter(models.HostDetection.status != "Fixed").count()
    crit_count = db.query(models.HostDetection).join(models.Vulnerability).filter(
        models.HostDetection.status != "Fixed", models.Vulnerability.severity == 5
    ).count()
    high_count = db.query(models.HostDetection).join(models.Vulnerability).filter(
        models.HostDetection.status != "Fixed", models.Vulnerability.severity == 4
    ).count()
    sla_breached = db.query(models.HostDetection).filter(
        models.HostDetection.status != "Fixed", models.HostDetection.sla_status == "BREACHED"
    ).count()

    return {
        "status": "success",
        "message": "Scan correlation and multi-cloud CMDB matching completed successfully.",
        "assets_total": total_assets,
        "asset_groups": {
            "aws": aws_assets_count,
            "azure": azure_assets_count,
            "network": network_assets_count,
        },
        "aws_correlation": {
            "total_instances": len(aws_records),
            "matched": aws_matched,
            "shadow_unmatched": aws_unmatched,
            "coverage_pct": aws_coverage,
        },
        "azure_correlation": {
            "total_instances": len(azure_records),
            "matched": azure_matched,
            "shadow_unmatched": azure_unmatched,
            "coverage_pct": azure_coverage,
        },
        "cmdb_correlation": {
            "total_records": cmdb_total,
            "unique_apms": cmdb_unique_apms,
            "correlated_assets": len(cmdb_matched_assets),
            "internet_facing_assets": cmdb_if_count,
            "pci_scope_assets": cmdb_pci_count,
        },
        "vulnerability_posture": {
            "open_findings": open_findings,
            "critical_sev5": crit_count,
            "high_sev4": high_count,
            "sla_breached": sla_breached,
        },
    }


def rematch_all(db: Session) -> dict:
    """Backward-compatible rematch helper."""
    return match_all_post_scan(db)
