"""
app/core/config.py
Centralised settings — loaded from environment variables.
In AKS these are injected via K8s Secrets + ConfigMaps.
Sensitive values (DB password, tenant ID) come from Azure Key Vault
via the CSI driver mounted as env vars in the pod.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── App ──────────────────────────────────────────────
    APP_NAME: str = "GlassBox Claims API"
    APP_VERSION: str = "1.0.0"
    ENV: str = "development"             # development | staging | production
    LOG_LEVEL: str = "INFO"

    # ── Azure SQL ────────────────────────────────────────
    DB_SERVER: str                        # e.g. gbx-sql.database.windows.net
    DB_NAME: str = "GlassBoxClaims"
    DB_DRIVER: str = "ODBC Driver 18 for SQL Server"
    DB_POOL_SIZE: int = 10
    # Managed Identity auth — no password needed in AKS
    # Set DB_USE_MSI=true in prod; false uses DB_USER/DB_PASSWORD for local dev
    DB_USE_MSI: bool = True
    DB_USER: str = ""
    DB_PASSWORD: str = ""

    # ── Azure AD / Auth ──────────────────────────────────
    AZURE_TENANT_ID: str
    AZURE_CLIENT_ID: str                  # Managed Identity client ID
    AAD_AUDIENCE: str = "api://gbx-claims-api"

    # ── Dataverse ────────────────────────────────────────
    DATAVERSE_URL: str                    # e.g. https://org.crm.dynamics.com
    DATAVERSE_SCOPE: str = "https://org.crm.dynamics.com/.default"

    # ── Azure Blob (document upload) ─────────────────────
    BLOB_ACCOUNT_URL: str                 # e.g. https://gbxstorage.blob.core.windows.net
    BLOB_CONTAINER: str = "claim-documents"

    # ── External validation APIs ─────────────────────────
    NOAA_BASE_URL: str = "https://api.weather.gov"
    NICB_API_URL: str = "https://mock.nicb.internal/v1"
    ISO_CLAIMSEARCH_URL: str = "https://mock.iso.internal/v1"

    # ── Rate limiting ────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 60


@lru_cache
def get_settings() -> Settings:
    return Settings()
