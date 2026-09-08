"""
Comprehensive Unit Tests for Qualys Multi-Cloud IASP and Power BI Tool.
"""
import datetime as dt
import pandas as pd
import unittest

from qualys_iasp_powerbi_tool.config import get_default_config
from qualys_iasp_powerbi_tool.validation import AuditLogger, is_valid_ip
from qualys_iasp_powerbi_tool.enrichment import (
    extract_correlation_id, normalize_hostname, derive_environment,
    derive_scan_type, derive_vulnerability_category, normalize_if_pci, derive_if_or_pci
)
from qualys_iasp_powerbi_tool.sla_engine import calculate_sla, parse_date_only
from qualys_iasp_powerbi_tool.exceptions import process_exceptions
from qualys_iasp_powerbi_tool.processor import process_datasets, IASP_OUTPUT_COLUMNS, POWERBI_OUTPUT_COLUMNS

class TestReportAutomation(unittest.TestCase):

    def test_correlation_id_extraction(self):
        config = get_default_config()
        
        # Standard single 5-digit ID
        cid, status = extract_correlation_id("AWS-Prod-App (25401)", config.correlation_regex)
        self.assertEqual(cid, "25401")
        self.assertEqual(status, "Successfully extracted")
        
        # Preserves leading zeros
        cid2, status2 = extract_correlation_id("Azure-01923-Sub", config.correlation_regex)
        self.assertEqual(cid2, "01923")
        self.assertIsInstance(cid2, str)
        
        # No 5-digit ID
        cid3, status3 = extract_correlation_id("AWS-General-Acct", config.correlation_regex)
        self.assertIsNone(cid3)
        self.assertEqual(status3, "Correlation ID not found.")
        
        # Multiple distinct 5-digit IDs
        cid4, status4 = extract_correlation_id("AWS-Acct-12345-Backup-54321", config.correlation_regex)
        self.assertIsNone(cid4)
        self.assertEqual(status4, "Multiple correlation IDs found.")

    def test_ip_validation(self):
        self.assertTrue(is_valid_ip("10.0.0.1"))
        self.assertTrue(is_valid_ip("192.168.1.254"))
        self.assertFalse(is_valid_ip("invalid-ip"))
        self.assertFalse(is_valid_ip(""))
        self.assertFalse(is_valid_ip(None))

    def test_environment_derivation(self):
        config = get_default_config()
        self.assertEqual(derive_environment("AWS-Prod-Core (11223)", config)[0], "Prod")
        self.assertEqual(derive_environment("Azure-NonProd-Dev (11223)", config)[0], "Nprd")
        self.assertEqual(derive_environment("AWS-Prod-Dev-Test (11223)", config)[0], "Ambiguous")
        self.assertEqual(derive_environment("AWS-General (11223)", config)[0], "Unknown")

    def test_if_pci_derivation(self):
        self.assertEqual(normalize_if_pci("Yes"), "Yes")
        self.assertEqual(normalize_if_pci("1"), "Yes")
        self.assertEqual(normalize_if_pci("No"), "No")
        self.assertEqual(normalize_if_pci(None), "Unknown")
        
        self.assertEqual(derive_if_or_pci("Yes", "Yes"), "IF and PCI")
        self.assertEqual(derive_if_or_pci("Yes", "No"), "IF")
        self.assertEqual(derive_if_or_pci("No", "Yes"), "PCI")
        self.assertEqual(derive_if_or_pci("No", "No"), "Non-IF/PCI")

    def test_sla_calculation(self):
        config = get_default_config()
        config.processing_date = dt.date(2026, 9, 8)
        logger = AuditLogger()
        
        # Sev 5: 30 Days SLA, First detected 20 days ago => Within SLA
        row = pd.Series({
            "_numeric_severity": 5,
            "First Detected": "2026-08-19",
            "Vulnerability ID": "10.0.0.1/1001",
            "IP": "10.0.0.1",
            "QID": "1001"
        })
        sla, age, status, due = calculate_sla(row, config, logger, 1)
        self.assertEqual(sla, 30)
        self.assertEqual(age, 20)
        self.assertEqual(status, "Within SLA")
        
        # Boundary condition: Age == SLA (30 == 30) => Within SLA
        row_boundary = pd.Series({
            "_numeric_severity": 5,
            "First Detected": "2026-08-09",
            "Vulnerability ID": "10.0.0.1/1001"
        })
        sla, age, status, due = calculate_sla(row_boundary, config, logger, 2)
        self.assertEqual(age, 30)
        self.assertEqual(status, "Within SLA")
        
        # Past Due SLA: Age 31 > 30 => Past due SLA
        row_past = pd.Series({
            "_numeric_severity": 5,
            "First Detected": "2026-08-08",
            "Vulnerability ID": "10.0.0.1/1001"
        })
        sla, age, status, due = calculate_sla(row_past, config, logger, 3)
        self.assertEqual(age, 31)
        self.assertEqual(status, "Past due SLA")

    def test_end_to_end_reconciliation_and_filtering(self):
        config = get_default_config()
        config.processing_date = dt.date(2026, 9, 8)
        logger = AuditLogger()
        
        qualys_data = pd.DataFrame([
            # Sev 5 on Running AWS -> Matched
            {"IP": "10.20.0.10", "QID": "38876", "Title": "OpenSSL RCE", "Severity": 5, "Vuln Status": "Active", "First Detected": "2026-08-10", "Tracking Method": "AGENT", "Category": "Operating System"},
            # Sev 4 on Running Azure -> Matched
            {"IP": "10.30.0.20", "QID": "38877", "Title": "Apache HTTP Traversal", "Severity": 4, "Vuln Status": "Active", "First Detected": "2026-07-10", "Tracking Method": "AGENT", "Category": "Application"},
            # Sev 1 -> Excluded
            {"IP": "10.20.0.10", "QID": "10001", "Title": "Info Leak", "Severity": 1, "Vuln Status": "Active", "First Detected": "2026-08-10"},
            # Sev 2 -> Excluded
            {"IP": "10.20.0.10", "QID": "10002", "Title": "Low Cipher", "Severity": 2, "Vuln Status": "Active", "First Detected": "2026-08-10"},
            # Non-Running Asset -> Excluded
            {"IP": "10.20.0.99", "QID": "38876", "Title": "OpenSSL RCE", "Severity": 5, "Vuln Status": "Active", "First Detected": "2026-08-10"},
            # Unmatched Asset -> Excluded to Unmatched
            {"IP": "192.168.100.5", "QID": "38876", "Title": "OpenSSL RCE", "Severity": 5, "Vuln Status": "Active", "First Detected": "2026-08-10"},
        ])
        
        aws_data = pd.DataFrame([
            {"PrivateIpAddress": "10.20.0.10", "InstanceName": "aws-node-01", "InstanceState": "running", "AccountName": "AWS-Prod-Core (10293)"},
            {"PrivateIpAddress": "10.20.0.99", "InstanceName": "aws-stopped-01", "InstanceState": "stopped", "AccountName": "AWS-Prod-Core (10293)"}
        ])
        
        azure_data = pd.DataFrame([
            {"PRIVATE IP ADDRESS": "10.30.0.20", "NAME": "az-vm-01", "STATUS": "running", "SUBSCRIPTION": "Azure-Enterprise-Prod (20394)"}
        ])
        
        cmdb_data = pd.DataFrame([
            {"Correlation ID": "10293", "Number(APMID)": "APM0001001", "Application Acronym(App name)": "CorePay", "IT Application owner(App owner)": "Jane Doe", "Business owner(Organization)": "FinOps", "PCI": "Yes", "Internet facing(IF)": "No", "Active": "True"},
            {"Correlation ID": "20394", "Number(APMID)": "APM0002002", "Application Acronym(App name)": "PortalAPI", "IT Application owner(App owner)": "John Smith", "Business owner(Organization)": "SecOps", "PCI": "Yes", "Internet facing(IF)": "Yes", "Active": "True"},
        ])
        
        results = process_datasets(
            qualys_df=qualys_data,
            aws_df=aws_data,
            azure_df=azure_data,
            cmdb_df=cmdb_data,
            exceptions_df=None,
            config=config,
            logger=logger
        )
        
        sm = results["summary"]
        self.assertEqual(sm["qualys_input_rows"], 6)
        self.assertEqual(sm["severity_1_excluded"], 1)
        self.assertEqual(sm["severity_2_excluded"], 1)
        self.assertEqual(sm["final_iasp_rows"], 2)
        self.assertTrue(sm["reconciliation_passed"])
        
        iasp_df = results["iasp_df"]
        self.assertEqual(list(iasp_df.columns), IASP_OUTPUT_COLUMNS)
        self.assertEqual(iasp_df.iloc[0]["APM ID"], "APM0001001")
        self.assertEqual(iasp_df.iloc[0]["Vulnerability ID"], "10.20.0.10/38876")
        self.assertEqual(iasp_df.iloc[0]["CSP"], "AWS")
        self.assertEqual(iasp_df.iloc[0]["Environment"], "Prod")
        self.assertEqual(iasp_df.iloc[0]["IF or PCI"], "PCI")

if __name__ == "__main__":
    unittest.main()
