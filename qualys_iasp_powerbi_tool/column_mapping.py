"""
Flexible, Case/Whitespace/Special-character-insensitive Column Mapping Module.
"""
import re
import pandas as pd

QUALYS_EXPECTED_COLUMNS = [
    "IP", "DNS", "NetBIOS", "Tracking Method", "OS", "IP Status", "QID",
    "Title", "Vuln Status", "Type", "Severity", "Port", "Protocol", "FQDN", "SSL",
    "First Detected", "Last Detected", "Times Detected", "Date Last Fixed",
    "First Reopened", "Last Reopened", "Times Reopened", "CVE ID",
    "Vendor Reference", "Bugtraq ID", "Threat", "Impact", "Solution",
    "Exploitability", "Results", "PCI Vuln", "Ticket State", "Instance",
    "Category", "Associated Tags", "QDS", "ARS", "ACS", "TruRisk Score",
    "Associated Malware"
]

AWS_EXPECTED_COLUMNS = [
    "AccountId", "AccountName", "Region", "InstanceId", "InstanceName",
    "PrivateIpAddress", "PublicIpAddress", "InstanceType", "InstanceState",
    "PlatformDetails", "CreationDate", "VpcId", "AmiId", "CAT-AppOwner",
    "CAT-MOTSID", "CAT-AVP", "CAT-AppName", "CAT-Dir", "CAT-SVP", "CAT-SrDir", "CAT-VP"
]

AZURE_EXPECTED_COLUMNS = [
    "NAME", "SUBSCRIPTION", "RESOURCE GROUP", "LOCATION", "STATUS",
    "OPERATING SYSTEM", "SIZE", "PRIVATE IP ADDRESS", "TIME CREATED",
    "OWNERNAME (TAG)", "RESOURCE LINK"
]

CMDB_EXPECTED_COLUMNS = [
    "Number(APMID)", "Name", "Application Acronym(App name)", "Correlation ID",
    "Active", "Description", "Application category", "IT Application owner(App owner)",
    "Business owner(Organization)", "Roster Team", "Support group", "Managed By Group",
    "Chain Of Command", "Install Status", "Business Unit", "Department", "Application type",
    "Architecture type", "Install type", "Platform", "Platform Host", "User base",
    "Technology stack", "Business criticality", "Emergency tier", "Data classification",
    "Vendor", "Support vendor", "Contract end date", "Certified", "Updated",
    "Last updated by", "Created", "Created by", "PCI", "Internet facing(IF)"
]

EXCEPTION_EXPECTED_COLUMNS = [
    "Exception ID", "Vulnerability ID", "IP", "QID", "APM ID", "Vulnerability Name",
    "Exception Status", "Exception Start Date", "Exception End Date", "Exception Reason",
    "Business Justification", "Approved By", "App Owner", "Organization", "Comments",
    "Last Updated Date", "Last Updated By"
]

COLUMN_ALIASES = {
    # Qualys Aliases
    "Unique Id": "QID",
    "qid": "QID",
    "Title": "Title",
    "Vulnerability Name": "Title",
    "Vuln Status": "Vuln Status",
    "Vulnerability Status": "Vuln Status",
    "Solution": "Solution",
    "Recommendation": "Solution",
    "First Detected": "First Detected",
    "First Found date": "First Detected",
    "First Found": "First Detected",
    "Severity": "Severity",
    "Risk Rating": "Severity",
    "Associated Malware": "Associated Malware",
    
    # AWS Aliases
    "PrivateIpAddress": "PrivateIpAddress",
    "Private IP Address": "PrivateIpAddress",
    "PrivateIP": "PrivateIpAddress",
    "Private IP": "PrivateIpAddress",
    "PrivateIp": "PrivateIpAddress",
    "Account Name": "AccountName",
    "AccountName": "AccountName",
    "Instance Id": "InstanceId",
    "InstanceId": "InstanceId",
    "Instance Name": "InstanceName",
    "InstanceName": "InstanceName",
    "Instance State": "InstanceState",
    "InstanceState": "InstanceState",
    
    # Azure Aliases
    "NAME": "NAME",
    "Name": "NAME",
    "VM Name": "NAME",
    "SUBSCRIPTION": "SUBSCRIPTION",
    "Subscription": "SUBSCRIPTION",
    "Subscription Name": "SUBSCRIPTION",
    "STATUS": "STATUS",
    "Status": "STATUS",
    "PowerState": "STATUS",
    "PRIVATE IP ADDRESS": "PRIVATE IP ADDRESS",
    "Private IP Address": "PRIVATE IP ADDRESS",
    "Private IP": "PRIVATE IP ADDRESS",
    "PrivateIP": "PRIVATE IP ADDRESS",
    
    # CMDB Aliases
    "Number": "Number(APMID)",
    "APM ID": "Number(APMID)",
    "APMID": "Number(APMID)",
    "Number(APMID)": "Number(APMID)",
    "Application Acronym": "Application Acronym(App name)",
    "Application Acronym(App name)": "Application Acronym(App name)",
    "App Acronym": "Application Acronym(App name)",
    "IT Application owner": "IT Application owner(App owner)",
    "IT Application owner(App owner)": "IT Application owner(App owner)",
    "IT App Owner": "IT Application owner(App owner)",
    "App Owner": "IT Application owner(App owner)",
    "Business owner": "Business owner(Organization)",
    "Business owner(Organization)": "Business owner(Organization)",
    "Organization": "Business owner(Organization)",
    "Internet facing": "Internet facing(IF)",
    "Internet Facing": "Internet facing(IF)",
    "Internet facing(IF)": "Internet facing(IF)",
    "IF": "Internet facing(IF)",
    "PCI": "PCI",
    "PCI Scope": "PCI",
    "Correlation ID": "Correlation ID",
    "CorrelationID": "Correlation ID",
    "Correlation_ID": "Correlation ID",
}

def normalize_key(s: str) -> str:
    """Removes whitespace, underscores, hyphens, and converts to lowercase."""
    return re.sub(r"[^a-zA-Z0-9]", "", str(s)).lower()

def map_dataframe_columns(df: pd.DataFrame, expected_cols: list[str]) -> tuple[pd.DataFrame, dict[str, str], list[str]]:
    """
    Normalizes DataFrame headers and matches them against expected schema using fuzzy alias matching.
    Returns: (Renamed DataFrame, Mapping Used, Missing Required Columns)
    """
    normalized_expected = {normalize_key(c): c for c in expected_cols}
    normalized_aliases = {normalize_key(k): v for k, v in COLUMN_ALIASES.items()}
    
    mapping = {}
    for col in df.columns:
        norm_col = normalize_key(col)
        # Direct expected match
        if norm_col in normalized_expected:
            mapping[col] = normalized_expected[norm_col]
        # Alias match
        elif norm_col in normalized_aliases:
            mapping[col] = normalized_aliases[norm_col]
        else:
            # Keep original
            mapping[col] = str(col).strip()
            
    renamed_df = df.rename(columns=mapping)
    missing = [c for c in expected_cols if c not in renamed_df.columns]
    return renamed_df, mapping, missing
