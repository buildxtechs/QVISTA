import re
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.services.matching_engine import match_cloud_record

router = APIRouter(prefix="/api/cloud", tags=["cloud"])


class ManualCloudRecordIn(BaseModel):
    cloud_provider: str  # AWS | AZURE
    instance_name: str | None = None
    account_or_subscription: str  # Account Name/ID or Subscription Name/ID
    private_ip: str | None = None
    public_ip: str | None = None
    instance_id: str | None = None
    region: str | None = "us-east-1"
    resource_group: str | None = None
    os: str | None = "Linux"
    status: str | None = "Running"
    application_name: str | None = None
    owner_name: str | None = None


def _parse_account_name_id(raw: str | None, provider: str) -> tuple[str, str]:
    if not raw or raw.strip() == "":
        return ("Default Account" if provider == "AWS" else "Default Subscription", "N/A")
    raw = raw.strip()
    
    # Check format: "Name (ID)"
    match = re.match(r"^(.+?)\s*\((.+?)\)$", raw)
    if match:
        return (match.group(1).strip(), match.group(2).strip())
    
    # If it's purely digits (AWS account ID)
    if raw.isdigit() and len(raw) >= 10:
        return (f"AWS-Account-{raw[-4:]}", raw)
    
    # If it looks like a UUID (Azure subscription ID)
    if re.match(r"^[0-9a-fA-F-]{30,}$", raw):
        return (f"Azure-Sub-{raw[:8]}", raw)
        
    return (raw, raw)


@router.get("/comparison")
def get_cloud_comparison(db: Session = Depends(get_db)):
    """Returns top-level comparison metrics and breakdowns for AWS Accounts, Azure Subscriptions, and Network Groups with Sev 5, 4, 3 and Fixed counts."""
    total_assets = db.query(models.Asset).count()
    
    aws_records = db.query(models.CloudInventory).filter(models.CloudInventory.cloud_provider == "AWS").all()
    azure_records = db.query(models.CloudInventory).filter(models.CloudInventory.cloud_provider == "AZURE").all()
    
    total_aws = len(aws_records)
    total_azure = len(azure_records)
    
    aws_matched = sum(1 for r in aws_records if r.match_status == "MATCHED")
    aws_unmatched = sum(1 for r in aws_records if r.match_status != "MATCHED")
    
    azure_matched = sum(1 for r in azure_records if r.match_status == "MATCHED")
    azure_unmatched = sum(1 for r in azure_records if r.match_status != "MATCHED")
    
    # 1. Group AWS by Account
    aws_account_groups: dict[str, list[models.CloudInventory]] = {}
    for r in aws_records:
        key = r.account_or_subscription or "Unspecified AWS Account"
        aws_account_groups.setdefault(key, []).append(r)
        
    aws_accounts = []
    for acct_raw, recs in aws_account_groups.items():
        name, acct_id = _parse_account_name_id(acct_raw, "AWS")
        matched = [r for r in recs if r.match_status == "MATCHED" and r.asset_id]
        unmatched_count = len(recs) - len(matched)
        
        # Calculate vulnerabilities across matched assets (Sev 5, 4, 3 only & Fixed)
        crit_count = 0
        high_count = 0
        med_count = 0
        fixed_count = 0
        sla_breach_count = 0
        apps = set()
        regions = set()
        matched_apms = {}
        
        for r in matched:
            if r.asset:
                apm_key = r.asset.apm_id or (r.asset.application.name if r.asset.application else None) or "Unassigned APM"
                matched_apms.setdefault(apm_key, {
                    "apm_id": r.asset.apm_id or "N/A",
                    "app_name": r.asset.application.name if r.asset.application else "General App",
                    "app_owner": r.asset.app_owner or (r.asset.owner.name if r.asset.owner else "Unassigned"),
                    "business_owner": r.asset.business_owner or "Unassigned",
                    "internet_facing": r.asset.internet_facing,
                    "pci_scope": r.asset.pci_scope,
                    "correlation_id": r.asset.correlation_id or r.correlation_id or "N/A",
                    "asset_count": 0,
                    "crit": 0,
                    "high": 0,
                    "med": 0,
                    "fixed": 0,
                })
                matched_apms[apm_key]["asset_count"] += 1

                if r.asset.application:
                    apps.add(r.asset.application.name)
                for d in r.asset.detections:
                    if d.status == "Fixed" or d.date_last_fixed is not None:
                        fixed_count += 1
                        matched_apms[apm_key]["fixed"] += 1
                    elif d.vulnerability:
                        if d.vulnerability.severity == 5:
                            crit_count += 1
                            matched_apms[apm_key]["crit"] += 1
                        elif d.vulnerability.severity == 4:
                            high_count += 1
                            matched_apms[apm_key]["high"] += 1
                        elif d.vulnerability.severity == 3:
                            med_count += 1
                            matched_apms[apm_key]["med"] += 1
                        if d.sla_status == "BREACHED":
                            sla_breach_count += 1
            if r.region:
                regions.add(r.region)
                
        for r in recs:
            if r.region:
                regions.add(r.region)
            if r.application_name:
                apps.add(r.application_name)
                
        coverage = round((len(matched) / len(recs)) * 100, 1) if recs else 0.0
        
        aws_accounts.append({
            "account_name": name,
            "account_id": acct_id,
            "raw_key": acct_raw,
            "total_instances": len(recs),
            "matched_assets": len(matched),
            "unmatched_instances": unmatched_count,
            "coverage_pct": coverage,
            "critical_vulns": crit_count,
            "high_vulns": high_count,
            "med_vulns": med_count,
            "fixed_vulns": fixed_count,
            "total_open_5_4_3": crit_count + high_count + med_count,
            "sla_breaches": sla_breach_count,
            "regions": sorted(list(regions)),
            "applications": sorted(list(apps)),
            "apm_details": list(matched_apms.values()),
        })
        
    aws_accounts.sort(key=lambda x: x["total_instances"], reverse=True)
    
    # 2. Group Azure by Subscription
    azure_sub_groups: dict[str, list[models.CloudInventory]] = {}
    for r in azure_records:
        key = r.account_or_subscription or "Unspecified Azure Subscription"
        azure_sub_groups.setdefault(key, []).append(r)
        
    azure_subscriptions = []
    for sub_raw, recs in azure_sub_groups.items():
        name, sub_id = _parse_account_name_id(sub_raw, "AZURE")
        matched = [r for r in recs if r.match_status == "MATCHED" and r.asset_id]
        unmatched_count = len(recs) - len(matched)
        
        crit_count = 0
        high_count = 0
        med_count = 0
        fixed_count = 0
        sla_breach_count = 0
        rgs = set()
        regions = set()
        apps = set()
        matched_apms = {}
        
        for r in matched:
            if r.asset:
                apm_key = r.asset.apm_id or (r.asset.application.name if r.asset.application else None) or "Unassigned APM"
                matched_apms.setdefault(apm_key, {
                    "apm_id": r.asset.apm_id or "N/A",
                    "app_name": r.asset.application.name if r.asset.application else "General App",
                    "app_owner": r.asset.app_owner or (r.asset.owner.name if r.asset.owner else "Unassigned"),
                    "business_owner": r.asset.business_owner or "Unassigned",
                    "internet_facing": r.asset.internet_facing,
                    "pci_scope": r.asset.pci_scope,
                    "correlation_id": r.asset.correlation_id or r.correlation_id or "N/A",
                    "asset_count": 0,
                    "crit": 0,
                    "high": 0,
                    "med": 0,
                    "fixed": 0,
                })
                matched_apms[apm_key]["asset_count"] += 1

                if r.asset.application:
                    apps.add(r.asset.application.name)
                for d in r.asset.detections:
                    if d.status == "Fixed" or d.date_last_fixed is not None:
                        fixed_count += 1
                        matched_apms[apm_key]["fixed"] += 1
                    elif d.vulnerability:
                        if d.vulnerability.severity == 5:
                            crit_count += 1
                            matched_apms[apm_key]["crit"] += 1
                        elif d.vulnerability.severity == 4:
                            high_count += 1
                            matched_apms[apm_key]["high"] += 1
                        elif d.vulnerability.severity == 3:
                            med_count += 1
                            matched_apms[apm_key]["med"] += 1
                        if d.sla_status == "BREACHED":
                            sla_breach_count += 1
            if r.region:
                regions.add(r.region)
            if r.resource_group:
                rgs.add(r.resource_group)
                
        for r in recs:
            if r.region:
                regions.add(r.region)
            if r.resource_group:
                rgs.add(r.resource_group)
            if r.application_name:
                apps.add(r.application_name)
                
        coverage = round((len(matched) / len(recs)) * 100, 1) if recs else 0.0
        
        azure_subscriptions.append({
            "subscription_name": name,
            "subscription_id": sub_id,
            "raw_key": sub_raw,
            "total_instances": len(recs),
            "matched_assets": len(matched),
            "unmatched_instances": unmatched_count,
            "coverage_pct": coverage,
            "critical_vulns": crit_count,
            "high_vulns": high_count,
            "med_vulns": med_count,
            "fixed_vulns": fixed_count,
            "total_open_5_4_3": crit_count + high_count + med_count,
            "sla_breaches": sla_breach_count,
            "resource_groups": sorted(list(rgs)),
            "regions": sorted(list(regions)),
            "applications": sorted(list(apps)),
            "apm_details": list(matched_apms.values()),
        })
        
    azure_subscriptions.sort(key=lambda x: x["total_instances"], reverse=True)

    # 3. Network Assets Group
    net_assets = db.query(models.Asset).filter(
        (models.Asset.asset_group == "NETWORK") | (models.Asset.os.ilike("%cisco%"))
    ).all()
    net_crit = 0
    net_high = 0
    net_med = 0
    net_fixed = 0
    net_apms = {}
    for a in net_assets:
        apm_key = a.apm_id or (a.application.name if a.application else None) or "Network Operations"
        net_apms.setdefault(apm_key, {
            "apm_id": a.apm_id or "NET-OPS",
            "app_name": a.application.name if a.application else "Network Appliance",
            "app_owner": a.app_owner or "Network SecOps",
            "business_owner": a.business_owner or "Infrastructure",
            "internet_facing": a.internet_facing,
            "pci_scope": a.pci_scope,
            "correlation_id": a.correlation_id or "N/A",
            "asset_count": 0,
            "crit": 0,
            "high": 0,
            "med": 0,
            "fixed": 0,
        })
        net_apms[apm_key]["asset_count"] += 1
        for d in a.detections:
            if d.status == "Fixed" or d.date_last_fixed is not None:
                net_fixed += 1
                net_apms[apm_key]["fixed"] += 1
            elif d.vulnerability:
                if d.vulnerability.severity == 5:
                    net_crit += 1
                    net_apms[apm_key]["crit"] += 1
                elif d.vulnerability.severity == 4:
                    net_high += 1
                    net_apms[apm_key]["high"] += 1
                elif d.vulnerability.severity == 3:
                    net_med += 1
                    net_apms[apm_key]["med"] += 1

    network_summary = {
        "group_name": "Network & Cisco Appliances",
        "asset_count": len(net_assets),
        "critical_vulns": net_crit,
        "high_vulns": net_high,
        "med_vulns": net_med,
        "fixed_vulns": net_fixed,
        "total_open_5_4_3": net_crit + net_high + net_med,
        "apm_details": list(net_apms.values()),
    }
    
    # Global Totals across AWS, Azure and Network
    aws_open_543 = sum(a["total_open_5_4_3"] for a in aws_accounts)
    aws_fixed_tot = sum(a["fixed_vulns"] for a in aws_accounts)
    azure_open_543 = sum(s["total_open_5_4_3"] for s in azure_subscriptions)
    azure_fixed_tot = sum(s["fixed_vulns"] for s in azure_subscriptions)

    return {
        "total_qualys_assets": total_assets,
        "aws_summary": {
            "total_instances": total_aws,
            "matched": aws_matched,
            "unmatched": aws_unmatched,
            "account_count": len(aws_accounts),
            "coverage_pct": round((aws_matched / total_aws * 100), 1) if total_aws > 0 else 0.0,
            "open_vulns_5_4_3": aws_open_543,
            "fixed_vulns": aws_fixed_tot,
        },
        "azure_summary": {
            "total_instances": total_azure,
            "matched": azure_matched,
            "unmatched": azure_unmatched,
            "subscription_count": len(azure_subscriptions),
            "coverage_pct": round((azure_matched / total_azure * 100), 1) if total_azure > 0 else 0.0,
            "open_vulns_5_4_3": azure_open_543,
            "fixed_vulns": azure_fixed_tot,
        },
        "network_summary": network_summary,
        "aws_accounts": aws_accounts,
        "azure_subscriptions": azure_subscriptions,
    }


@router.get("/matrix")
def get_discrepancy_matrix(
    provider: str | None = None,
    account_filter: str | None = Query(None, alias="account"),
    match_status: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 30,
    db: Session = Depends(get_db),
):
    """Returns itemized cloud inventory rows compared with their matched Qualys asset details."""
    q = db.query(models.CloudInventory)
    
    if provider and provider != "ALL":
        q = q.filter(models.CloudInventory.cloud_provider == provider.upper())
    if match_status and match_status != "ALL":
        q = q.filter(models.CloudInventory.match_status == match_status.upper())
    if account_filter:
        q = q.filter(models.CloudInventory.account_or_subscription.ilike(f"%{account_filter}%"))
    if search:
        like = f"%{search}%"
        q = q.filter(
            (models.CloudInventory.instance_name.ilike(like))
            | (models.CloudInventory.private_ip.ilike(like))
            | (models.CloudInventory.public_ip.ilike(like))
            | (models.CloudInventory.instance_id.ilike(like))
            | (models.CloudInventory.account_or_subscription.ilike(like))
            | (models.CloudInventory.application_name.ilike(like))
        )
        
    total = q.count()
    records = q.order_by(models.CloudInventory.uploaded_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    results = []
    for r in records:
        name, acct_sub_id = _parse_account_name_id(r.account_or_subscription, r.cloud_provider)
        
        crit = 0
        high = 0
        sla_breached = False
        qualys_host_id = None
        qualys_hostname = None
        
        if r.asset:
            qualys_host_id = r.asset.qualys_host_id
            qualys_hostname = r.asset.dns or r.asset.fqdn or r.asset.netbios or r.asset.ip
            for d in r.asset.detections:
                if d.status != "Fixed" and d.vulnerability:
                    if d.vulnerability.severity == 5:
                        crit += 1
                    elif d.vulnerability.severity == 4:
                        high += 1
                    if d.sla_status == "BREACHED":
                        sla_breached = True
                        
        results.append({
            "id": r.id,
            "cloud_provider": r.cloud_provider,
            "instance_name": r.instance_name or "Unnamed Host",
            "account_or_subscription": r.account_or_subscription,
            "account_name": name,
            "account_id": acct_sub_id,
            "private_ip": r.private_ip,
            "public_ip": r.public_ip,
            "instance_id": r.instance_id,
            "region": r.region,
            "resource_group": r.resource_group,
            "os": r.os,
            "status": r.status,
            "application": r.application_name,
            "owner": r.owner_name,
            "match_status": r.match_status,
            "match_method": r.match_method,
            "asset_id": r.asset_id,
            "qualys_host_id": qualys_host_id,
            "qualys_hostname": qualys_hostname,
            "critical_vulns": crit,
            "high_vulns": high,
            "sla_breached": sla_breached,
        })
        
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "results": results,
    }


@router.post("/inventory/manual")
def add_manual_cloud_inventory(
    payload: ManualCloudRecordIn,
    db: Session = Depends(get_db),
):
    """Add a single cloud inventory record manually and correlate it with Qualys."""
    record = models.CloudInventory(
        cloud_provider=payload.cloud_provider.upper(),
        instance_name=payload.instance_name,
        account_or_subscription=payload.account_or_subscription,
        private_ip=payload.private_ip,
        public_ip=payload.public_ip,
        instance_id=payload.instance_id,
        region=payload.region,
        resource_group=payload.resource_group,
        os=payload.os,
        status=payload.status or "Running",
        application_name=payload.application_name,
        owner_name=payload.owner_name,
        source_file="manual_entry",
    )
    db.add(record)
    db.flush()
    
    match_cloud_record(db, record)
    db.commit()
    
    return {
        "id": record.id,
        "cloud_provider": record.cloud_provider,
        "instance_name": record.instance_name,
        "match_status": record.match_status,
        "match_method": record.match_method,
        "asset_id": record.asset_id,
    }


@router.post("/match-post-scan")
def trigger_match_post_scan(db: Session = Depends(get_db)):
    """Correlate Qualys scanned assets with AWS, Azure, and CMDB inventory and return counts and values."""
    from app.services.matching_engine import match_all_post_scan
    return match_all_post_scan(db)

