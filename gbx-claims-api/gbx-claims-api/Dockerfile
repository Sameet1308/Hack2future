# ── Stage 1: Build / dependency install ──────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# System deps for pyodbc (ODBC Driver 18)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl gnupg2 unixodbc-dev gcc g++ \
    && curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
    && curl https://packages.microsoft.com/config/debian/12/prod.list \
       > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --prefix=/install --no-cache-dir -r requirements.txt


# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Non-root user for AKS security context
RUN groupadd -r gbxapp && useradd -r -g gbxapp gbxapp

# ODBC runtime only (no build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl gnupg2 unixodbc \
    && curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
    && curl https://packages.microsoft.com/config/debian/12/prod.list \
       > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY app/ ./app/

# Ownership
RUN chown -R gbxapp:gbxapp /app
USER gbxapp

EXPOSE 8000

# Uvicorn — 2 workers per CPU core is standard for I/O-bound FastAPI
CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "2", \
     "--log-level", "info", \
     "--access-log"]
