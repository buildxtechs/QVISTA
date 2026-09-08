import io
import re
import pandas as pd
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models
from app.database import get_db

router = APIRouter(prefix="/api/cmdb", tags=["cmdb"])

CMDB_COLUMN_ALIASES = {
    "apm_id": ["apm id", "apmid", "apm_id", "application id", "app id"],
    "application_name": ["application name", "application", "app name", "app", "application_name"],
    "app_owner": [
        "it application owner", "it app owner", "it owner", "app owner",
        "application owner", "technical owner", "owner", "app_owner"
    ],
    "business_owner": ["business owner", "biz owner", "business_owner", "app business owner"],
    "organization": ["organization", "org", "business unit", "bu", "department"],
    "correlation_id": ["correlation id", "correlation_id", "corr id", "account correlation id", "5 digit id"],
    "internet_facing": ["internet facing", "if", "is internet facing", "internet_facing", "internet-facing"],
    "pci_scope": ["pci", "pci scope", "is pci", "pci_scope", "pci dss", "pci-dss"],
    "environment": ["environment", "env"],
    "impacted_asset": ["impacted asset", "hostname", "server", "asset", "instance name"],
    "ip": ["ip", "ip address", "private ip", "ip_address"],
}


def _normalize_cmdb_columns(df: pd.DataFrame) -> dict:
    lower_cols = {c.lower().strip(): c for c in df.columns}
    mapping = {}
    for canonical, aliases in CMDB_COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in lower_cols:
                mapping[canonical] = lower_cols[alias]
                break
    return mapping


def _parse_bool(val) -> bool:
    if val is None or pd.isna(val):
        return False
    s = str(val).strip().lower()
    return s in ("yes", "y", "true", "1", "in scope", "pci", "if")


def _parse_5digit_id(val) -> str | None:
    if val is None or pd.isna(val):
        return None
    s = str(val).strip()
    match = re.search(r"\b(\d{5})\b", s)
    if match:
        return match.group(1)
    if s.isdigit():
        return s.zfill(5)[:5]
    return s[:10]


@router.post("/upload")
async def upload_cmdb_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Ingest enterprise CMDB Excel or CSV file mapping APM IDs, Owners, IF/PCI flags, and Correlation IDs."""
    content = await file.read()
    fname = str(file.filename or "").lower()
    try:
        if fname.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content))
        else:
            df = pd.read_csv(io.BytesIO(content))
    except Exception as exc:
        raise HTTPException(400, f"Could not parse spreadsheet: {exc}")

    mapping = _normalize_cmdb_columns(df)
    if "apm_id" not in mapping and "application_name" not in mapping:
        raise HTTPException(400, "Spreadsheet must contain at least 'APM ID' or 'Application Name' column.")

    total_rows = len(df)
    created_count = 0
    matched_assets_count = 0

    for _, row in df.iterrows():
        def get(field):
            col = mapping.get(field)
            if not col or col not in row:
                return None
            val = row[col]
            return None if pd.isna(val) else str(val).strip()

        apm_id = get("apm_id") or f"APM-{created_count+1000:05d}"
        app_name = get("application_name") or f"App-{apm_id}"
        app_owner = get("app_owner")
        biz_owner = get("business_owner")
        org = get("organization")
        corr_id = _parse_5digit_id(get("correlation_id"))
        is_if = _parse_bool(get("internet_facing"))
        is_pci = _parse_bool(get("pci_scope"))
        env = get("environment") or "Production"
        impacted_asset = get("impacted_asset")
        ip = get("ip")

        record = models.CMDBRecord(
            apm_id=apm_id,
            application_name=app_name,
            app_owner=app_owner,
            business_owner=biz_owner,
            organization=org,
            correlation_id=corr_id,
            internet_facing=is_if,
            pci_scope=is_pci,
            environment=env,
            impacted_asset=impacted_asset,
            ip=ip,
            source_file=file.filename,
        )
        db.add(record)

        # Upsert Application
        app = db.query(models.Application).filter_by(name=app_name).first()
        if not app:
            app = models.Application(
                name=app_name,
                apm_id=apm_id,
                business_owner=biz_owner,
                environment=env,
                organization=org,
                internet_facing=is_if,
                pci_scope=is_pci,
            )
            db.add(app)
            db.flush()
        else:
            app.apm_id = apm_id if not app.apm_id else app.apm_id
            app.business_owner = biz_owner or app.business_owner
            app.organization = org or app.organization
            app.internet_facing = is_if or app.internet_facing
            app.pci_scope = is_pci or app.pci_scope

        # Upsert Owner
        if app_owner:
            owner = db.query(models.Owner).filter_by(name=app_owner).first()
            if not owner:
                owner = models.Owner(name=app_owner, team=org)
                db.add(owner)
                db.flush()
            app.technical_owner_id = owner.id

        # Correlate with existing Assets by IP, hostname, or correlation_id
        asset_matches = []
        if ip:
            asset_matches.extend(db.query(models.Asset).filter(models.Asset.ip == ip).all())
        if impacted_asset:
            asset_matches.extend(db.query(models.Asset).filter(
                (models.Asset.dns == impacted_asset) | (models.Asset.fqdn == impacted_asset)
            ).all())
        if corr_id:
            asset_matches.extend(db.query(models.Asset).filter(models.Asset.correlation_id == corr_id).all())

        for asset in set(asset_matches):
            asset.application_id = app.id
            asset.apm_id = apm_id
            asset.internet_facing = is_if or asset.internet_facing
            asset.pci_scope = is_pci or asset.pci_scope
            asset.environment = env
            asset.organization = org or asset.organization
            asset.business_owner = biz_owner or asset.business_owner
            asset.app_owner = app_owner or asset.app_owner
            if corr_id and not asset.correlation_id:
                asset.correlation_id = corr_id
            matched_assets_count += 1

        created_count += 1

    db.commit()

    return {
        "status": "success",
        "filename": file.filename,
        "rows_processed": total_rows,
        "valid_records": created_count,
        "assets_correlated": matched_assets_count,
        "detected_columns": mapping,
    }


@router.get("/apms")
def list_apms(
    search: str | None = None,
    if_only: bool | None = None,
    pci_only: bool | None = None,
    owner_filter: str | None = Query(None, alias="owner"),
    min_fixed: int | None = None,
    db: Session = Depends(get_db),
):
    """Lists APM IDs with aggregated assets, open & fixed vulnerabilities, and CMDB owner posture."""
    q = db.query(models.CMDBRecord)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (models.CMDBRecord.apm_id.ilike(like))
            | (models.CMDBRecord.application_name.ilike(like))
            | (models.CMDBRecord.app_owner.ilike(like))
            | (models.CMDBRecord.business_owner.ilike(like))
            | (models.CMDBRecord.correlation_id.ilike(like))
        )
    if if_only:
        q = q.filter(models.CMDBRecord.internet_facing == True)
    if pci_only:
        q = q.filter(models.CMDBRecord.pci_scope == True)
    if owner_filter:
        q = q.filter(models.CMDBRecord.app_owner.ilike(f"%{owner_filter}%"))

    records = q.all()
    if not records:
        return []

    # Pre-aggregate asset counts and vulnerability stats by apm_id in one efficient query
    stats_query = db.execute(
        text("""
        SELECT 
            a.apm_id,
            COUNT(DISTINCT a.id) as total_assets,
            SUM(CASE WHEN hd.status != 'Fixed' AND hd.id IS NOT NULL THEN 1 ELSE 0 END) as open_findings,
            SUM(CASE WHEN (hd.status = 'Fixed' OR hd.date_last_fixed IS NOT NULL) AND hd.id IS NOT NULL THEN 1 ELSE 0 END) as fixed_findings,
            SUM(CASE WHEN hd.status != 'Fixed' AND v.severity = 5 THEN 1 ELSE 0 END) as crit_open,
            SUM(CASE WHEN hd.status != 'Fixed' AND v.severity = 4 THEN 1 ELSE 0 END) as high_open,
            SUM(CASE WHEN hd.status != 'Fixed' AND v.severity = 3 THEN 1 ELSE 0 END) as med_open,
            SUM(CASE WHEN hd.status != 'Fixed' AND v.severity <= 2 THEN 1 ELSE 0 END) as low_open,
            SUM(CASE WHEN (hd.status = 'Fixed' OR hd.date_last_fixed IS NOT NULL) AND v.severity = 5 THEN 1 ELSE 0 END) as crit_fixed,
            SUM(CASE WHEN (hd.status = 'Fixed' OR hd.date_last_fixed IS NOT NULL) AND v.severity = 4 THEN 1 ELSE 0 END) as high_fixed,
            SUM(CASE WHEN hd.status != 'Fixed' AND hd.sla_status = 'BREACHED' THEN 1 ELSE 0 END) as sla_breached,
            AVG(CASE WHEN hd.status != 'Fixed' THEN COALESCE(hd.trurisk_score, 650) ELSE NULL END) as avg_trurisk
        FROM assets a
        LEFT JOIN host_detections hd ON hd.asset_id = a.id
        LEFT JOIN vulnerabilities v ON hd.vulnerability_id = v.id
        WHERE a.apm_id IS NOT NULL AND a.apm_id != ''
        GROUP BY a.apm_id
        """)
    )
    # Convert query results to lookup dictionary
    stats_lookup = {}
    for row in stats_query.fetchall():
        apm = row[0]
        stats_lookup[apm] = {
            "total_assets": row[1] or 0,
            "open_findings": row[2] or 0,
            "fixed_findings": row[3] or 0,
            "critical_count": row[4] or 0,
            "high_count": row[5] or 0,
            "medium_count": row[6] or 0,
            "low_count": row[7] or 0,
            "crit_fixed": row[8] or 0,
            "high_fixed": row[9] or 0,
            "sla_breaches": row[10] or 0,
            "trurisk_score": round(row[11]) if row[11] is not None else 0,
        }

    # Group CMDB records by APM ID
    apm_groups: dict[str, list[models.CMDBRecord]] = {}
    for r in records:
        key = str(r.apm_id)
        apm_groups.setdefault(key, []).append(r)

    results = []
    for apm_id, recs in apm_groups.items():
        first = recs[0]
        corr_ids = sorted(list({r.correlation_id for r in recs if r.correlation_id}))
        stat = stats_lookup.get(apm_id, {
            "total_assets": 0,
            "open_findings": 0,
            "fixed_findings": 0,
            "critical_count": 0,
            "high_count": 0,
            "medium_count": 0,
            "low_count": 0,
            "crit_fixed": 0,
            "high_fixed": 0,
            "sla_breaches": 0,
            "trurisk_score": 0,
        })

        total_lifetime = stat["open_findings"] + stat["fixed_findings"]
        remediation_rate = round((stat["fixed_findings"] / total_lifetime * 100), 1) if total_lifetime > 0 else 0.0

        if min_fixed is not None and stat["fixed_findings"] < min_fixed:
            continue

        results.append({
            "apm_id": apm_id,
            "application_name": first.application_name,
            "app_owner": first.app_owner or "Unassigned",
            "business_owner": first.business_owner or "Unassigned",
            "organization": first.organization or "Global",
            "correlation_ids": corr_ids,
            "internet_facing": any(r.internet_facing for r in recs),
            "pci_scope": any(r.pci_scope for r in recs),
            "environment": first.environment or "Production",
            "total_assets": stat["total_assets"],
            "total_findings": stat["open_findings"],
            "fixed_findings": stat["fixed_findings"],
            "critical_count": stat["critical_count"],
            "high_count": stat["high_count"],
            "medium_count": stat["medium_count"],
            "low_count": stat["low_count"],
            "crit_fixed": stat["crit_fixed"],
            "high_fixed": stat["high_fixed"],
            "sla_breaches": stat["sla_breaches"],
            "trurisk_score": stat["trurisk_score"],
            "remediation_rate": remediation_rate,
        })

    results.sort(key=lambda x: (x["fixed_findings"], x["critical_count"]), reverse=True)
    return results


@router.get("/apms/{apm_id}")
def get_apm_detail(apm_id: str, db: Session = Depends(get_db)):
    """Drill-down details for a specific APM ID including fixed & open vulnerability breakdowns."""
    recs = db.query(models.CMDBRecord).filter_by(apm_id=apm_id).all()
    if not recs:
        raise HTTPException(404, f"APM ID {apm_id} not found in CMDB records.")

    first = recs[0]
    corr_ids = sorted(list({r.correlation_id for r in recs if r.correlation_id}))
    assets = db.query(models.Asset).filter(
        (models.Asset.apm_id == apm_id)
        | (models.Asset.correlation_id.in_(corr_ids) if corr_ids else False)
    ).all()

    asset_list = []
    total_open = 0
    total_fixed = 0
    crit_open = 0
    crit_fixed = 0

    for a in assets:
        open_f = sum(1 for d in a.detections if d.status != "Fixed")
        fixed_f = sum(1 for d in a.detections if d.status == "Fixed" or d.date_last_fixed is not None)
        crit_o = sum(1 for d in a.detections if d.status != "Fixed" and d.vulnerability and d.vulnerability.severity == 5)
        crit_f = sum(1 for d in a.detections if (d.status == "Fixed" or d.date_last_fixed is not None) and d.vulnerability and d.vulnerability.severity == 5)
        
        total_open += open_f
        total_fixed += fixed_f
        crit_open += crit_o
        crit_fixed += crit_f

        asset_list.append({
            "id": a.id,
            "hostname": a.dns or a.fqdn or a.ip,
            "ip": a.ip,
            "asset_group": a.asset_group,
            "correlation_id": a.correlation_id,
            "cloud_provider": a.cloud_provider,
            "os": a.os,
            "open_findings": open_f,
            "fixed_findings": fixed_f,
            "critical": crit_o,
            "critical_fixed": crit_f,
        })

    lifetime = total_open + total_fixed
    remediation_rate = round((total_fixed / lifetime * 100), 1) if lifetime > 0 else 0.0

    return {
        "apm_id": apm_id,
        "application_name": first.application_name,
        "app_owner": first.app_owner or "Unassigned",
        "business_owner": first.business_owner or "Unassigned",
        "organization": first.organization or "Global",
        "environment": first.environment or "Production",
        "correlation_ids": corr_ids,
        "internet_facing": any(r.internet_facing for r in recs),
        "pci_scope": any(r.pci_scope for r in recs),
        "summary": {
            "total_assets": len(assets),
            "open_findings": total_open,
            "fixed_findings": total_fixed,
            "critical_open": crit_open,
            "critical_fixed": crit_fixed,
            "remediation_rate": remediation_rate,
        },
        "assets": asset_list,
    }
