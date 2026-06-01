# SQL Copilot — Claude Code Guide

## What This Project Is
Internal tool that lets BI analysts connect to any SQL Server database, explore its schema, and generate T-SQL queries via a chat interface. No internet required in production — LLM runs via Ollama internally.

## Stack
- **Frontend**: Angular 19 (standalone components, signals)
- **Backend**: .NET 10 Minimal API
- **LLM**: Ollama (`qwen2.5-coder:7b` by default, configurable via `OLLAMA_MODEL`)
- **DB Driver**: Dapper + Microsoft.Data.SqlClient
- **Container Runtime**: Docker / OpenShift (non-root)

## Project Structure
```
sql-copilot/
├── backend/SqlCopilot.API/     # .NET 10 Web API
├── frontend/                   # Angular 19 app
├── openshift/                  # OpenShift manifests
├── docker-compose.yml          # Local dev (all services)
├── .env.example                # Copy to .env before first run
└── CLAUDE.md
```

## Key Rules
1. **READ ONLY**: All DB connections must use a read-only SQL user. Never allow DDL/DML.
2. **No secrets in code**: Use environment variables. See `.env.example`.
3. **Non-root containers**: All Dockerfiles must run as non-root (UID 1001). OpenShift requires this.
4. **Ports**: Backend host port is **5050** (not 5000 — macOS reserves 5000 for AirPlay). Frontend on 4200. Ollama on 11434. Inside containers everything runs on 8080.
5. **CORS**: Backend allows only frontend origin. Configured via `ALLOWED_ORIGINS` env var.

## Running Locally (First Time)

### Prerequisites
- Docker Desktop running (Mac or Windows)
- Git

### Steps

```bash
# 1. Clone and enter the repo
git clone https://github.com/tdm-ideas/sql-copilot.git
cd sql-copilot

# 2. Create your env file
cp .env.example .env

# 3. Build and start all services
docker-compose up --build

# 4. Pull the AI model (one-time, ~4.7 GB — run in a separate terminal while step 3 is running)
docker exec sql-copilot-ollama ollama pull qwen2.5-coder:7b
```

Services will be available at:
| Service  | URL                       |
|----------|---------------------------|
| Frontend | http://localhost:4200     |
| Backend  | http://localhost:5050     |
| Ollama   | http://localhost:11434    |

### Subsequent Runs
```bash
docker-compose up
```

The model is stored in the `ollama-models` Docker volume — no need to re-pull after the first time.

## Connecting to SQL Server

### From inside Docker (recommended setup)
When the app runs in Docker, `localhost` refers to the container — **not your machine**. Use `host.docker.internal` to reach services on your host:

| Field    | Value                    |
|----------|--------------------------|
| Host     | `host.docker.internal`   |
| Port     | `1433`                   |
| Database | your database name       |
| Username | your SQL login           |
| Password | your SQL password        |

`host.docker.internal` works on both Docker Desktop for Mac and Windows.

### From a remote SQL Server
Use the server's IP address or hostname directly.

## Changing the AI Model
The model is set via `OLLAMA_MODEL` in your `.env` file. You can use any model from the [Ollama library](https://ollama.com/library):

```bash
# In .env
OLLAMA_MODEL=qwen2.5-coder:7b   # default — good SQL generation
# OLLAMA_MODEL=codellama:7b     # alternative
```

After changing the model, pull it and restart the backend:
```bash
docker exec sql-copilot-ollama ollama pull <model-name>
docker-compose restart backend
```

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `address already in use` on port 5000 | macOS AirPlay uses 5000 | Already fixed — app uses 5050 |
| `Cannot reach the server` | Docker not running or containers stopped | `docker-compose up` |
| `pull model manifest: file does not exist` | Model name wrong or removed from registry | Check model name at ollama.com/library |
| `The AI model is not available` | Model not pulled yet | `docker exec sql-copilot-ollama ollama pull qwen2.5-coder:7b` |
| SQL Server connection fails | Using `localhost` as host inside Docker | Use `host.docker.internal` instead |

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
