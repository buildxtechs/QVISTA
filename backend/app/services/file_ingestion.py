"""
Parses uploaded AWS/Azure inventory files (CSV or XLSX) with flexible,
best-effort column detection, since every org names its export columns
slightly differently.
"""
import io
import ipaddress

import pandas as pd
from sqlalchemy.orm import Session

from app import models
from app.services.matching_engine import match_cloud_record

# candidate column names -> canonical field, checked case-insensitively
COLUMN_ALIASES = {
    "private_ip": ["private ip", "privateip", "internal ip", "ip", "private_ip"],
    "public_ip": ["public ip", "publicip", "external ip", "public_ip"],
    "instance_id": ["instance id", "instanceid", "instance_id", "vm id", "resource id"],
    "instance_name": ["instance name", "name", "vm name", "hostname", "host name", "server", "instance_name"],
    "account_name": ["account name", "account_name", "subscription name", "subscription_name", "aws account name", "azure subscription name"],
    "account_id": ["account id", "account_id", "subscription id", "subscription_id", "aws account id", "azure subscription id"],
    "account_or_subscription": [
        "account", "account id", "account_id", "account name", "account_name",
        "subscription", "subscription id", "subscription_id", "subscription name", "subscription_name",
        "aws account", "aws account name", "aws account id",
        "azure subscription", "azure subscription name", "azure subscription id"
    ],
    "resource_group": ["resource group", "resource_group"],
    "region": ["region", "location"],
    "os": ["os", "operating system", "platform"],
    "status": ["status", "state"],
    "application_name": ["application", "app", "application_name"],
    "owner_name": ["owner", "team", "business owner"],
}


def _normalize_columns(df: pd.DataFrame) -> dict:
    lower_cols = {c.lower().strip(): c for c in df.columns}
    mapping = {}
    for canonical, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in lower_cols:
                mapping[canonical] = lower_cols[alias]
                break
    return mapping


def _is_valid_ip(value) -> bool:
    if not value or pd.isna(value):
        return False
    try:
        ipaddress.ip_address(str(value).strip())
        return True
    except ValueError:
        return False


def parse_inventory_file(filename: str, content: bytes) -> pd.DataFrame:
    if filename.lower().endswith((".xlsx", ".xls")):
        return pd.read_excel(io.BytesIO(content))
    return pd.read_csv(io.BytesIO(content))


def ingest_cloud_inventory(
    db: Session, filename: str, content: bytes, cloud_provider: str
) -> dict:
    df = parse_inventory_file(filename, content)
    mapping = _normalize_columns(df)

    total_rows = len(df)
    valid = 0
    invalid_ip = 0
    duplicates = 0

    seen_keys = set()

    for _, row in df.iterrows():
        def get(field):
            col = mapping.get(field)
            if not col or col not in row:
                return None
            val = row[col]
            return None if pd.isna(val) else str(val).strip()

        private_ip = get("private_ip")
        public_ip = get("public_ip")
        instance_id = get("instance_id")

        if private_ip and not _is_valid_ip(private_ip):
            invalid_ip += 1
            private_ip = None
        if public_ip and not _is_valid_ip(public_ip):
            invalid_ip += 1
            public_ip = None

        if not any([private_ip, public_ip, instance_id, get("instance_name")]):
            continue  # unusable row - no identifying field at all

        dedup_key = (private_ip, public_ip, instance_id)
        if dedup_key in seen_keys:
            duplicates += 1
            continue
        seen_keys.add(dedup_key)

        acct_name = get("account_name")
        acct_id = get("account_id")
        acct_or_sub = get("account_or_subscription")
        if acct_name and acct_id and acct_name != acct_id:
            acct_or_sub = f"{acct_name} ({acct_id})"
        elif not acct_or_sub:
            acct_or_sub = acct_name or acct_id

        record = models.CloudInventory(
            cloud_provider=cloud_provider,
            private_ip=private_ip,
            public_ip=public_ip,
            instance_id=instance_id,
            instance_name=get("instance_name"),
            account_or_subscription=acct_or_sub,
            resource_group=get("resource_group"),
            region=get("region"),
            os=get("os"),
            status=get("status") or "Unknown",
            application_name=get("application_name"),
            owner_name=get("owner_name"),
            source_file=filename,
        )
        db.add(record)
        db.flush()
        match_cloud_record(db, record)
        valid += 1

    db.commit()

    matched = (
        db.query(models.CloudInventory)
        .filter_by(source_file=filename, match_status="MATCHED")
        .count()
    )
    unmatched = (
        db.query(models.CloudInventory)
        .filter_by(source_file=filename, match_status="UNMATCHED")
        .count()
    )

    return {
        "filename": filename,
        "rows_detected": total_rows,
        "valid": valid,
        "duplicate": duplicates,
        "invalid_ip": invalid_ip,
        "matched": matched,
        "unmatched": unmatched,
        "detected_columns": mapping,
    }
