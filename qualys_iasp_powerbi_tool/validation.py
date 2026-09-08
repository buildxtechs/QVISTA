"""
Comprehensive Data Validation and Audit Logging Module.
"""
import ipaddress
import uuid
import datetime as dt
import pandas as pd
from dataclasses import dataclass, field

@dataclass
class QualityIssue:
    run_id: str
    processing_timestamp: str
    source_file: str
    source_sheet: str
    source_row_number: int | str
    vulnerability_id: str | None
    ip: str | None
    qid: str | None
    issue_category: str
    issue_description: str
    issue_severity: str  # Critical / High / Medium / Low / Info
    original_value: str | None
    normalized_value: str | None
    action_taken: str
    included_in_final_report: str  # Yes / No / Flagged
    resolution_status: str = "Unresolved"
    reviewer_comments: str = ""

class AuditLogger:
    def __init__(self, run_id: str | None = None):
        self.run_id = run_id or f"RUN-{dt.datetime.utcnow().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"
        self.timestamp = dt.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        self.issues: list[QualityIssue] = []
        self.event_logs: list[dict] = []
        self.exclusions: list[dict] = []

    def log_event(self, stage: str, message: str, count: int | None = None):
        self.event_logs.append({
            "run_id": self.run_id,
            "timestamp": dt.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            "stage": stage,
            "message": message,
            "count": count
        })

    def log_issue(
        self,
        category: str,
        description: str,
        severity: str = "Medium",
        source_file: str = "Qualys Raw",
        source_sheet: str = "Sheet1",
        source_row: int | str = 0,
        vuln_id: str | None = None,
        ip: str | None = None,
        qid: str | None = None,
        orig_val: str | None = None,
        norm_val: str | None = None,
        action: str = "Excluded from final report",
        included: str = "No"
    ):
        self.issues.append(QualityIssue(
            run_id=self.run_id,
            processing_timestamp=self.timestamp,
            source_file=source_file,
            source_sheet=source_sheet,
            source_row_number=source_row,
            vulnerability_id=vuln_id,
            ip=ip,
            qid=qid,
            issue_category=category,
            issue_description=description,
            issue_severity=severity,
            original_value=str(orig_val) if orig_val is not None else None,
            normalized_value=str(norm_val) if norm_val is not None else None,
            action_taken=action,
            included_in_final_report=included
        ))

    def to_dataframe(self) -> pd.DataFrame:
        if not self.issues:
            return pd.DataFrame(columns=[
                "Run ID", "Processing Timestamp", "Source File", "Source Sheet",
                "Source Row Number", "Vulnerability ID", "IP", "QID", "Issue Category",
                "Issue Description", "Issue Severity", "Original Value", "Normalized Value",
                "Action Taken", "Included in Final Report", "Resolution Status", "Reviewer Comments"
            ])
        data = [{
            "Run ID": i.run_id,
            "Processing Timestamp": i.processing_timestamp,
            "Source File": i.source_file,
            "Source Sheet": i.source_sheet,
            "Source Row Number": i.source_row_number,
            "Vulnerability ID": i.vulnerability_id or "",
            "IP": i.ip or "",
            "QID": i.qid or "",
            "Issue Category": i.issue_category,
            "Issue Description": i.issue_description,
            "Issue Severity": i.issue_severity,
            "Original Value": i.original_value or "",
            "Normalized Value": i.normalized_value or "",
            "Action Taken": i.action_taken,
            "Included in Final Report": i.included_in_final_report,
            "Resolution Status": i.resolution_status,
            "Reviewer Comments": i.reviewer_comments,
        } for i in self.issues]
        return pd.DataFrame(data)

def is_valid_ip(ip_str: str | None) -> bool:
    if not ip_str or not str(ip_str).strip():
        return False
    try:
        ipaddress.ip_address(str(ip_str).strip())
        return True
    except ValueError:
        return False

def sanitize_formula_injection(val):
    """Protects Excel cells against formula injection starting with =, +, -, @."""
    if val is None or pd.isna(val):
        return ""
    s = str(val)
    if s and s[0] in ("=", "+", "-", "@"):
        return f"'{s}"
    return s
