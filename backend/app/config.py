"""
Application configuration.

All secrets are read from environment variables (.env). Nothing sensitive
is ever hard-coded or exposed to the frontend.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    database_url: str = "sqlite:///./vulnops.db"

    # Fernet key used to encrypt Qualys credentials at rest.
    # Generate one with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    credential_encryption_key: str = ""

    # JWT / session
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60 * 8

    # CORS
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Qualys API pagination
    qualys_page_size: int = 1000

    # Default SLA (days) by severity, used to seed the sla_rules table
    default_sla_critical: int = 15
    default_sla_high: int = 30
    default_sla_medium: int = 60
    default_sla_low: int = 90

    # Google Gemini AI Agent configuration
    gemini_api_key: str = ""
    gemini_project_name: str = "projects/176413128128"


settings = Settings()
