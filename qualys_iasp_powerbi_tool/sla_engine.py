"""
SLA Calculation and Vulnerability Age Engine.
"""
import datetime as dt
import pandas as pd
from .config import ToolConfig
from .validation import AuditLogger

def parse_date_only(val) -> dt.date | None:
    """Parses arbitrary date/datetime representations into dt.date (ignoring time)."""
    if val is None or pd.isna(val):
        return None
    if isinstance(val, dt.datetime):
        return val.date()
    if isinstance(val, dt.date):
        return val
    
    s = str(val).strip()
    if not s:
        return None
        
    for fmt in (
        "%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d",
        "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S",
        "%m/%d/%Y %H:%M:%S", "%d-%b-%Y", "%d-%b-%y"
    ):
        try:
            return dt.datetime.strptime(s.split(".")[0], fmt).date()
        except ValueError:
            continue
    try:
        # Fallback to pandas to_datetime
        parsed = pd.to_datetime(s, errors="coerce")
        if pd.notna(parsed):
            return parsed.date()
    except Exception:
        pass
    return None

def calculate_sla(
    row: pd.Series,
    config: ToolConfig,
    logger: AuditLogger,
    row_idx: int
) -> tuple[int, int | None, str, dt.date | None]:
    """
    Computes SLA Days, Vulnerability Age, Within SLA/Past due SLA, and SLA Due Date.
    Returns: (sla_days, vuln_age, sla_status, sla_due_date)
    """
    numeric_sev = row.get("_numeric_severity", 3)
    sla_days = config.sla_days_map.get(numeric_sev, 180)
    
    first_detected = parse_date_only(row.get("First Detected"))
    
    if not first_detected:
        logger.log_issue(
            category="Invalid date",
            description="First Detected date is missing or invalid; cannot calculate age and SLA.",
            severity="Medium",
            source_row=row_idx,
            vuln_id=row.get("Vulnerability ID"),
            ip=row.get("IP"),
            qid=str(row.get("QID", "")),
            orig_val=str(row.get("First Detected")),
            action="Vulnerability Age set to blank; SLA status marked as Unknown",
            included="Yes"
        )
        return sla_days, None, "Unknown", None
        
    proc_date = config.processing_date
    
    if first_detected > proc_date:
        logger.log_issue(
            category="Future First Detected date",
            description=f"First Detected ({first_detected}) is in the future relative to processing date ({proc_date}).",
            severity="High",
            source_row=row_idx,
            vuln_id=row.get("Vulnerability ID"),
            ip=row.get("IP"),
            qid=str(row.get("QID", "")),
            orig_val=str(first_detected),
            action="Vulnerability Age set to 0; SLA evaluated with 0 age",
            included="Yes"
        )
        age = 0
    else:
        age = (proc_date - first_detected).days
        
    sla_due_date = first_detected + dt.timedelta(days=sla_days)
    
    # Boundary: Age <= SLA => Within SLA; Age > SLA => Past due SLA
    if age <= sla_days:
        status = "Within SLA"
    else:
        status = "Past due SLA"
        
    return sla_days, age, status, sla_due_date
