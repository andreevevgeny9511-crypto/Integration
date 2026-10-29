# Bitrix24 ↔ Listok Integration — Web Application Shell

## Overview

This is the complete web application for configurable API integration between Bitrix24 CRM and Listok fitness studio management system.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Application Shell                    │
├─────────────┬─────────────┬─────────────┬─────────────────┤
│  Frontend   │  Backend    │  Database   │  Infrastructure │
│  React TS   │  Express    │  PostgreSQL │  Docker + Nginx │
│  Vite       │  Node.js    │  + Migrations│  CI/CD          │
│  Tailwind   │  REST API   │             │  Monitoring      │
└─────────────┴─────────────┴─────────────┴─────────────────┘
```

## Deployment

### Quick Start

```bash
# 1. Clone and cd into the project
cd bitrix-listok-integration

# 2. Copy environment file
cp .env.example .env
# Edit .env with your actual values

# 3. Start the full stack
docker-compose up -d

# 4. Run database migrations
docker-compose exec app npm run migrate

# 5. Seed initial data (optional)
docker-compose exec app npm run seed

# 6. Access the application
# Frontend: http://localhost (Nginx proxy)
# API: http://localhost/api
# Health: http://localhost/health
# Metrics: http://localhost/metrics
# Grafana: http://localhost:3001 (monitoring stack)
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Application environment | `development` |
| `PORT` | API server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@db:5432/bitrix_listok` |
| `JWT_SECRET` | JWT signing secret | *(required)* |
| `BITRIX24_WEBHOOK_URL` | Default Bitrix24 webhook URL | *(optional)* |
| `LISTOK_API_KEY` | Default Listok API key | *(optional)* |
| `LISTOK_BASE_URL` | Listok API base URL | `https://api.listok.ru` |
| `SYNC_INTERVAL` | Sync interval in minutes | `60` |
| `LOG_LEVEL` | Logging level | `info` |
| `CORS_ORIGIN` | CORS origin for frontend | `*` |

### Docker Compose Services

| Service | Port | Description |
|---------|------|-------------|
| `app` | 3000 | Express API server |
| `db` | 5432 | PostgreSQL database |
| `nginx` | 80, 443 | Reverse proxy |
| `prometheus` | 9090 | Metrics collection |
| `grafana` | 3001 | Dashboard visualization |
| `node-exporter` | 9100 | Node metrics |
| `cAdvisor` | 8080 | Container metrics |

## API Endpoints

### Health & Metrics
- `GET /health` — Application health check
- `GET /metrics` — Prometheus metrics

### Bitrix24 Connections
- `GET /api/bitrix24/connections` — List connections
- `POST /api/bitrix24/connections` — Create connection
- `GET /api/bitrix24/connections/:id` — Get connection
- `PUT /api/bitrix24/connections/:id` — Update connection
- `DELETE /api/bitrix24/connections/:id` — Delete connection
- `POST /api/bitrix24/connections/:id/refresh-token` — Refresh OAuth token
- `GET /api/bitrix24/connections/:id/fields?entityType=...` — Get CRM fields
- `POST /api/bitrix24/test-connection` — Test connection

### Listok Connections
- `GET /api/listok/connections` — List connections
- `POST /api/listok/connections` — Create connection
- `GET /api/listok/connections/:id` — Get connection
- `PUT /api/listok/connections/:id` — Update connection
- `DELETE /api/listok/connections/:id` — Delete connection
- `GET /api/listok/connections/:id/fields?entityType=...` — Get fields
- `POST /api/listok/test-connection` — Test connection

### Field Mappings
- `GET /api/mappings` — List mappings
- `POST /api/mappings` — Create mapping
- `GET /api/mappings/:id` — Get mapping
- `PUT /api/mappings/:id` — Update mapping
- `DELETE /api/mappings/:id` — Delete mapping
- `GET /api/mappings/entity/:entityTypeId` — Get fields for entity
- `PUT /api/mappings/bulk` — Bulk update mappings

### Sync Rules
- `GET /api/sync-rules` — List rules
- `POST /api/sync-rules` — Create rule
- `GET /api/sync-rules/:id` — Get rule
- `PUT /api/sync-rules/:id` — Update rule
- `DELETE /api/sync-rules/:id` — Delete rule
- `PATCH /api/sync-rules/:id/toggle` — Toggle rule

### Sync Operations
- `POST /api/sync/start` — Start sync
- `POST /api/sync/stop` — Stop sync
- `GET /api/sync/status` — Get sync status
- `GET /api/sync/logs` — Get sync logs
- `GET /api/sync/stats` — Get sync statistics
- `POST /api/sync` — Trigger sync (legacy)
- `GET /api/sync` — List sync runs (legacy)
- `GET /api/sync/:id` — Get sync run (legacy)
- `GET /api/sync/:id/logs` — Get sync logs (legacy)

### Webhooks
- `POST /api/webhooks/listok` — Listok webhook
- `POST /api/webhooks/bitrix24` — Bitrix24 webhook

## Frontend

The React frontend is located at `D:\ChatGPT\integration-app` and includes:

- **Connection Wizard** — 4-step flow for setting up integrations
- **Field Mapping** — Visual field mapping between Bitrix24 and Listok
- **Sync Rules** — Condition builder with AND/OR logic and scheduling
- **Dashboard** — Real-time sync status, statistics, and logs

### Frontend Build

```bash
cd integration-app
npm install
npm run build
```

The built assets should be served by Nginx alongside the API.

## Monitoring

- **Prometheus** — Collects metrics from the API and infrastructure
- **Grafana** — Visualizes metrics with pre-built dashboards
- **Winston** — Application logging with daily rotation
- **Health Check** — `/health` endpoint for load balancer probing

## Security

- JWT authentication for API endpoints
- API key authentication as fallback
- HTTPS via Nginx (configure certificates)
- Rate limiting via Nginx
- Security headers (CSP, HSTS, X-Frame-Options)
- Non-root container user
- Database connection pooling with credentials

## CI/CD

The GitHub Actions pipeline (`.github/workflows/ci-cd.yml`) handles:
1. Linting (ESLint)
2. Testing (Jest)
3. Docker image build and push to GHCR
4. Deployment to staging (develop branch)
5. Deployment to production (main branch)
6. Slack notifications on failure

## License

MIT
