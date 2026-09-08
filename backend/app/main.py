from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.services.sla_engine import seed_default_sla_rules
from app.routers import (
    qualys, dashboard, assets, vulnerabilities, applications, upload, sla, reports, cloud, seed_data, cmdb, ai, exceptions
)

app = FastAPI(
    title="QVISTA - Qualys Vulnerability Intelligence & Security Tracking",
    description="Qualys Vulnerability Intelligence & Security Tracking — Discover • Correlate • Prioritize",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_default_sla_rules(db)
    finally:
        db.close()


app.include_router(qualys.router)
app.include_router(dashboard.router)
app.include_router(assets.router)
app.include_router(vulnerabilities.router)
app.include_router(applications.router)
app.include_router(upload.router)
app.include_router(sla.router)
app.include_router(reports.router)
app.include_router(cloud.router)
app.include_router(seed_data.router)
app.include_router(cmdb.router)
app.include_router(ai.router)
app.include_router(exceptions.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "vulnops-backend"}
