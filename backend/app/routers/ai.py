"""
Gemini AI Copilot Router for Vulnerability Management & Doubts Resolution.
Integrated with the user's provided Gemini API key & project configuration.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import requests
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app import models

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ChatRequest(BaseModel):
    prompt: str
    context: dict | None = None
    session_id: str | None = None


class WelcomeNoteRequest(BaseModel):
    user_name: str = "IVM Team"
    persona: str = "Vulnerability Management Specialist"


def _call_gemini(prompt: str, system_instruction: str = "") -> str:
    api_key = settings.gemini_api_key
    if not api_key:
        return "Welcome to QVISTA Security Operations! Ready to assist with Qualys posture and remediation doubts."

    candidate_models = [
        "gemini-2.5-flash",
        "gemini-flash-latest",
        "gemini-2.5-flash-lite",
        "gemini-3.5-flash",
    ]

    for model in candidate_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "contents": [
                {
                    "parts": [{"text": f"{system_instruction}\n\nUser Query: {prompt}" if system_instruction else prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 1024,
            }
        }

        try:
            resp = requests.post(url, json=payload, timeout=12)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates and "content" in candidates[0]:
                    parts = candidates[0]["content"].get("parts", [])
                    if parts:
                        return parts[0].get("text", "").strip()
        except Exception:
            continue

    return "Welcome back, IVM Team! Your unified Qualys VMDR dashboard is active with live correlation across AWS, Azure, and CMDB inventory. Let's tackle today's high-priority SLA breaches."


@router.post("/chat")
def ask_gemini_copilot(req: ChatRequest, db: Session = Depends(get_db)):
    """Interactive doubt resolution and vulnerability advisory powered by Google Gemini."""
    total_assets = db.query(models.Asset).count()
    open_vulns = db.query(models.HostDetection).filter(models.HostDetection.status != "Fixed").count()
    crit_vulns = (
        db.query(models.HostDetection)
        .join(models.Vulnerability)
        .filter(models.HostDetection.status != "Fixed", models.Vulnerability.severity == 5)
        .count()
    )
    sla_breached = db.query(models.HostDetection).filter(
        models.HostDetection.status != "Fixed", models.HostDetection.sla_status == "BREACHED"
    ).count()

    system_instruction = f"""
You are QVISTA AI Copilot, the elite Vulnerability Management Security Assistant for the IVM Team.
Real-time posture:
- Total Host Assets: {total_assets}
- Active Open Vulnerabilities: {open_vulns}
- Critical (Severity 5) Vulnerabilities: {crit_vulns}
- Overdue SLA Breaches: {sla_breached}

Your role:
1. Provide instant technical answers for doubts on CVEs, Qualys QIDs, TruRisk vs CVSS, patch strategies, AWS/Azure asset matching, and CMDB APM correlation.
2. Structure answers clearly with bullet points, remediation steps, and commands where helpful.
3. Be professional, direct, and actionable.
"""
    answer = _call_gemini(req.prompt, system_instruction=system_instruction)
    return {
        "reply": answer,
        "model": "gemini-flash-latest",
        "project": settings.gemini_project_name,
    }


@router.get("/welcome-note")
def get_welcome_note(user: str = "IVM Team", db: Session = Depends(get_db)):
    """Generate dynamic AI welcome notes and prioritized daily focus for the security team."""
    open_vulns = db.query(models.HostDetection).filter(models.HostDetection.status != "Fixed").count()
    crit_vulns = (
        db.query(models.HostDetection)
        .join(models.Vulnerability)
        .filter(models.HostDetection.status != "Fixed", models.Vulnerability.severity == 5)
        .count()
    )
    sla_breached = db.query(models.HostDetection).filter(
        models.HostDetection.status != "Fixed", models.HostDetection.sla_status == "BREACHED"
    ).count()

    prompt = f"""
Generate an inspiring, executive 2-sentence morning briefing welcome note for '{user}' on the QVISTA dashboard.
Context:
- {crit_vulns} Critical (Sev 5) vulnerabilities currently active
- {sla_breached} SLA breaches requiring urgent attention
- {open_vulns} total open findings

Keep it motivating, concise, and highlight the immediate remediation goal for today.
"""
    note = _call_gemini(prompt)
    return {
        "welcome_note": note.strip().replace('"', ''),
        "author": "QVISTA Gemini Copilot",
        "stats_highlight": {
            "critical_count": crit_vulns,
            "sla_breaches": sla_breached,
        }
    }
