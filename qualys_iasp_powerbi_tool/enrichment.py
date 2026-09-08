"""
Correlation, Multi-Cloud Inventory Matching, and CMDB Enrichment Engine.
"""
import re
import ipaddress
import pandas as pd
from .config import ToolConfig
from .validation import AuditLogger, is_valid_ip

def extract_correlation_id(text_val: str | None, regex_pattern: str) -> tuple[str | None, str]:
    """
    Extracts a standalone five-digit numeric correlation ID from text.
    Returns: (extracted_id_or_none, extraction_status)
    """
    if not text_val or pd.isna(text_val):
        return None, "Correlation ID not found."
    
    text_str = str(text_val).strip()
    matches = re.findall(regex_pattern, text_str)
    
    if not matches:
        return None, "Correlation ID not found."
    
    unique_matches = list(dict.fromkeys(matches))
    if len(unique_matches) == 1:
        # Exactly one 5-digit correlation ID found
        return str(unique_matches[0]), "Successfully extracted"
    
    # Multiple distinct 5-digit IDs found
    return None, "Multiple correlation IDs found."

def normalize_hostname(h: str | None) -> tuple[str, str]:
    """Returns (full_normalized_lower, short_hostname_lower)"""
    if not h or pd.isna(h):
        return "", ""
    s = str(h).strip().rstrip(".").lower()
    short = s.split(".")[0] if "." in s else s
    return s, short

def derive_environment(text_val: str | None, config: ToolConfig) -> tuple[str, str]:
    """
    Derives Environment (Prod / Nprd / Ambiguous / Unknown) using token-based matching.
    """
    if not text_val or pd.isna(text_val):
        return "Unknown", "No text provided"
    
    # Extract alphanumeric words/tokens
    tokens = [t.lower() for t in re.split(r"[^a-zA-Z0-9]+", str(text_val)) if t]
    
    has_prod = any(t in config.prod_env_tokens for t in tokens)
    has_nprd = any(t in config.nprd_env_tokens for t in tokens)
    
    if has_prod and has_nprd:
        return "Ambiguous", "Both Prod and Non-Prod tokens matched"
    if has_prod:
        return "Prod", "Matched production token"
    if has_nprd:
        return "Nprd", "Matched non-production token"
    return "Unknown", "No recognized environment tokens"

def derive_scan_type(tracking_method: str | None, config: ToolConfig) -> str:
    if not tracking_method or pd.isna(tracking_method):
        return "Unknown"
    norm = str(tracking_method).strip().lower()
    return config.scan_type_map.get(norm, "Scanner" if "ip" in norm else "Unknown")

def derive_vulnerability_category(row: pd.Series, config: ToolConfig) -> tuple[str, str]:
    """
    Determines if a finding is OS, Application, or Unknown based on Category, Title, OS, Type, and Solution.
    """
    cat = str(row.get("Category", "")).lower()
    title = str(row.get("Title", "")).lower()
    os_val = str(row.get("OS", "")).lower()
    vuln_type = str(row.get("Type", "")).lower()
    solution = str(row.get("Solution", "")).lower()
    
    combined_text = f"{cat} {title} {os_val} {vuln_type} {solution}"
    
    has_os = any(k in combined_text for k in config.os_keywords)
    has_app = any(k in combined_text for k in config.app_keywords)
    
    if has_os and not has_app:
        return "OS", "Matched OS keyword signature"
    if has_app and not has_os:
        return "Application", "Matched Application keyword signature"
    if has_os and has_app:
        # Priority check on Category and Title
        title_cat = f"{cat} {title}"
        if any(k in title_cat for k in config.os_keywords) and not any(k in title_cat for k in config.app_keywords):
            return "OS", "Priority resolved to OS via Title/Category"
        if any(k in title_cat for k in config.app_keywords) and not any(k in title_cat for k in config.os_keywords):
            return "Application", "Priority resolved to Application via Title/Category"
        return "Unknown", "Ambiguous: matched both OS and App keywords with equal weight"
    return "Unknown", "No category keywords matched"

def normalize_if_pci(val) -> str:
    if val is None or pd.isna(val):
        return "Unknown"
    s = str(val).strip().lower()
    if s in ("yes", "y", "true", "1", "in scope"):
        return "Yes"
    if s in ("no", "n", "false", "0", "out of scope"):
        return "No"
    return "Unknown"

def derive_if_or_pci(if_val: str, pci_val: str) -> str:
    if if_val == "Yes" and pci_val == "Yes":
        return "IF and PCI"
    if if_val == "Yes":
        return "IF"
    if pci_val == "Yes":
        return "PCI"
    if if_val == "No" and pci_val == "No":
        return "Non-IF/PCI"
    return "Unknown"
