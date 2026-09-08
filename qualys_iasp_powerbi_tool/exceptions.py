"""
Exception Register Ingestion, Validation, and Application Engine.
"""
import datetime as dt
import pandas as pd
from .config import ToolConfig
from .validation import AuditLogger
from .sla_engine import parse_date_only

def process_exceptions(
    exceptions_df: pd.DataFrame | None,
    config: ToolConfig,
    logger: AuditLogger
) -> tuple[dict[str, dict], dict[str, dict], dict]:
    """
    Validates and indexes exception records.
    Returns:
    (
        active_by_vuln_id: dict[vuln_id, exception_data],
        active_by_ip_qid: dict[ip_qid, exception_data],
        summary: dict
    )
    """
    active_by_vuln_id = {}
    active_by_ip_qid = {}
    
    summary = {
        "total_exceptions": 0,
        "approved_active": 0,
        "expired": 0,
        "pending_or_draft": 0,
        "expiring_7d": 0,
        "expiring_15d": 0,
        "expiring_30d": 0,
        "duplicate_exceptions": 0,
    }
    
    if exceptions_df is None or exceptions_df.empty:
        return active_by_vuln_id, active_by_ip_qid, summary
        
    summary["total_exceptions"] = len(exceptions_df)
    proc_date = config.processing_date
    seen_vuln_ids = set()
    
    for idx, row in exceptions_df.iterrows():
        exc_id = str(row.get("Exception ID", f"EXC-{idx+1}"))
        status = str(row.get("Exception Status", "Draft")).strip().title()
        vuln_id = str(row.get("Vulnerability ID", "")).strip() if pd.notna(row.get("Vulnerability ID")) else None
        ip = str(row.get("IP", "")).strip() if pd.notna(row.get("IP")) else None
        qid = str(row.get("QID", "")).strip() if pd.notna(row.get("QID")) else None
        
        start_date = parse_date_only(row.get("Exception Start Date"))
        end_date = parse_date_only(row.get("Exception End Date"))
        
        is_approved = (status.lower() in ("approved", "active"))
        is_active = False
        is_expired = False
        
        if end_date and proc_date > end_date:
            is_expired = True
            summary["expired"] += 1
            logger.log_issue(
                category="Exception expired",
                description=f"Exception {exc_id} expired on {end_date} (Processing Date: {proc_date}).",
                severity="Info",
                source_file="Exception Register",
                source_row=idx + 1,
                vuln_id=vuln_id,
                ip=ip,
                qid=qid,
                action="Exception not applied",
                included="No"
            )
        elif is_approved and start_date and end_date and start_date <= proc_date <= end_date:
            is_active = True
            summary["approved_active"] += 1
            days_left = (end_date - proc_date).days
            if days_left <= 7:
                summary["expiring_7d"] += 1
            if days_left <= 15:
                summary["expiring_15d"] += 1
            if days_left <= 30:
                summary["expiring_30d"] += 1
        else:
            summary["pending_or_draft"] += 1
            
        exc_data = {
            "Exception ID": exc_id,
            "Exception Status": "Approved" if is_active else ("Expired" if is_expired else status),
            "Exception Start Date": start_date.strftime("%Y-%m-%d") if start_date else None,
            "Exception End Date": end_date.strftime("%Y-%m-%d") if end_date else None,
            "Exception Reason": str(row.get("Exception Reason", "")),
            "Approved By": str(row.get("Approved By", "")),
            "is_active": is_active
        }
        
        if is_active:
            if vuln_id:
                if vuln_id in seen_vuln_ids:
                    summary["duplicate_exceptions"] += 1
                    logger.log_issue(
                        category="Duplicate active exception",
                        description=f"Multiple active exceptions found for Vulnerability ID {vuln_id}.",
                        severity="High",
                        source_file="Exception Register",
                        source_row=idx + 1,
                        vuln_id=vuln_id,
                        action="Flagged for manual review",
                        included="No"
                    )
                else:
                    seen_vuln_ids.add(vuln_id)
                    active_by_vuln_id[vuln_id] = exc_data
                    
            if ip and qid:
                active_by_ip_qid[f"{ip}/{qid}"] = exc_data
                
    return active_by_vuln_id, active_by_ip_qid, summary
