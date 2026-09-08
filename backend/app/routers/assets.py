# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Query
# pyrefly: ignore [missing-import]
from sqlalchemy import func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app import models
from app.database import get_db

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("")
def list_assets(
    cloud: str | None = None,
    environment: str | None = None,
    os_filter: str | None = Query(None, alias="os"),
    application: str | None = None,
    owner: str | None = None,
    severity_min: int | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(models.Asset)

    if cloud:
        upper_c = cloud.upper()
        if upper_c == "NETWORK":
            q = q.filter((models.Asset.asset_group == "NETWORK") | (models.Asset.os.ilike("%cisco%")))
        else:
            q = q.filter(
                (models.Asset.cloud_provider == upper_c) | (models.Asset.asset_group == upper_c)
            )
    if os_filter:
        q = q.filter(models.Asset.os.ilike(f"%{os_filter}%"))
    if application:
        q = q.join(models.Application).filter(models.Application.name == application)
    if owner:
        q = q.join(models.Owner).filter(models.Owner.name == owner)
    if environment:
        q = q.join(models.Application, isouter=True).filter(models.Application.environment == environment)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (models.Asset.ip.ilike(like)) | (models.Asset.fqdn.ilike(like)) | (models.Asset.dns.ilike(like))
        )

    total = q.count()
    assets = q.order_by(models.Asset.updated_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    results = []
    for a in assets:
        crit = sum(
            1
            for d in a.detections
            if d.status != "Fixed" and d.vulnerability and d.vulnerability.severity == 5
        )
        high = sum(
            1
            for d in a.detections
            if d.status != "Fixed" and d.vulnerability and d.vulnerability.severity == 4
        )
        sla_breached = any(d.sla_status == "BREACHED" for d in a.detections)
        results.append(
            {
                "id": a.id,
                "hostname": a.dns or a.netbios or a.fqdn or a.ip,
                "ip": a.ip,
                "cloud_provider": a.cloud_provider,
                "application": a.application.name if a.application else None,
                "owner": a.owner.name if a.owner else None,
                "os": a.os,
                "asset_status": a.asset_status,
                "critical": crit,
                "high": high,
                "sla_breached": sla_breached,
            }
        )

    if severity_min:
        results = [r for r in results if (r["critical"] if severity_min == 5 else r["high"]) > 0]

    return {"total": total, "page": page, "page_size": page_size, "results": results}


@router.get("/{asset_id}")
def asset_detail(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(models.Asset).get(asset_id)
    if not asset:
        raise HTTPException(404, "Asset not found")

    detections = [
        {
            "qid": d.vulnerability.qid,
            "title": d.vulnerability.title,
            "severity": d.vulnerability.severity,
            "cve": d.vulnerability.cve,
            "port": d.port,
            "protocol": d.protocol,
            "status": d.status,
            "first_found": d.first_found,
            "last_detected": d.last_detected,
            "age_days": d.age_days,
            "sla_status": d.sla_status,
            "times_reopened": d.times_reopened,
        }
        for d in asset.detections
    ]

    cloud_records = [
        {
            "cloud_provider": c.cloud_provider,
            "instance_id": c.instance_id,
            "region": c.region,
            "account_or_subscription": c.account_or_subscription,
            "match_status": c.match_status,
            "match_method": c.match_method,
        }
        for c in asset.cloud_records
    ]

    return {
        "id": asset.id,
        "hostname": asset.dns or asset.netbios or asset.fqdn,
        "ip": asset.ip,
        "fqdn": asset.fqdn,
        "os": asset.os,
        "cloud_provider": asset.cloud_provider,
        "cloud_instance_id": asset.cloud_instance_id,
        "application": asset.application.name if asset.application else None,
        "owner": asset.owner.name if asset.owner else None,
        "last_scan": asset.last_vm_scan,
        "asset_status": asset.asset_status,
        "detections": detections,
        "cloud_records": cloud_records,
    }


@router.get("/summary/cloud-match")
def cloud_match_summary(db: Session = Depends(get_db)):
    rows = (
        db.query(models.CloudInventory.cloud_provider, models.CloudInventory.match_status, func.count())
        .group_by(models.CloudInventory.cloud_provider, models.CloudInventory.match_status)
        .all()
    )
    summary: dict = {}
    for provider, status, count in rows:
        summary.setdefault(provider, {"total": 0})
        summary[provider][status.lower()] = count
        summary[provider]["total"] += count
    return summary


@router.get("/comparison/ip-agents")
def compare_agents_by_ip(db: Session = Depends(get_db)):
    """
    Compares Qualys host agent assets with AWS, Azure, and CMDB inventories by IP Address.
    Provides total inventory IPs, matched IPs, missing agent IPs (Shadow IT), and agent-only IPs.
    """
    assets_with_ip = db.query(models.Asset).filter(models.Asset.ip.isnot(None), models.Asset.ip != '').all()
    asset_ips = {a.ip.strip() for a in assets_with_ip if a.ip}

    # AWS Inventory
    aws_records = db.query(models.CloudInventory).filter_by(cloud_provider="AWS").all()
    aws_priv_ips = {c.private_ip.strip() for c in aws_records if c.private_ip}
    aws_pub_ips = {c.public_ip.strip() for c in aws_records if c.public_ip}
    all_aws_ips = aws_priv_ips | aws_pub_ips

    # Azure Inventory
    azure_records = db.query(models.CloudInventory).filter_by(cloud_provider="AZURE").all()
    azure_priv_ips = {c.private_ip.strip() for c in azure_records if c.private_ip}
    azure_pub_ips = {c.public_ip.strip() for c in azure_records if c.public_ip}
    all_azure_ips = azure_priv_ips | azure_pub_ips

    all_cloud_ips = all_aws_ips | all_azure_ips

    # CMDB Inventory
    cmdb_records = db.query(models.CMDBRecord).all()
    cmdb_ips = {c.ip.strip() for c in cmdb_records if c.ip}

    # Intersections
    matched_aws = asset_ips & all_aws_ips
    matched_azure = asset_ips & all_azure_ips
    matched_cloud = asset_ips & all_cloud_ips
    matched_cmdb = asset_ips & cmdb_ips

    # Discrepancies
    shadow_cloud_ips = all_cloud_ips - asset_ips
    shadow_aws_ips = all_aws_ips - asset_ips
    shadow_azure_ips = all_azure_ips - asset_ips
    qualys_only_ips = asset_ips - all_cloud_ips

    return {
        "status": "success",
        "qualys_agents": {
            "total_host_ips": len(asset_ips),
            "matched_with_cloud": len(matched_cloud),
            "unmatched_onprem_or_network": len(qualys_only_ips),
            "coverage_pct": round((len(matched_cloud) / len(asset_ips) * 100), 1) if asset_ips else 0.0,
        },
        "aws_inventory": {
            "total_ips": len(all_aws_ips),
            "private_ips": len(aws_priv_ips),
            "public_ips": len(aws_pub_ips),
            "matched_with_agent": len(matched_aws),
            "missing_agent_shadow_it": len(shadow_aws_ips),
            "coverage_pct": round((len(matched_aws) / len(all_aws_ips) * 100), 1) if all_aws_ips else 0.0,
        },
        "azure_inventory": {
            "total_ips": len(all_azure_ips),
            "private_ips": len(azure_priv_ips),
            "public_ips": len(azure_pub_ips),
            "matched_with_agent": len(matched_azure),
            "missing_agent_shadow_it": len(shadow_azure_ips),
            "coverage_pct": round((len(matched_azure) / len(all_azure_ips) * 100), 1) if all_azure_ips else 0.0,
        },
        "cmdb_inventory": {
            "total_ips_recorded": len(cmdb_ips),
            "matched_with_agent": len(matched_cmdb),
            "unmatched": len(cmdb_ips - asset_ips),
        },
        "combined_cloud_summary": {
            "total_cloud_ips": len(all_cloud_ips),
            "total_scanned_by_agent": len(matched_cloud),
            "total_shadow_it_ips": len(shadow_cloud_ips),
            "agent_coverage_pct": round((len(matched_cloud) / len(all_cloud_ips) * 100), 1) if all_cloud_ips else 0.0,
        },
    }


@router.get("/cloud-agents/overview")
def get_cloud_agents_overview(
    asset_group: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    """
    Returns comprehensive counts and distribution of Qualys Cloud Agents across AWS, Azure, and Network groups.
    """
    base_q = db.query(models.Asset)
    if asset_group and asset_group != "ALL":
        base_q = base_q.filter(models.Asset.asset_group == asset_group.upper())

    all_assets = base_q.all()
    total_assets = len(all_assets)

    # Agent classification: has agent_id, tracking_method='AGENT', or agent_status is set
    agent_assets = [
        a for a in all_assets 
        if (a.tracking_method and "AGENT" in a.tracking_method.upper()) or a.agent_id or a.agent_status
    ]
    non_agent_assets = [a for a in all_assets if a not in agent_assets]

    # Status breakdown
    active_agents = [a for a in agent_assets if (a.agent_status or "Active").lower() == "active"]
    inactive_agents = [a for a in agent_assets if (a.agent_status or "").lower() in ("inactive", "stopped", "offline")]
    manifest_pending = [a for a in agent_assets if (a.agent_status or "").lower() == "manifest_pending"]

    # Asset group breakdown for Agents
    aws_agents = [a for a in agent_assets if a.asset_group == "AWS"]
    azure_agents = [a for a in agent_assets if a.asset_group == "AZURE"]
    network_agents = [a for a in agent_assets if a.asset_group == "NETWORK"]

    # OS Distribution
    os_counts: dict[str, int] = {}
    for a in agent_assets:
        os_label = "Linux"
        if a.os:
            os_lower = a.os.lower()
            if "windows" in os_lower:
                os_label = "Windows Server"
            elif "ubuntu" in os_lower:
                os_label = "Ubuntu Linux"
            elif "amazon" in os_lower:
                os_label = "Amazon Linux"
            elif "red hat" in os_lower or "rhel" in os_lower:
                os_label = "Red Hat Enterprise Linux"
            elif "debian" in os_lower:
                os_label = "Debian Linux"
            elif "cisco" in os_lower or "router" in os_lower:
                os_label = "Network Appliance OS"
            else:
                os_label = a.os.split()[0] if a.os else "Linux"
        os_counts[os_label] = os_counts.get(os_label, 0) + 1

    # Vulnerability counts on agent assets
    agent_vulns_total = sum(len([d for d in a.detections if d.status != "Fixed"]) for a in agent_assets)
    agent_crit_vulns = sum(len([d for d in a.detections if d.status != "Fixed" and d.vulnerability and d.vulnerability.severity == 5]) for a in agent_assets)
    agent_high_vulns = sum(len([d for d in a.detections if d.status != "Fixed" and d.vulnerability and d.vulnerability.severity == 4]) for a in agent_assets)

    return {
        "status": "success",
        "total_assets": total_assets,
        "total_cloud_agents": len(agent_assets),
        "total_network_scanned_only": len(non_agent_assets),
        "agent_coverage_rate": round((len(agent_assets) / total_assets * 100), 1) if total_assets else 0.0,
        "status_breakdown": {
            "active": len(active_agents) if active_agents else len(agent_assets),
            "inactive": len(inactive_agents),
            "manifest_pending": len(manifest_pending),
        },
        "asset_group_breakdown": {
            "aws": {
                "agents_count": len(aws_agents),
                "total_group_assets": len([a for a in all_assets if a.asset_group == "AWS"]),
                "coverage_pct": round((len(aws_agents) / len([a for a in all_assets if a.asset_group == "AWS"]) * 100), 1) if any(a.asset_group == "AWS" for a in all_assets) else 0.0,
            },
            "azure": {
                "agents_count": len(azure_agents),
                "total_group_assets": len([a for a in all_assets if a.asset_group == "AZURE"]),
                "coverage_pct": round((len(azure_agents) / len([a for a in all_assets if a.asset_group == "AZURE"]) * 100), 1) if any(a.asset_group == "AZURE" for a in all_assets) else 0.0,
            },
            "network": {
                "agents_count": len(network_agents),
                "total_group_assets": len([a for a in all_assets if a.asset_group == "NETWORK"]),
                "coverage_pct": round((len(network_agents) / len([a for a in all_assets if a.asset_group == "NETWORK"]) * 100), 1) if any(a.asset_group == "NETWORK" for a in all_assets) else 0.0,
            },
        },
        "os_breakdown": [{"os": k, "count": v} for k, v in sorted(os_counts.items(), key=lambda x: x[1], reverse=True)],
        "vulnerability_impact": {
            "total_open_findings": agent_vulns_total,
            "critical_sev5": agent_crit_vulns,
            "high_sev4": agent_high_vulns,
        },
    }


