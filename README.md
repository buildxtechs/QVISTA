# 🛡️ QVISTA — Qualys Vulnerability Intelligence & Security Tracking

<div align="center">

![QVISTA Architecture](https://img.shields.io/badge/Enterprise-Security%20Command%20Center-red?style=for-the-badge&logo=qualys)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.4-38B2AC?style=for-the-badge&logo=tailwind-css)
![SQLite/PostgreSQL](https://img.shields.io/badge/Database-SQLite%20%7C%20Postgres-336791?style=for-the-badge&logo=postgresql)

<p align="center">
  <b>Unified Vulnerability Management • Multi-Cloud Inventory Correlation • Real-Time SLA Governance • CMDB Intelligence</b>
</p>

</div>

---

## 📖 Overview

**QVISTA** connects directly to your **Qualys VMDR API** and ingests your **AWS**, **Azure**, and **Enterprise CMDB** spreadsheets. It solves the industry-wide challenge of orphan vulnerabilities by automatically mapping raw findings to:
- **5-Digit Enterprise Correlation IDs**
- **APM IDs & Application Names**
- **IT Application Owners & Business Stakeholders**
- **Internet-Facing (IF) & PCI DSS Scopes**
- **Strict Multi-Tier SLA Rules** (Sev 5: 30d, Sev 4: 90/120d, Sev 3: 180d)

```
       ┌────────────────────────┐
       │   Qualys VMDR API      │──┐
       └────────────────────────┘  │
       ┌────────────────────────┐  ├─▶  [ QVISTA Correlation Engine ]
       │  AWS / Azure Inventory │──┤        • IP Matching (Private/Public)
       └────────────────────────┘  │        • 5-Digit Correlation ID
       ┌────────────────────────┐  │        • CMDB APM Metadata Mapping
       │  Enterprise CMDB Hub   │──┘
       └────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Unified Security Platform                          │
├───────────────────┬───────────────────┬─────────────────────────────────┤
│ Executive View    │ APM Explorer      │ SLA Governance & Velocity       │
│ Power BI Findings │ Compliance Engine │ Risk Exceptions & FP Ledger     │
└───────────────────┴───────────────────┴─────────────────────────────────┘
```

---

## ✨ Key Capabilities & Modules

| Module | Route | Highlights |
| :--- | :--- | :--- |
| **Executive Overview** | `/` | Real-time threat KPIs, 30-day velocity trends, multi-cloud correlation breakdown, and instant sync. |
| **APM Explorer & CMDB** | `/apms` | Deep application risk ranking, IT & Business owner mapping, correlation ratios, and TruRisk scores. |
| **Power BI Findings Grid** | `/vulnerabilities` | Exact enterprise column layout, QID search, live APM ID filters, and status filters (`Active`, `New`, `Re-Opened`, `Fixed`). |
| **SLA Governance** | `/sla-governance` | Breach countdown, priority remediation queue, severity rules, and application compliance leaderboard. |
| **Compliance Engine** | `/compliance` | Multi-standard compliance mapping for **SOC 2 Type II**, **ISO 27001**, **PCI-DSS v4.0**, **GDPR**, and **HIPAA**. |
| **Risk Exceptions Ledger** | `/exceptions` | Real-time CRUD risk acceptances, compensating control records, and false-positive tracking. |
| **Multi-Cloud Ingestion** | `/upload` | Drag-and-drop ingestion for AWS EC2, Azure VMs, and CMDB Excel/CSV sheets with auto-matching. |
| **Reporting Hub** | `/reports` | One-click export for **IASP Standard Matrix (.xlsx)**, **Power BI Schemas**, and Executive CSVs. |

---

## 🛠️ Prerequisites

Before running QVISTA, ensure you have installed:
- **Python**: `v3.10+` or `v3.11+`
- **Node.js**: `v18.x` or `v20.x+` (with `npm`)
- **Git**: `v2.30+`
- *(Optional)* **Qualys VMDR Account** with API enabled credentials.

---

## 🚀 Quick Start Guide

### 1. Clone the Repository
```bash
git clone https://github.com/buildxtechs/QVISTA.git
cd QVISTA
```

---

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS / Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env from template
cp .env.example .env

# Generate encryption key for secure Qualys credential storage
python3 -c "from cryptography.fernet import Fernet; print('CREDENTIAL_ENCRYPTION_KEY=' + Fernet.generate_key().decode())"
# Copy the output line into your backend/.env file

# Run the FastAPI server
uvicorn app.main:app --reload --port 8001
```

> **API Documentation**: Once running, access the interactive Swagger docs at `http://localhost:8001/docs`.

---

### 3. Frontend Setup

In a new terminal window:

```bash
# Navigate to frontend
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```

> Open `http://localhost:5173` in your browser.

---

## 📂 Project Architecture

```
QVISTA/
├── backend/
│   ├── app/
│   │   ├── routers/          # REST Endpoints (SLA, APM, Dashboard, Exceptions, CMDB, Reports)
│   │   ├── services/         # Correlation Engine, Qualys Client, SLA Calculator, Seed Data
│   │   ├── models.py         # SQLAlchemy Database Schema
│   │   ├── schemas.py        # Pydantic Request/Response Models
│   │   ├── database.py       # Engine & Session Management
│   │   └── main.py           # FastAPI Initialization
│   ├── requirements.txt      # Python Dependencies
│   └── .env.example          # Environment Variables
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI (CloudComparisonHub, TopNavbar, SeverityBadge, Modals)
│   │   ├── pages/            # Application Views (SlaGovernance, Vulnerabilities, ApmExplorer, etc.)
│   │   ├── lib/api.js        # Central API Client
│   │   ├── App.jsx           # Routing & Sidebar Navigation
│   │   └── index.css         # Enterprise Light Theme (Royal Blue #2563EB & Qualys Red #DC2626)
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 📊 Standardized SLA Rules Hierarchy

| Severity | Target Window | Condition |
| :---: | :---: | :--- |
| **Severity 5 (Critical)** | **30 Days** | High Exploitability, Zero-Days, Direct RCE |
| **Severity 4 (High)** | **90 Days** | Internet-Facing (IF) or PCI DSS in Scope |
| **Severity 4 (High)** | **120 Days** | Internal / Standard Scope |
| **Severity 3 (Medium)** | **180 Days** | Moderate Risk & Configuration Vulnerabilities |
| **Severity 2 & 1** | **Best Effort** | Low Impact & Informational Signatures |

---

## 🔒 Security & Compliance Notes
- **Credential Encryption**: Qualys API passwords are encrypted using `AES-128-CBC` via Fernet and are write-only.
- **Audit Logging**: System and user actions are tracked in immutable audit logs (`/api/audit-logs`).
- **Zero Mock State**: Built-in SQLite/Postgres ORM ensures full persistence across sessions and uploads.

---

## 👥 Contributing & License
Maintained by **QVISTA Core Team** • Licensed under the MIT License.
