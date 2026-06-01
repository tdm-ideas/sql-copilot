# SQL Copilot — Claude Code Guide

## What This Project Is
Internal tool that lets BI analysts connect to any SQL Server database, explore its schema, and generate T-SQL queries via a chat interface. No internet required in production — LLM runs via Ollama internally.

## Stack
- **Frontend**: Angular 19 (standalone components, signals)
- **Backend**: .NET 10 Minimal API
- **LLM**: Ollama (defog/sqlcoder-7b-2)
- **DB Driver**: Dapper + Microsoft.Data.SqlClient
- **Container Runtime**: Docker / OpenShift (non-root)

## Project Structure
```
sql-copilot/
├── backend/SqlCopilot.API/     # .NET 10 Web API
├── frontend/                   # Angular 19 app
├── openshift/                  # OpenShift manifests
├── docker-compose.yml          # Local dev (all services)
└── CLAUDE.md
```

## Key Rules
1. **READ ONLY**: All DB connections must use a read-only SQL user. Never allow DDL/DML.
2. **No secrets in code**: Use environment variables. See `.env.example`.
3. **Non-root containers**: All Dockerfiles must run as non-root (UID 1001). OpenShift requires this.
4. **Ports**: Frontend nginx runs on 8080 (not 80). Backend runs on 8080. Ollama on 11434.
5. **CORS**: Backend allows only frontend origin. Configured via `ALLOWED_ORIGINS` env var.

## Running Locally
```bash
# Copy env file
cp .env.example .env

# Start all services (backend + frontend + ollama)
docker-compose up --build

# Frontend: http://localhost:4200
# Backend:  http://localhost:5050
# Ollama:   http://localhost:11434
```

## First-Time Ollama Model Pull
```bash
docker exec -it sql-copilot-ollama ollama pull qwen2.5-coder:7b
```

## Building for OpenShift
```bash
# Build and push images
docker build -t your-registry/sql-copilot-backend:latest ./backend
docker build -t your-registry/sql-copilot-frontend:latest ./frontend
docker push your-registry/sql-copilot-backend:latest
docker push your-registry/sql-copilot-frontend:latest

# Deploy to OpenShift
oc apply -k openshift/
```

## Backend API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/connection/test | Test a DB connection |
| POST | /api/schema | Get schema for a connection |
| POST | /api/query/generate | Generate SQL from natural language |
| GET  | /health | Health check |

## Adding New Features
- New API endpoint → add controller in `backend/SqlCopilot.API/Controllers/`
- New Angular page → `ng generate component components/my-component --standalone`
- New OpenShift resource → add yaml to `openshift/` and reference in `kustomization.yaml`

## Security Notes
- Credentials are never stored server-side. Passed per-request in the request body.
- All generated SQL is returned to the user for review. Never auto-executed.
- Query runner (if added) must enforce read-only by connecting as a read-only SQL user.
