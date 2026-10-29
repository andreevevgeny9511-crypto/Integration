# Bitrix24 ↔ Listok Integration — Deployment Guide

## Quick Start

### Prerequisites
- Docker Desktop (or Docker Engine + Docker Compose)
- 4 GB RAM minimum
- Ports 80, 3000, 5432, 9090, 3001 available

### Deployment Steps

#### Option 1: Using the Deployment Script (Recommended)

```bash
# Linux/macOS
chmod +x deploy.sh
./deploy.sh setup

# Windows
deploy.bat setup
```

#### Option 2: Manual Deployment

```bash
# 1. Copy .env.example to .env and configure
cp .env.example .env
# Edit .env with your Bitrix24 and Listok credentials

# 2. Start the stack
docker-compose up -d

# 3. Verify
curl http://localhost/health
```

### Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost | React application |
| API | http://localhost/api | REST API |
| Health | http://localhost/health | Health check |
| Grafana | http://localhost:3001 | Monitoring dashboard |

## Configuration

Edit the `.env` file with your credentials before starting.

## Stopping the Application

```bash
./deploy.sh stop
# or
deploy.bat stop
```

## Viewing Logs

```bash
./deploy.sh logs
# or
deploy.bat logs
```
