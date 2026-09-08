import datetime as dt

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship

from app.database import Base


def utcnow():
    return dt.datetime.utcnow()


def classify_asset_group(os_str: str | None, cloud_provider: str | None) -> str:
    """Classifies an asset into AWS, AZURE, or NETWORK based on OS and validated cloud inventory."""
    if os_str:
        os_lower = os_str.lower()
        network_keywords = [
            "cisco", "ios", "nx-os", "asa", "catalyst", "junos", "juniper",
            "fortinet", "fortios", "palo alto", "pan-os", "f5", "big-ip",
            "arista", "eos", "router", "switch", "firewall", "checkpoint",
            "gaia", "sonicwall", "brocade", "vyos", "netscaler", "citrix adc"
        ]
        if any(k in os_lower for k in network_keywords):
            return "NETWORK"

    if cloud_provider and cloud_provider.upper() in ("AWS", "AZURE"):
        return cloud_provider.upper()

    return "NETWORK" if (os_str and "network" in os_str.lower()) else (cloud_provider.upper() if cloud_provider else "AWS")


class QualysConnection(Base):
    """Stores Qualys API connection configuration."""
    __tablename__ = "qualys_connections"

    id = Column(Integer, primary_key=True)
    name = Column(String, default="Default Qualys Connection")
    platform_url = Column(String, nullable=False)          # e.g. https://qualysapi.qg2.apps.qualys.com
    username = Column(String, nullable=False)
    encrypted_password = Column(Text, nullable=False)       # Fernet-encrypted
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    last_tested_at = Column(DateTime, nullable=True)
    last_test_status = Column(String, nullable=True)        # "success" | "failed"


class Owner(Base):
    __tablename__ = "owners"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, unique=True)
    email = Column(String, nullable=True)
    team = Column(String, nullable=True)

    applications = relationship("Application", back_populates="owner")


class Application(Base):
    __tablename__ = "applications"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, unique=True)
    apm_id = Column(String, index=True, nullable=True)
    business_owner = Column(String, nullable=True)
    technical_owner_id = Column(Integer, ForeignKey("owners.id"), nullable=True)
    environment = Column(String, default="Production")  # Production / UAT / Development / DR
    organization = Column(String, nullable=True)
    internet_facing = Column(Boolean, default=False)
    pci_scope = Column(Boolean, default=False)

    owner = relationship("Owner", back_populates="applications")
    assets = relationship("Asset", back_populates="application")


class CMDBRecord(Base):
    """Ingested rows from enterprise CMDB Excel spreadsheets."""
    __tablename__ = "cmdb_records"
    id = Column(Integer, primary_key=True)
    apm_id = Column(String, index=True, nullable=False)
    application_name = Column(String, index=True, nullable=False)
    app_owner = Column(String, nullable=True)
    business_owner = Column(String, nullable=True)
    organization = Column(String, nullable=True)
    correlation_id = Column(String, index=True, nullable=True)  # 5-digit number e.g. 10293
    internet_facing = Column(Boolean, default=False)
    pci_scope = Column(Boolean, default=False)
    environment = Column(String, default="Production")
    impacted_asset = Column(String, nullable=True)
    ip = Column(String, index=True, nullable=True)
    source_file = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=utcnow)


class CloudInventory(Base):
    """Raw row(s) uploaded from an AWS or Azure inventory file with 5-digit correlation IDs."""
    __tablename__ = "cloud_inventory"
    id = Column(Integer, primary_key=True)
    cloud_provider = Column(String, nullable=False)   # AWS | AZURE
    correlation_id = Column(String, index=True, nullable=True)  # 5-digit number
    private_ip = Column(String, index=True, nullable=True)
    public_ip = Column(String, index=True, nullable=True)
    instance_id = Column(String, index=True, nullable=True)
    instance_name = Column(String, nullable=True)
    account_or_subscription = Column(String, nullable=True)
    resource_group = Column(String, nullable=True)
    region = Column(String, nullable=True)
    os = Column(String, nullable=True)
    status = Column(String, nullable=True)             # Running / Stopped / Terminated
    application_name = Column(String, nullable=True)
    owner_name = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=utcnow)
    source_file = Column(String, nullable=True)

    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)
    match_status = Column(String, default="UNMATCHED")  # MATCHED | PARTIAL | UNMATCHED | DUPLICATE | CONFLICT
    match_method = Column(String, nullable=True)         # private_ip | public_ip | hostname | fqdn | instance_id | correlation_id

    asset = relationship("Asset", back_populates="cloud_records")


class Asset(Base):
    """The unified/correlated asset with Asset Groups (AWS, AZURE, NETWORK) and CMDB context."""
    __tablename__ = "assets"
    id = Column(Integer, primary_key=True)

    qualys_host_id = Column(String, index=True, unique=True, nullable=True)
    ip = Column(String, index=True, nullable=True)
    dns = Column(String, nullable=True)
    netbios = Column(String, nullable=True)
    fqdn = Column(String, index=True, nullable=True)
    os = Column(String, nullable=True)
    os_version = Column(String, nullable=True)
    tracking_method = Column(String, default="IP")
    ip_status = Column(String, default="Active")
    
    # 3 Primary Asset Groups: AWS | AZURE | NETWORK
    asset_group = Column(String, index=True, default="UNASSIGNED")
    
    # 5-digit Correlation ID
    correlation_id = Column(String, index=True, nullable=True)
    
    # CMDB & Enterprise Context
    apm_id = Column(String, index=True, nullable=True)
    internet_facing = Column(Boolean, default=False)
    pci_scope = Column(Boolean, default=False)
    cloud_provider = Column(String, nullable=True)
    cloud_account_name = Column(String, nullable=True)
    csp = Column(String, nullable=True)
    environment = Column(String, default="Production")
    organization = Column(String, nullable=True)
    business_owner = Column(String, nullable=True)
    app_owner = Column(String, nullable=True)

    cloud_instance_id = Column(String, index=True, nullable=True)
    last_scan = Column(DateTime, nullable=True)
    last_vm_scan = Column(DateTime, nullable=True)
    agent_id = Column(String, nullable=True)
    agent_status = Column(String, nullable=True)
    asset_status = Column(String, default="Unknown")

    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("owners.id"), nullable=True)

    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    application = relationship("Application", back_populates="assets")
    owner = relationship("Owner")
    cloud_records = relationship("CloudInventory", back_populates="asset")
    detections = relationship("HostDetection", back_populates="asset")


class Vulnerability(Base):
    """Vulnerability catalog entry with TruRisk metrics and IASP metadata."""
    __tablename__ = "vulnerabilities"
    id = Column(Integer, primary_key=True)
    qid = Column(String, index=True, unique=True, nullable=False)
    title = Column(String, nullable=False)
    severity = Column(Integer, nullable=False)   # 1-5, matches Qualys convention
    category = Column(String, nullable=True)     # Confirmed Vulnerability / Potential / Information
    cve = Column(String, nullable=True)
    vendor_reference = Column(String, nullable=True)
    bugtraq_id = Column(String, nullable=True)
    threat = Column(Text, nullable=True)
    impact = Column(Text, nullable=True)
    solution = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    risk_rating = Column(String, nullable=True)  # Critical / High / Medium / Low
    exploitability = Column(String, nullable=True)
    associated_malware = Column(String, nullable=True)
    vulnerability_category = Column(String, default="General")

    detections = relationship("HostDetection", back_populates="vulnerability")


class HostDetection(Base):
    """Finding on an asset with TruRisk scoring, QDS, ARS, ACS, and Exception Approved details."""
    __tablename__ = "host_detections"
    id = Column(Integer, primary_key=True)

    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    vulnerability_id = Column(Integer, ForeignKey("vulnerabilities.id"), nullable=False)

    port = Column(Integer, nullable=True)
    protocol = Column(String, nullable=True)
    ssl = Column(Boolean, default=False)

    status = Column(String, default="Active")  # Active | New | Fixed | Reopened
    ticket_state = Column(String, default="OPEN")
    instance_name = Column(String, nullable=True)
    scan_type = Column(String, default="Vulnerability Scan")
    pci_vuln = Column(Boolean, default=False)
    results = Column(Text, nullable=True)

    # Qualys TruRisk scoring
    qds = Column(Integer, default=70)           # Qualys Detection Score (1-100)
    ars = Column(Integer, default=650)          # Asset Risk Score (1-1000)
    acs = Column(Integer, default=4)            # Asset Criticality Score (1-5)
    trurisk_score = Column(Integer, default=680)

    first_found = Column(DateTime, nullable=True)
    last_detected = Column(DateTime, nullable=True)
    times_detected = Column(Integer, default=1)

    date_last_fixed = Column(DateTime, nullable=True)
    first_reopened = Column(DateTime, nullable=True)
    last_reopened = Column(DateTime, nullable=True)
    times_reopened = Column(Integer, default=0)

    # Computed/cached SLA
    age_days = Column(Integer, nullable=True)
    sla_days = Column(Integer, nullable=True)
    sla_status = Column(String, nullable=True)   # WITHIN_SLA | BREACHED | FIXED | EXCEPTION

    # Exception approval details
    is_exception_approved = Column(Boolean, default=False)
    exception_start_date = Column(DateTime, nullable=True)
    exception_end_date = Column(DateTime, nullable=True)
    exception_id = Column(Integer, ForeignKey("exceptions.id"), nullable=True)

    asset = relationship("Asset", back_populates="detections")
    vulnerability = relationship("Vulnerability", back_populates="detections")

    __table_args__ = (
        UniqueConstraint("asset_id", "vulnerability_id", "port", "protocol", name="uq_detection"),
    )


class SLARule(Base):
    __tablename__ = "sla_rules"
    id = Column(Integer, primary_key=True)
    severity = Column(Integer, nullable=False, unique=True)  # 1-5
    sla_days = Column(Integer, nullable=False)


class Exception_(Base):
    __tablename__ = "exceptions"
    id = Column(Integer, primary_key=True)
    qid = Column(String, index=True, nullable=True)
    cve = Column(String, nullable=True)
    title = Column(String, nullable=False)
    asset_group = Column(String, default="AWS")  # AWS | AZURE | NETWORK
    hostname = Column(String, nullable=True)
    requested_by = Column(String, nullable=True)
    approved_by = Column(String, nullable=True)
    reason = Column(Text, nullable=False)
    status = Column(String, default="APPROVED")  # APPROVED | PENDING_APPROVAL | FALSE_POSITIVE | EXPIRED
    expires_in_days = Column(Integer, default=60)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)


class SyncHistory(Base):
    __tablename__ = "sync_history"
    id = Column(Integer, primary_key=True)
    started_at = Column(DateTime, default=utcnow)
    finished_at = Column(DateTime, nullable=True)
    status = Column(String, default="running")  # running | success | failed
    hosts_processed = Column(Integer, default=0)
    findings_processed = Column(Integer, default=0)
    new_findings = Column(Integer, default=0)
    fixed_findings = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=utcnow)
    actor = Column(String, nullable=True)
    action = Column(String, nullable=False)
    detail = Column(Text, nullable=True)
