"""
Central Configuration Module for Qualys Multi-Cloud IASP and Power BI Report Automation Tool.
"""
from dataclasses import dataclass, field
import datetime as dt
import re

DEFAULT_CORRELATION_REGEX = r"(?<!\d)(\d{5})(?!\d)"

@dataclass
class ToolConfig:
    # Severity & Risk Rating Mapping
    included_severities: list[int] = field(default_factory=lambda: [3, 4, 5])
    severity_label_map: dict[int, str] = field(default_factory=lambda: {
        5: "Critical",
        4: "High",
        3: "Medium",
        2: "Low",
        1: "Informational"
    })
    
    # SLA Days
    sla_days_map: dict[int, int] = field(default_factory=lambda: {
        5: 30,
        4: 120,
        3: 180,
        2: 365,
        1: 365
    })
    
    # Cloud Running States
    aws_running_states: list[str] = field(default_factory=lambda: ["running"])
    azure_running_statuses: list[str] = field(default_factory=lambda: ["running", "vm running"])
    
    # Fallback flags
    allow_public_ip_fallback: bool = False
    allow_hostname_fallback: bool = True
    allow_motsid_fallback: bool = False
    
    # Regex & Correlation
    correlation_regex: str = DEFAULT_CORRELATION_REGEX
    
    # Duplicate Finding Handling: "keep_all", "keep_latest", "keep_first"
    duplicate_handling: str = "keep_all"
    
    # CMDB Active Filter
    cmdb_active_only: bool = True
    
    # Processing Date (Defaults to today, can be overridden for historical runs)
    processing_date: dt.date = field(default_factory=dt.date.today)
    
    # Environment derivation patterns
    prod_env_tokens: list[str] = field(default_factory=lambda: ["prd", "prod", "production"])
    nprd_env_tokens: list[str] = field(default_factory=lambda: [
        "nprd", "nonprod", "non-prod", "dev", "development", "test", "tst", 
        "qa", "uat", "stage", "staging", "sandbox", "lab"
    ])
    
    # Scan type mapping
    scan_type_map: dict[str, str] = field(default_factory=lambda: {
        "qagent": "Agent",
        "agent": "Agent",
        "cloud agent": "Agent",
        "ip": "Scanner",
        "scanner": "Scanner",
        "network": "Scanner"
    })
    
    # Category Classification Keywords
    os_keywords: list[str] = field(default_factory=lambda: [
        "operating system", "kernel", "windows", "microsoft security update",
        "red hat", "rhel", "ubuntu", "debian", "centos", "oracle linux",
        "solaris", "aix", "rpm", "package", "security update", "patch", "linux", "cisco", "pan-os", "ios"
    ])
    app_keywords: list[str] = field(default_factory=lambda: [
        "database", "oracle database", "mysql", "postgresql", "sql server",
        "apache", "tomcat", "nginx", "java", "openssl", "browser",
        "middleware", "web server", "application", "library", "framework", "runtime", "python", "node"
    ])
    
    # Exception expiry thresholds (in days)
    exception_expiry_thresholds: list[int] = field(default_factory=lambda: [7, 15, 30])
    
    # Source Name
    default_source: str = "Qualys"

def get_default_config() -> ToolConfig:
    return ToolConfig()
