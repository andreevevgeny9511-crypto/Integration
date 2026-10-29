#!/bin/bash
# ============================================================
# Bitrix24 ↔ Listok Integration — Deployment Script
# ============================================================
# Usage: ./deploy.sh [start|stop|restart|status]
# ============================================================

set -e

APP_NAME="bitrix-listok-integration"
DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

check_env() {
    if [ ! -f "$DEPLOY_DIR/.env" ]; then
        log_warn ".env file not found. Copying from .env.example..."
        cp "$DEPLOY_DIR/.env.example" "$DEPLOY_DIR/.env"
        log_warn "Please edit .env file with your actual values before starting."
    fi
}

do_start() {
    log_info "Starting $APP_NAME..."
    check_docker
    check_env
    cd "$DEPLOY_DIR"
    docker-compose up -d
    log_info "Application started successfully!"
    log_info "Frontend: http://localhost"
    log_info "API: http://localhost/api"
    log_info "Health: http://localhost/health"
    log_info "Grafana: http://localhost:3001 (monitoring stack)"
}

do_stop() {
    log_info "Stopping $APP_NAME..."
    cd "$DEPLOY_DIR"
    docker-compose down
    log_info "Application stopped."
}

do_restart() {
    log_info "Restarting $APP_NAME..."
    cd "$DEPLOY_DIR"
    docker-compose down
    docker-compose up -d
    log_info "Application restarted successfully!"
}

do_status() {
    log_info "Checking $APP_NAME status..."
    cd "$DEPLOY_DIR"
    docker-compose ps
    echo ""
    log_info "Testing health endpoint..."
    curl -s http://localhost/health | head -c 200 || log_warn "Health check failed (is the app running?)"
    echo ""
}

do_logs() {
    log_info "Showing logs (tail -f, Ctrl+C to exit)..."
    cd "$DEPLOY_DIR"
    docker-compose logs -f
}

do_migrate() {
    log_info "Running database migrations..."
    cd "$DEPLOY_DIR"
    docker-compose exec -T db psql -U postgres -d bitrix_listok -f /docker-entrypoint-initdb.d/migrations/001_create_sync_schema.sql 2>/dev/null || \
    docker-compose exec app npm run migrate 2>/dev/null || \
    log_warn "Migration script not found or failed. Check your setup."
}

do_setup() {
    log_info "Setting up $APP_NAME..."
    check_docker
    check_env

    log_info "Building Docker images..."
    cd "$DEPLOY_DIR"
    docker-compose build

    log_info "Starting services..."
    docker-compose up -d

    log_info "Waiting for services to be ready..."
    sleep 10

    log_info "Running database migrations..."
    do_migrate

    log_info ""
    log_info "============================================"
    log_info "  Setup complete!"
    log_info "============================================"
    log_info "  Frontend:  http://localhost"
    log_info "  API:       http://localhost/api"
    log_info "  Health:    http://localhost/health"
    log_info "  Grafana:   http://localhost:3001"
    log_info "============================================"
    log_info ""
    log_info "Next steps:"
    log_info "  1. Edit .env file with your Bitrix24 and Listok credentials"
    log_info "  2. Restart the application: ./deploy.sh restart"
    log_info "  3. Open the frontend in your browser"
}

case "${1:-start}" in
    start)
        do_start
        ;;
    stop)
        do_stop
        ;;
    restart)
        do_restart
        ;;
    status)
        do_status
        ;;
    logs)
        do_logs
        ;;
    migrate)
        do_migrate
        ;;
    setup)
        do_setup
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|migrate|setup}"
        echo ""
        echo "Commands:"
        echo "  start    - Start the application"
        echo "  stop     - Stop the application"
        echo "  restart  - Restart the application"
        echo "  status   - Check application status"
        echo "  logs     - Show application logs"
        echo "  migrate  - Run database migrations"
        echo "  setup    - Full setup (build + start + migrate)"
        exit 1
        ;;
esac
