"""
Complete Vectorized Processing Pipeline for Qualys Multi-Cloud IASP and Power BI Tool.
"""
import datetime as dt
import pandas as pd
from .config import ToolConfig
from .validation import AuditLogger, is_valid_ip, sanitize_formula_injection
from .enrichment import (
    extract_correlation_id, normalize_hostname, derive_environment,
    derive_scan_type, derive_vulnerability_category, normalize_if_pci, derive_if_or_pci
)
from .sla_engine import calculate_sla, parse_date_only
from .exceptions import process_exceptions

IASP_OUTPUT_COLUMNS = [
    "IP", "DNS", "NetBIOS", "Tracking Method", "OS", "IP Status", "Unique Id",
    "Vulnerability Name", "Vulnerability Status", "Type", "Risk Rating", "Port",
    "Protocol", "FQDN", "SSL", "First Detected", "Last Detected", "Times Detected",
    "Date Last Fixed", "First Reopened", "Last Reopened", "Times Reopened", "CVE ID",
    "Vendor Reference", "Bugtraq ID", "Threat", "Impact", "Recommendation",
    "Exploitability", "Associated Malware", "Results", "PCI Vuln", "Ticket State",
    "Instance", "Category", "QDS", "ARS", "ACS", "TruRisk Score", "IF or PCI",
    "Scan Type", "APM ID", "SLA", "App Owner", "Organization", "Exception Start Date",
    "Exception End Date", "IF", "PCI", "CSP", "Cloud Account Name", "Environment",
    "Impacted Asset", "Vulnerability Category", "Vulnerability ID"
]

POWERBI_OUTPUT_COLUMNS = [
    "Application Name", "APM ID", "Scan Type", "IP", "DNS", "NetBIOS", "Tracking Method",
    "OS", "IP Status", "Unique id", "Vulnerability Name", "Vulnerability Status", "Type",
    "Risk Rating", "Port", "Protocol", "FQDN", "SSL", "First Found date", "Last Detected",
    "Times Detected", "Date Last Fixed", "First Reopened", "Last Reopened", "Times Reopened",
    "CVE ID", "Vendor Reference", "Bugtraq ID", "Threat", "Impact", "Recommendation",
    "Exploitability", "Results", "PCI Vuln", "Ticket State", "Instance", "Category",
    "QDS", "ARS", "ACS", "TruRisk Score", "IF or PCI", "Source", "SLA", "Vulnerability Age",
    "App Owner", "Organization", "IF", "PCI", "Impacted Asset", "Cloud Account Name",
    "Environment", "CSP", "Vulnerability ID", "Vulnerability Category", "Within SLA/Past due SLA"
]

def process_datasets(
    qualys_df: pd.DataFrame,
    aws_df: pd.DataFrame | None,
    azure_df: pd.DataFrame | None,
    cmdb_df: pd.DataFrame | None,
    exceptions_df: pd.DataFrame | None,
    config: ToolConfig,
    logger: AuditLogger
) -> dict:
    """
    Executes complete ingestion, validation, matching, correlation, SLA calculation, and report generation.
    Returns: Complete dictionary containing DataFrames, counts, reconciliation checks, and logs.
    """
    logger.log_event("Initialization", "Starting processing pipeline", len(qualys_df))
    
    # -------------------------------------------------------------
    # 1. Process Exceptions
    # -------------------------------------------------------------
    active_exc_vuln_id, active_exc_ip_qid, exc_summary = process_exceptions(exceptions_df, config, logger)
    
    # -------------------------------------------------------------
    # 2. Process AWS Inventory
    # -------------------------------------------------------------
    aws_running_by_ip = {}
    aws_running_by_name = {}
    aws_non_running_ips = set()
    aws_non_running_names = set()
    aws_total_rows = len(aws_df) if aws_df is not None else 0
    
    if aws_df is not None and not aws_df.empty:
        for idx, row in aws_df.iterrows():
            state = str(row.get("InstanceState", "")).strip().lower()
            priv_ip = str(row.get("PrivateIpAddress", "")).strip() if pd.notna(row.get("PrivateIpAddress")) else None
            inst_name = str(row.get("InstanceName", "")).strip() if pd.notna(row.get("InstanceName")) else None
            
            norm_name, short_name = normalize_hostname(inst_name)
            is_running = state in [s.lower() for s in config.aws_running_states]
            
            record_info = {
                "csp": "AWS",
                "account_name": str(row.get("AccountName", "")),
                "account_id": str(row.get("AccountId", "")),
                "instance_id": str(row.get("InstanceId", "")),
                "instance_name": inst_name or "",
                "impacted_asset": priv_ip or "",
                "state": state,
                "is_running": is_running,
                "motsid": str(row.get("CAT-MOTSID", "")) if pd.notna(row.get("CAT-MOTSID")) else None,
            }
            
            if is_running:
                if priv_ip and is_valid_ip(priv_ip):
                    aws_running_by_ip[priv_ip] = record_info
                if norm_name:
                    aws_running_by_name[norm_name] = record_info
                if short_name:
                    aws_running_by_name[short_name] = record_info
            else:
                if priv_ip:
                    aws_non_running_ips.add(priv_ip)
                if norm_name:
                    aws_non_running_names.add(norm_name)
                if short_name:
                    aws_non_running_names.add(short_name)

    # -------------------------------------------------------------
    # 3. Process Azure Inventory
    # -------------------------------------------------------------
    azure_running_by_ip = {}
    azure_running_by_name = {}
    azure_non_running_ips = set()
    azure_non_running_names = set()
    azure_total_rows = len(azure_df) if azure_df is not None else 0
    
    if azure_df is not None and not azure_df.empty:
        for idx, row in azure_df.iterrows():
            status = str(row.get("STATUS", "")).strip().lower()
            priv_ip = str(row.get("PRIVATE IP ADDRESS", "")).strip() if pd.notna(row.get("PRIVATE IP ADDRESS")) else None
            vm_name = str(row.get("NAME", "")).strip() if pd.notna(row.get("NAME")) else None
            
            norm_name, short_name = normalize_hostname(vm_name)
            is_running = any(status == s.lower() for s in config.azure_running_statuses)
            
            record_info = {
                "csp": "Azure",
                "account_name": str(row.get("SUBSCRIPTION", "")),
                "subscription": str(row.get("SUBSCRIPTION", "")),
                "instance_id": str(row.get("RESOURCE GROUP", "")),
                "instance_name": vm_name or "",
                "impacted_asset": priv_ip or "",
                "state": status,
                "is_running": is_running,
            }
            
            if is_running:
                if priv_ip and is_valid_ip(priv_ip):
                    azure_running_by_ip[priv_ip] = record_info
                if norm_name:
                    azure_running_by_name[norm_name] = record_info
                if short_name:
                    azure_running_by_name[short_name] = record_info
            else:
                if priv_ip:
                    azure_non_running_ips.add(priv_ip)
                if norm_name:
                    azure_non_running_names.add(norm_name)
                if short_name:
                    azure_non_running_names.add(short_name)

    # -------------------------------------------------------------
    # 4. Process CMDB
    # -------------------------------------------------------------
    cmdb_by_correlation_id = {}
    cmdb_duplicates = set()
    cmdb_total_rows = len(cmdb_df) if cmdb_df is not None else 0
    
    if cmdb_df is not None and not cmdb_df.empty:
        for idx, row in cmdb_df.iterrows():
            raw_corr = row.get("Correlation ID")
            if pd.isna(raw_corr) or not str(raw_corr).strip():
                continue
                
            # Normalize decimal-looking Excel numbers e.g. 25401.0 -> 25401
            corr_str = str(raw_corr).strip()
            if corr_str.endswith(".0"):
                corr_str = corr_str[:-2]
            corr_id = corr_str.zfill(5)
            
            is_active_cmdb = str(row.get("Active", "True")).strip().lower() in ("true", "1", "yes", "active")
            if config.cmdb_active_only and not is_active_cmdb:
                continue
                
            cmdb_record = {
                "apm_id": str(row.get("Number(APMID)", "")),
                "application_name": str(row.get("Application Acronym(App name)", "")) or str(row.get("Name", "")),
                "app_owner": str(row.get("IT Application owner(App owner)", "")),
                "organization": str(row.get("Business owner(Organization)", "")),
                "pci": normalize_if_pci(row.get("PCI")),
                "if_val": normalize_if_pci(row.get("Internet facing(IF)")),
            }
            
            if corr_id in cmdb_by_correlation_id:
                cmdb_duplicates.add(corr_id)
                logger.log_issue(
                    category="Multiple CMDB matches",
                    description=f"Duplicate active CMDB records for Correlation ID {corr_id}.",
                    severity="Medium",
                    source_file="CMDB",
                    source_row=idx + 1,
                    action="Ambiguous CMDB correlation flagged",
                    included="Yes"
                )
            else:
                cmdb_by_correlation_id[corr_id] = cmdb_record

    # -------------------------------------------------------------
    # 5. Process Qualys Findings (Validation, Filtering, Correlation)
    # -------------------------------------------------------------
    total_qualys_input = len(qualys_df)
    sev1_excluded = []
    sev2_excluded = []
    invalid_sev_rows = []
    invalid_ip_rows = []
    missing_qid_rows = []
    unmatched_rows = []
    non_running_rows = []
    ambiguous_cloud_rows = []
    duplicate_rows = []
    
    retained_findings = []
    seen_finding_keys = {}
    
    for idx, row in qualys_df.iterrows():
        row_num = idx + 1
        raw_ip = str(row.get("IP", "")).strip() if pd.notna(row.get("IP")) else ""
        raw_qid = str(row.get("QID", "")).strip() if pd.notna(row.get("QID")) else ""
        raw_sev = row.get("Severity")
        
        # Validate QID
        if not raw_qid or raw_qid.lower() in ("nan", "none", "null"):
            missing_qid_rows.append(row)
            logger.log_issue(
                category="Missing QID",
                description="Qualys finding is missing mandatory QID.",
                severity="Critical",
                source_row=row_num,
                ip=raw_ip,
                action="Excluded from final reports",
                included="No"
            )
            continue
            
        # Validate IP
        if not raw_ip or not is_valid_ip(raw_ip):
            invalid_ip_rows.append(row)
            logger.log_issue(
                category="Invalid IP",
                description=f"Invalid or missing IP address: '{raw_ip}'.",
                severity="Critical",
                source_row=row_num,
                qid=raw_qid,
                orig_val=raw_ip,
                action="Excluded from final reports",
                included="No"
            )
            continue
            
        # Validate & Filter Severity
        try:
            numeric_sev = int(float(raw_sev))
        except (ValueError, TypeError):
            invalid_sev_rows.append(row)
            logger.log_issue(
                category="Invalid Severity",
                description=f"Invalid non-numeric Severity value: '{raw_sev}'.",
                severity="High",
                source_row=row_num,
                ip=raw_ip,
                qid=raw_qid,
                orig_val=str(raw_sev),
                action="Excluded from final reports and logged to Data Quality Log",
                included="No"
            )
            continue
            
        if numeric_sev == 1:
            sev1_excluded.append(row)
            continue
        if numeric_sev == 2:
            sev2_excluded.append(row)
            continue
        if numeric_sev not in config.included_severities:
            invalid_sev_rows.append(row)
            continue

        # Build Unique Vulnerability ID (Normalized IP + "/" + QID)
        vuln_id = f"{raw_ip}/{raw_qid}"
        
        # Duplicate Finding Detection: IP + QID + Port + Protocol
        port_val = str(row.get("Port", "0")).strip()
        proto_val = str(row.get("Protocol", "tcp")).strip().lower()
        finding_key = f"{raw_ip}:{raw_qid}:{port_val}:{proto_val}"
        
        if finding_key in seen_finding_keys:
            duplicate_rows.append(row)
            logger.log_issue(
                category="Duplicate Qualys finding",
                description=f"Duplicate detection identified for {finding_key}.",
                severity="Low",
                source_row=row_num,
                vuln_id=vuln_id,
                ip=raw_ip,
                qid=raw_qid,
                action=f"Duplicate handled according to policy: {config.duplicate_handling}",
                included="Yes" if config.duplicate_handling == "keep_all" else "Configured"
            )
            if config.duplicate_handling == "keep_first":
                continue
        else:
            seen_finding_keys[finding_key] = row_num

        # ---------------------------------------------------------
        # Cloud Inventory Matching (Priority 1 -> 4)
        # ---------------------------------------------------------
        matched_cloud = None
        match_method = "Unmatched"
        
        # Priority 1: Exact IP = AWS PrivateIpAddress
        # Priority 2: Exact IP = Azure PRIVATE IP ADDRESS
        has_aws_ip = raw_ip in aws_running_by_ip
        has_azure_ip = raw_ip in azure_running_by_ip
        
        if has_aws_ip and has_azure_ip:
            ambiguous_cloud_rows.append(row)
            logger.log_issue(
                category="Ambiguous cloud match",
                description=f"IP {raw_ip} matches both running AWS and Azure inventories.",
                severity="High",
                source_row=row_num,
                vuln_id=vuln_id,
                ip=raw_ip,
                qid=raw_qid,
                action="Sent to Data Quality Log for manual review",
                included="No"
            )
            continue
        elif has_aws_ip:
            matched_cloud = aws_running_by_ip[raw_ip]
            match_method = "AWS IP"
        elif has_azure_ip:
            matched_cloud = azure_running_by_ip[raw_ip]
            match_method = "Azure IP"
            
        # Priority 3 & 4: Hostname Match (Fallback)
        if not matched_cloud and config.allow_hostname_fallback:
            hostnames_to_check = [
                row.get("Instance"), row.get("DNS"), row.get("NetBIOS"), row.get("FQDN")
            ]
            for h in hostnames_to_check:
                if not h or pd.isna(h):
                    continue
                norm_h, short_h = normalize_hostname(h)
                
                in_aws = (norm_h in aws_running_by_name) or (short_h in aws_running_by_name)
                in_azure = (norm_h in azure_running_by_name) or (short_h in azure_running_by_name)
                
                if in_aws and in_azure:
                    ambiguous_cloud_rows.append(row)
                    logger.log_issue(
                        category="Ambiguous cloud match",
                        description=f"Hostname '{h}' matches both running AWS and Azure inventories.",
                        severity="High",
                        source_row=row_num,
                        vuln_id=vuln_id,
                        ip=raw_ip,
                        qid=raw_qid,
                        action="Sent to Data Quality Log for manual review",
                        included="No"
                    )
                    break
                elif in_aws:
                    matched_cloud = aws_running_by_name.get(norm_h) or aws_running_by_name.get(short_h)
                    match_method = "AWS Hostname"
                    break
                elif in_azure:
                    matched_cloud = azure_running_by_name.get(norm_h) or azure_running_by_name.get(short_h)
                    match_method = "Azure Hostname"
                    break

        # Check Non-Running Assets
        if not matched_cloud:
            is_non_running = (
                (raw_ip in aws_non_running_ips) or (raw_ip in azure_non_running_ips)
            )
            if is_non_running:
                non_running_rows.append(row)
                logger.log_issue(
                    category="Asset not running",
                    description="Finding matches only a non-running AWS/Azure instance.",
                    severity="Info",
                    source_row=row_num,
                    vuln_id=vuln_id,
                    ip=raw_ip,
                    qid=raw_qid,
                    action="Excluded from final report with reason: Asset is not running",
                    included="No"
                )
                continue
            else:
                unmatched_rows.append(row)
                logger.log_issue(
                    category="Cloud inventory not matched",
                    description="Finding IP and hostnames could not be matched to running cloud inventory.",
                    severity="Medium",
                    source_row=row_num,
                    vuln_id=vuln_id,
                    ip=raw_ip,
                    qid=raw_qid,
                    action="Placed into Unmatched Qualys Findings sheet",
                    included="No"
                )
                continue

        # ---------------------------------------------------------
        # 6. CMDB Enrichment (5-Digit Correlation ID Matching)
        # ---------------------------------------------------------
        cloud_acct_name = matched_cloud["account_name"]
        corr_id, corr_status = extract_correlation_id(cloud_acct_name, config.correlation_regex)
        
        # Fallback to CAT-MOTSID if enabled
        if not corr_id and config.allow_motsid_fallback and matched_cloud.get("motsid"):
            corr_id, corr_status = extract_correlation_id(matched_cloud["motsid"], config.correlation_regex)
            
        cmdb_match = None
        if corr_id:
            if corr_id in cmdb_duplicates:
                logger.log_issue(
                    category="Multiple CMDB matches",
                    description=f"Multiple active CMDB records exist for Correlation ID {corr_id}.",
                    severity="Medium",
                    source_row=row_num,
                    vuln_id=vuln_id,
                    ip=raw_ip,
                    qid=raw_qid,
                    orig_val=corr_id,
                    action="Enrichment fields left blank; manual resolution required",
                    included="Yes"
                )
            elif corr_id in cmdb_by_correlation_id:
                cmdb_match = cmdb_by_correlation_id[corr_id]
            else:
                logger.log_issue(
                    category="CMDB match not found",
                    description=f"Correlation ID {corr_id} was extracted but has no matching CMDB record.",
                    severity="Low",
                    source_row=row_num,
                    vuln_id=vuln_id,
                    ip=raw_ip,
                    qid=raw_qid,
                    orig_val=corr_id,
                    action="CMDB enrichment fields left blank",
                    included="Yes"
                )
        else:
            logger.log_issue(
                category="Correlation ID not found",
                description=f"{corr_status} in Cloud Account Name '{cloud_acct_name}'.",
                severity="Low",
                source_row=row_num,
                vuln_id=vuln_id,
                ip=raw_ip,
                qid=raw_qid,
                orig_val=cloud_acct_name,
                action="CMDB enrichment fields left blank",
                included="Yes"
            )

        # ---------------------------------------------------------
        # 7. Field Derivations (Environment, Scan Type, Category, IF/PCI)
        # ---------------------------------------------------------
        env_val, env_status = derive_environment(cloud_acct_name, config)
        scan_type_val = derive_scan_type(row.get("Tracking Method"), config)
        vuln_category, cat_status = derive_vulnerability_category(row, config)
        
        if_val = cmdb_match["if_val"] if cmdb_match else "Unknown"
        pci_val = cmdb_match["pci"] if cmdb_match else "Unknown"
        if_or_pci_val = derive_if_or_pci(if_val, pci_val)

        # ---------------------------------------------------------
        # 8. SLA Calculation
        # ---------------------------------------------------------
        row_with_sev = row.copy()
        row_with_sev["_numeric_severity"] = numeric_sev
        row_with_sev["Vulnerability ID"] = vuln_id
        sla_days, vuln_age, sla_status, sla_due_date = calculate_sla(row_with_sev, config, logger, row_num)

        # ---------------------------------------------------------
        # 9. Exception Application
        # ---------------------------------------------------------
        exc_data = active_exc_vuln_id.get(vuln_id) or active_exc_ip_qid.get(f"{raw_ip}/{raw_qid}")
        exc_start = exc_data["Exception Start Date"] if exc_data else ""
        exc_end = exc_data["Exception End Date"] if exc_data else ""
        reporting_status = "Exception Approved" if exc_data else str(row.get("Vuln Status", "Active"))

        # ---------------------------------------------------------
        # 10. Assemble Enriched Record
        # ---------------------------------------------------------
        first_detected_date = parse_date_only(row.get("First Detected"))
        last_detected_date = parse_date_only(row.get("Last Detected"))
        last_fixed_date = parse_date_only(row.get("Date Last Fixed"))
        
        risk_rating_str = config.severity_label_map.get(numeric_sev, "Medium")
        
        enriched_item = {
            # Shared identifiers & Qualys fields
            "IP": sanitize_formula_injection(raw_ip),
            "DNS": sanitize_formula_injection(row.get("DNS", "")),
            "NetBIOS": sanitize_formula_injection(row.get("NetBIOS", "")),
            "Tracking Method": sanitize_formula_injection(row.get("Tracking Method", "")),
            "OS": sanitize_formula_injection(row.get("OS", "")),
            "IP Status": sanitize_formula_injection(row.get("IP Status", "Active")),
            "Unique Id": str(raw_qid),
            "Unique id": str(raw_qid),
            "Vulnerability Name": sanitize_formula_injection(row.get("Title", "")),
            "Vulnerability Status": reporting_status,
            "Type": sanitize_formula_injection(row.get("Type", "")),
            "Risk Rating": risk_rating_str,
            "Port": row.get("Port", ""),
            "Protocol": sanitize_formula_injection(row.get("Protocol", "")),
            "FQDN": sanitize_formula_injection(row.get("FQDN", "")),
            "SSL": row.get("SSL", ""),
            "First Detected": first_detected_date.strftime("%Y-%m-%d") if first_detected_date else "",
            "First Found date": first_detected_date.strftime("%Y-%m-%d") if first_detected_date else "",
            "Last Detected": last_detected_date.strftime("%Y-%m-%d") if last_detected_date else "",
            "Times Detected": row.get("Times Detected", 1),
            "Date Last Fixed": last_fixed_date.strftime("%Y-%m-%d") if last_fixed_date else "",
            "First Reopened": row.get("First Reopened", ""),
            "Last Reopened": row.get("Last Reopened", ""),
            "Times Reopened": row.get("Times Reopened", 0),
            "CVE ID": sanitize_formula_injection(row.get("CVE ID", "")),
            "Vendor Reference": sanitize_formula_injection(row.get("Vendor Reference", "")),
            "Bugtraq ID": sanitize_formula_injection(row.get("Bugtraq ID", "")),
            "Threat": sanitize_formula_injection(row.get("Threat", "")),
            "Impact": sanitize_formula_injection(row.get("Impact", "")),
            "Recommendation": sanitize_formula_injection(row.get("Solution", "")),
            "Exploitability": sanitize_formula_injection(row.get("Exploitability", "")),
            "Associated Malware": sanitize_formula_injection(row.get("Associated Malware", "")),
            "Results": sanitize_formula_injection(row.get("Results", "")),
            "PCI Vuln": sanitize_formula_injection(row.get("PCI Vuln", "")),
            "Ticket State": sanitize_formula_injection(row.get("Ticket State", "")),
            "Instance": sanitize_formula_injection(row.get("Instance", "")),
            "Category": sanitize_formula_injection(row.get("Category", "")),
            "QDS": row.get("QDS", ""),
            "ARS": row.get("ARS", ""),
            "ACS": row.get("ACS", ""),
            "TruRisk Score": row.get("TruRisk Score", ""),
            
            # Derivations & CMDB Enrichment
            "IF or PCI": if_or_pci_val,
            "Scan Type": scan_type_val,
            "APM ID": cmdb_match["apm_id"] if cmdb_match else "",
            "Application Name": cmdb_match["application_name"] if cmdb_match else "",
            "SLA": sla_days,
            "Vulnerability Age": vuln_age if vuln_age is not None else "",
            "App Owner": cmdb_match["app_owner"] if cmdb_match else "",
            "Organization": cmdb_match["organization"] if cmdb_match else "",
            "Exception Start Date": exc_start,
            "Exception End Date": exc_end,
            "IF": if_val,
            "PCI": pci_val,
            "CSP": matched_cloud["csp"],
            "Cloud Account Name": cloud_acct_name,
            "Environment": env_val,
            "Impacted Asset": matched_cloud["impacted_asset"],
            "Vulnerability Category": vuln_category,
            "Vulnerability ID": vuln_id,
            "Source": config.default_source,
            "Within SLA/Past due SLA": sla_status,
            "_numeric_severity": numeric_sev,
            "_match_method": match_method
        }
        
        retained_findings.append(enriched_item)

    # Convert to DataFrames
    iasp_df = pd.DataFrame(retained_findings)
    if not iasp_df.empty:
        # Guarantee exact column order
        iasp_df_final = iasp_df[[c for c in IASP_OUTPUT_COLUMNS if c in iasp_df.columns]].copy()
        powerbi_df_final = iasp_df[[c for c in POWERBI_OUTPUT_COLUMNS if c in iasp_df.columns]].copy()
    else:
        iasp_df_final = pd.DataFrame(columns=IASP_OUTPUT_COLUMNS)
        powerbi_df_final = pd.DataFrame(columns=POWERBI_OUTPUT_COLUMNS)

    # -------------------------------------------------------------
    # 11. Automated Reconciliation Audit Check
    # -------------------------------------------------------------
    sev1_count = len(sev1_excluded)
    sev2_count = len(sev2_excluded)
    invalid_sev_count = len(invalid_sev_rows)
    invalid_ip_count = len(invalid_ip_rows)
    missing_qid_count = len(missing_qid_rows)
    
    retained_sev345_input_count = total_qualys_input - (sev1_count + sev2_count + invalid_sev_count + invalid_ip_count + missing_qid_count)
    final_retained_count = len(retained_findings)
    unmatched_count = len(unmatched_rows)
    non_running_count = len(non_running_rows)
    ambiguous_count = len(ambiguous_cloud_rows)
    
    # Input Reconciliation Check
    # Total Qualys Input == Excluded + Retained
    reconciled_input = (
        total_qualys_input == (sev1_count + sev2_count + invalid_sev_count + invalid_ip_count + missing_qid_count + retained_sev345_input_count)
    )
    
    # Output Reconciliation Check
    # Retained Sev3/4/5 == Final Matched + Unmatched + Non-Running + Ambiguous
    reconciled_output = (
        retained_sev345_input_count == (final_retained_count + unmatched_count + non_running_count + ambiguous_count)
    )
    
    overall_reconciled = reconciled_input and reconciled_output
    
    summary_counts = {
        "qualys_input_rows": total_qualys_input,
        "aws_inventory_rows": aws_total_rows,
        "azure_inventory_rows": azure_total_rows,
        "cmdb_rows": cmdb_total_rows,
        "exception_rows": exc_summary["total_exceptions"],
        "severity_1_excluded": sev1_count,
        "severity_2_excluded": sev2_count,
        "invalid_severity_rows": invalid_sev_count,
        "invalid_ip_rows": invalid_ip_count,
        "missing_qid_rows": missing_qid_count,
        "retained_sev345_input": retained_sev345_input_count,
        "aws_matched": sum(1 for f in retained_findings if f["CSP"] == "AWS"),
        "azure_matched": sum(1 for f in retained_findings if f["CSP"] == "Azure"),
        "ip_matched": sum(1 for f in retained_findings if "IP" in f["_match_method"]),
        "hostname_matched": sum(1 for f in retained_findings if "Hostname" in f["_match_method"]),
        "non_running": non_running_count,
        "ambiguous": ambiguous_count,
        "unmatched": unmatched_count,
        "final_iasp_rows": len(iasp_df_final),
        "final_powerbi_rows": len(powerbi_df_final),
        "critical_count": sum(1 for f in retained_findings if f["_numeric_severity"] == 5),
        "high_count": sum(1 for f in retained_findings if f["_numeric_severity"] == 4),
        "medium_count": sum(1 for f in retained_findings if f["_numeric_severity"] == 3),
        "within_sla": sum(1 for f in retained_findings if f["Within SLA/Past due SLA"] == "Within SLA"),
        "past_due_sla": sum(1 for f in retained_findings if f["Within SLA/Past due SLA"] == "Past due SLA"),
        "active_exceptions": sum(1 for f in retained_findings if f["Vulnerability Status"] == "Exception Approved"),
        "reconciliation_passed": overall_reconciled
    }
    
    logger.log_event("Completed", f"Processing finished. Reconciliation passed: {overall_reconciled}", len(iasp_df_final))
    
    return {
        "iasp_df": iasp_df_final,
        "powerbi_df": powerbi_df_final,
        "summary": summary_counts,
        "data_quality_df": logger.to_dataframe(),
        "unmatched_df": pd.DataFrame(unmatched_rows),
        "non_running_df": pd.DataFrame(non_running_rows),
        "ambiguous_df": pd.DataFrame(ambiguous_cloud_rows),
        "sev1_excluded_df": pd.DataFrame(sev1_excluded),
        "sev2_excluded_df": pd.DataFrame(sev2_excluded),
        "invalid_records_df": pd.DataFrame(invalid_sev_rows + invalid_ip_rows + missing_qid_rows),
        "duplicate_records_df": pd.DataFrame(duplicate_rows),
        "exceptions_summary": exc_summary
    }
