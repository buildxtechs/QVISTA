# Qualys Multi-Cloud IASP and Power BI Report Automation Tool

A complete, production-grade, locally executable vulnerability report automation system designed for cybersecurity engineering teams. It ingests raw Qualys VMDR vulnerability scans, AWS inventory, Azure inventory, enterprise CMDB registers, and exception registries, validating, normalizing, correlating, and generating finalized **IASP Reports** and **Power BI Data Reports**.

---

## 🏗️ Architecture & Data Flow

```
┌────────────────────────┐   ┌────────────────────────┐   ┌────────────────────────┐   ┌────────────────────────┐
│  Qualys Raw Vulnerability │   │ AWS Running Inventory  │   │ Azure Running Inventory│   │   CMDB Application     │
│       Data (CSV/XLSX)  │   │     (CSV/XLSX)         │   │       (CSV/XLSX)       │   │    Records (CSV/XLSX)  │
└───────────┬────────────┘   └───────────┬────────────┘   └───────────┬────────────┘   └───────────┬────────────┘
            │                            │                            │                            │
            ▼                            ▼                            ▼                            ▼
   [ Severity Filter ]           [ Running State ]            [ Running State ]            [ 5-Digit Correlation ]
  (Keep Sev 3, 4, 5 Only)        (InstanceState='running')    (STATUS='running/vm running') (Extract from Acct/Sub)
            │                            │                            │                            │
            └────────────────────────────┼────────────────────────────┼────────────────────────────┘
                                         ▼
                        ┌──────────────────────────────────┐
                        │   Multi-Cloud Correlation Engine │
                        │  (Priority 1: IP -> Hostname)    │
                        └────────────────┬─────────────────┘
                                         │
                                         ▼
                        ┌──────────────────────────────────┐
                        │   CMDB & Governance Enrichment   │
                        │ (APM ID, Owner, Org, IF/PCI, Env)│
                        └────────────────┬─────────────────┘
                                         │
                                         ▼
                        ┌──────────────────────────────────┐
                        │     SLA & Vulnerability Age      │
                        │ (Critical:30d, High:120d, Med:180)
                        └────────────────┬─────────────────┘
                                         │
                     ┌───────────────────┴───────────────────┐
                     ▼                                       ▼
       ┌───────────────────────────┐           ┌───────────────────────────┐
       │   Final IASP Workbook     │           │ Final Power BI Workbook   │
       │ (Excel with Audit Sheets) │           │ (Excel with Quality Logs) │
       └───────────────────────────┘           └───────────────────────────┘
```

---

## 📁 Application Folder Structure

```
qualys_iasp_powerbi_tool/
├── app.py                     # Interactive Streamlit UI Application (9 Tabs)
├── config.py                  # Configurable thresholds, SLAs, regexes & keywords
├── column_mapping.py          # Flexible, fuzzy header alias mapping
├── validation.py              # AuditLogger, IP validation & Formula Injection protection
├── enrichment.py              # 5-digit correlation ID extraction, Environment & IF/PCI logic
├── sla_engine.py              # SLA & Vulnerability Age calculation engine
├── exceptions.py              # Exception Register ingestion, date validation & tracking
├── processor.py               # Vectorized pipeline execution & 100% reconciliation checks
├── exporter.py                # Excel (XlsxWriter) and CSV report generation engine
├── test_suite.py              # Comprehensive unit tests
├── requirements.txt           # Python dependencies
└── README.md                  # Complete technical documentation
```

---

## ⚡ Installation & Local Execution

### 1. Create Virtual Environment
```bash
python3 -m venv .venv

# On macOS/Linux:
source .venv/bin/activate

# On Windows:
.venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r qualys_iasp_powerbi_tool/requirements.txt
```

### 3. Launch Streamlit Application
```bash
streamlit run qualys_iasp_powerbi_tool/app.py
```

### 4. Run Unit Test Suite
```bash
python3 -m unittest qualys_iasp_powerbi_tool.test_suite
```

---

## 🛡️ Core Rules & Policies Enforced

1. **Severity Filtering**: Automatically removes Severity 1 and 2 findings. Retains only Severity 3 (Medium), 4 (High), and 5 (Critical).
2. **Cloud Inventory Matching**:
   - **Priority 1**: Exact normalized Qualys IP matches AWS `PrivateIpAddress`.
   - **Priority 2**: Exact normalized Qualys IP matches Azure `PRIVATE IP ADDRESS`.
   - **Priority 3 & 4**: Hostname / FQDN / NetBIOS matches as a controlled fallback.
   - Non-running or stopped instances are excluded with reason `"AWS instance is not running"` or `"Azure VM is not running"`.
3. **Five-Digit Correlation ID**: Extracted via `(?<!\d)(\d{5})(?!\d)` from AWS `AccountName` or Azure `SUBSCRIPTION`, matching CMDB `Correlation ID`.
4. **SLA Governance**:
   - Severity 5 (Critical) -> **30 Days**
   - Severity 4 (High) -> **120 Days**
   - Severity 3 (Medium) -> **180 Days**
   - `Vulnerability Age` = Current Processing Date minus `First Detected`.
   - Boundary condition: `Age <= SLA` is marked **Within SLA**; `Age > SLA` is marked **Past due SLA**.
5. **Exception Handling**: Only active, approved exceptions within their valid start and end dates are marked as `"Exception Approved"`.
6. **100% Reconciliation Guarantee**: Ensures every single input record is accounted for across output workbooks and audit sheets.
