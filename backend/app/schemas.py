import datetime as dt

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field


class QualysConnectionIn(BaseModel):
    name: str = "Default Qualys Connection"
    platform_url: str = Field(..., examples=["https://qualysapi.qualys.com"])
    username: str
    password: str


class QualysConnectionUpdate(BaseModel):
    name: str | None = None
    platform_url: str | None = None
    username: str | None = None
    password: str | None = None
    is_active: bool | None = None


class QualysConnectionOut(BaseModel):
    id: int
    name: str
    platform_url: str
    username: str
    is_active: bool
    last_tested_at: dt.datetime | None
    last_test_status: str | None

    model_config = {"from_attributes": True}


class SyncStatusOut(BaseModel):
    id: int
    started_at: dt.datetime
    finished_at: dt.datetime | None
    status: str
    hosts_processed: int
    findings_processed: int
    new_findings: int
    fixed_findings: int
    error_message: str | None

    model_config = {"from_attributes": True}


class DashboardSummary(BaseModel):
    assets: int
    vulnerabilities_open: int
    critical: int
    high: int
    medium: int
    low: int
    sla_breached: int
    new_last_7_days: int
    fixed_last_7_days: int
    reopened_total: int
    cloud_matched: int
    cloud_unmatched: int
    aws_assets: int = 0
    azure_assets: int = 0
    network_assets: int = 0


class AgingBucket(BaseModel):
    label: str
    count: int


class SLARuleIn(BaseModel):
    severity: int
    sla_days: int


class SLARuleOut(SLARuleIn):
    id: int
    model_config = {"from_attributes": True}
