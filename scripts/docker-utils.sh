#!/bin/bash

# Docker Utilities for Fear & Greed Index
# Simplified Docker management script
# Usage: ./docker-utils.sh <command> [options]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENVIRONMENT=${ENVIRONMENT:-development}

# Helper functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Show usage
show_usage() {
    echo "Docker Utilities for Fear & Greed Index"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  up [env]        - Start services (env: development|staging|production)"
    echo "  down            - Stop all services"
    echo "  restart [env]   - Restart services"
    echo "  logs [service]  - Show logs (optional service name)"
    echo "  status          - Show service status"
    echo "  health          - Check service health"
    echo "  clean           - Clean up containers, images, and volumes"
    echo "  backup          - Create database backup"
    echo "  restore <file>  - Restore database from backup"
    echo "  shell <service> - Open shell in service container"
    echo "  migrate         - Run database migrations"
    echo ""
    echo "Environment: $ENVIRONMENT (set ENVIRONMENT variable to change)"
    echo ""
    echo "Examples:"
    echo "  $0 up production"
    echo "  $0 logs backend"
    echo "  $0 shell backend"
    echo "  $0 backup"
}

# Start services
cmd_up() {
    local env=${1:-$ENVIRONMENT}
    log "Starting services for environment: $env"
    
    if [ "$env" = "development" ]; then
        docker-compose -f "$COMPOSE_FILE" up -d
    else
        docker-compose -f "$COMPOSE_FILE" --profile "$env" up -d
    fi
    
    log "Services started. Use '$0 status' to check status."
}

# Stop services
cmd_down() {
    log "Stopping all services..."
    docker-compose -f "$COMPOSE_FILE" down
    log "All services stopped."
}

# Restart services
cmd_restart() {
    local env=${1:-$ENVIRONMENT}
    log "Restarting services for environment: $env"
    cmd_down
    sleep 2
    cmd_up "$env"
}

# Show logs
cmd_logs() {
    local service=${1:-}
    if [ -n "$service" ]; then
        log "Showing logs for service: $service"
        docker-compose -f "$COMPOSE_FILE" logs -f "$service"
    else
        log "Showing logs for all services"
        docker-compose -f "$COMPOSE_FILE" logs -f
    fi
}

# Show status
cmd_status() {
    log "Service status:"
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    info "Container health:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Health check
cmd_health() {
    log "Checking service health..."
    
    local healthy=0
    local total=0
    
    # Check web endpoints
    if curl -f -s --max-time 5 "http://localhost/health" >/dev/null 2>&1; then
        echo "✅ Frontend health check passed"
        ((healthy++))
    else
        echo "❌ Frontend health check failed"
    fi
    ((total++))
    
    if curl -f -s --max-time 5 "http://localhost:3000/health" >/dev/null 2>&1; then
        echo "✅ Backend health check passed"
        ((healthy++))
    else
        echo "❌ Backend health check failed"
    fi
    ((total++))
    
    # Check database
    if docker exec fg-database pg_isready >/dev/null 2>&1; then
        echo "✅ Database health check passed"
        ((healthy++))
    else
        echo "❌ Database health check failed"
    fi
    ((total++))
    
    # Check Redis
    if docker exec fg-redis redis-cli ping >/dev/null 2>&1; then
        echo "✅ Redis health check passed"
        ((healthy++))
    else
        echo "❌ Redis health check failed"
    fi
    ((total++))
    
    echo ""
    if [ $healthy -eq $total ]; then
        log "✅ All health checks passed ($healthy/$total)"
        return 0
    else
        error "❌ Some health checks failed ($healthy/$total)"
        return 1
    fi
}

# Clean up resources
cmd_clean() {
    log "Cleaning up Docker resources..."
    
    # Stop all services first
    docker-compose -f "$COMPOSE_FILE" down
    
    # Remove stopped containers
    docker container prune -f
    
    # Remove unused images (keep latest 3 versions)
    docker images | grep -E "(fg-|kospi-)" | tail -n +4 | awk '{print $3}' | head -n -3 | xargs -r docker rmi 2>/dev/null || true
    
    # Remove unused volumes (be careful!)
    read -p "Remove unused volumes? This will delete data! (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker volume prune -f
    fi
    
    # Remove unused networks
    docker network prune -f
    
    log "Cleanup completed"
}

# Create database backup
cmd_backup() {
    local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
    log "Creating database backup: $backup_file"
    
    if ! docker exec fg-database pg_dump -U "${DATABASE_USER:-fg_user}" -d "${DATABASE_NAME:-fg_index_dev}" > "$backup_file"; then
        error "Backup failed"
        return 1
    fi
    
    gzip "$backup_file"
    log "Backup created: ${backup_file}.gz"
}

# Restore database
cmd_restore() {
    local backup_file="$1"
    if [ -z "$backup_file" ]; then
        error "Please specify backup file to restore"
        return 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        return 1
    fi
    
    warn "This will replace the current database!"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Restore cancelled"
        return 0
    fi
    
    log "Restoring database from: $backup_file"
    
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" | docker exec -i fg-database psql -U "${DATABASE_USER:-fg_user}" -d "${DATABASE_NAME:-fg_index_dev}"
    else
        docker exec -i fg-database psql -U "${DATABASE_USER:-fg_user}" -d "${DATABASE_NAME:-fg_index_dev}" < "$backup_file"
    fi
    
    log "Database restored successfully"
}

# Open shell in container
cmd_shell() {
    local service="$1"
    if [ -z "$service" ]; then
        error "Please specify service name (backend, frontend, database, redis)"
        return 1
    fi
    
    log "Opening shell in $service container..."
    docker exec -it "fg-$service" /bin/sh
}

# Run database migrations
cmd_migrate() {
    log "Running database migrations..."
    
    if ! docker exec fg-backend npm run db:migrate; then
        error "Migration failed"
        return 1
    fi
    
    docker exec fg-backend npm run db:generate
    log "Migrations completed successfully"
}

# Main command dispatcher
main() {
    if [ $# -eq 0 ]; then
        show_usage
        exit 1
    fi
    
    local command="$1"
    shift
    
    case "$command" in
        up)
            cmd_up "$@"
            ;;
        down)
            cmd_down
            ;;
        restart)
            cmd_restart "$@"
            ;;
        logs)
            cmd_logs "$@"
            ;;
        status)
            cmd_status
            ;;
        health)
            cmd_health
            ;;
        clean)
            cmd_clean
            ;;
        backup)
            cmd_backup
            ;;
        restore)
            cmd_restore "$@"
            ;;
        shell)
            cmd_shell "$@"
            ;;
        migrate)
            cmd_migrate
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"
