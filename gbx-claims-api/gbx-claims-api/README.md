# GlassBox Claims API

FastAPI-based P&C claims services deployed on AKS. Single container, multiple routers — one endpoint per agent integration point.

## Endpoints

| Method | Path | Service | Description |
|--------|------|---------|-------------|
| POST | `/api/v1/policy/lookup` | Policy | Retrieve full policy via `sp_GetPolicyDetails` |
| POST | `/api/v1/fnol/submit` | FNOL | Submit First Notice of Loss from voice agent |
| POST | `/api/v1/claims/create` | Claims | Generate Claim ID, persist record, sync to Dataverse |
| POST | `/api/v1/documents/upload` | Documents | Upload claim document to Azure Blob |
| POST | `/api/v1/validation/run` | Validation | Run NOAA / NICB / ISO checks |
| POST | `/api/v1/adjudication/decide` | Adjudication | Score claim → AUTO_APPROVED / ADJUSTER_REVIEW / ESCALATED |
| GET | `/health` | Health | Liveness probe (AKS) |
| GET | `/ready` | Health | Readiness probe — pings Azure SQL |
| GET | `/docs` | — | Swagger UI (auto-generated) |

All endpoints require `Authorization: Bearer <AAD_token>` header.

## Authentication

Azure AD Managed Identity. Each AI agent in the AKS workspace acquires a token for audience `api://gbx-claims-api` using its own assigned identity, and passes it as a Bearer token.

## Project Structure

```
gbx-claims-api/
├── app/
│   ├── main.py                  # FastAPI app, router registration, middleware
│   ├── core/
│   │   ├── config.py            # Pydantic settings (env vars)
│   │   ├── auth.py              # Azure AD token validation (FastAPI dependency)
│   │   ├── database.py          # Azure SQL connection pool (MSI + SQL auth)
│   │   └── dataverse.py         # Async Dataverse sync client
│   ├── routers/                 # One file per service — thin HTTP layer only
│   │   ├── policy.py
│   │   ├── fnol.py
│   │   ├── claims.py
│   │   ├── documents.py
│   │   ├── validation.py
│   │   └── adjudication.py
│   ├── models/
│   │   └── schemas.py           # All Pydantic request/response models
│   └── services/                # Business logic — called by routers
│       ├── policy_service.py    # Calls sp_GetPolicyDetails
│       ├── fnol_service.py
│       ├── claim_service.py
│       ├── document_service.py
│       ├── validation_service.py
│       └── adjudication_service.py
├── k8s/
│   ├── deployment.yaml          # Deployment + ConfigMap
│   └── manifests.yaml           # Service, Ingress, Secret, ServiceAccount, HPA, Namespace
├── Dockerfile                   # Multi-stage build (builder → runtime, non-root user)
├── requirements.txt
└── .env.template
```

## Stored Procedure Placeholder

The policy lookup service calls:
```sql
EXEC sp_GetPolicyDetails @policy_id = 'POL-2024-0001'
```

Expected to return **4 result sets** in order:
- **RS0** — Core policy row (`gbx.gbx_Policy`)
- **RS1** — Vehicles (`gbx.gbx_PolicyVehicle`)
- **RS2** — Drivers (`gbx.gbx_PolicyDriver`)
- **RS3** — Attributes (`gbx.gbx_PolicyAttribute` — category / code / value rows)

The placeholder is in `app/services/policy_service.py` inside `_call_sp()`. Replace the body with your actual SP once deployed.

## Local Development

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure environment
cp .env.template .env
# Edit .env with your local values (set DB_USE_MSI=false)

# 3. Run
uvicorn app.main:app --reload --port 8000

# 4. Open Swagger
open http://localhost:8000/docs
```

## AKS Deployment

```bash
# 1. Build and push image
docker build -t gbxacr.azurecr.io/gbx-claims-api:1.0.0 .
docker push gbxacr.azurecr.io/gbx-claims-api:1.0.0

# 2. Create namespace
kubectl apply -f k8s/manifests.yaml

# 3. Deploy
kubectl apply -f k8s/deployment.yaml

# 4. Verify
kubectl get pods -n gbx-claims
kubectl logs -n gbx-claims -l app=gbx-claims-api
```

## Agent Integration (Internal AKS)

Other agents in the same AKS cluster call this service via cluster DNS:

```
http://gbx-claims-api-svc.gbx-claims.svc.cluster.local/api/v1/policy/lookup
```

No external network hop — stays within the cluster.
