#!/bin/bash

# Unified Deployment Script for Fear & Greed Index
# Supports multiple environments via docker-compose profiles
# Usage: ./deploy.sh [--rollback] [--skip-backup]
# Environment: Set ENVIRONMENT=production|staging|development (default: production)

set -euo pipefail

# Configuration
APP_DIR="/home/min/fg-index"
LOG_FILE="$APP_DIR/logs/deploy.log"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"
BACKUP_DIR="$APP_DIR/backups"
ENVIRONMENT=${ENVIRONMENT:-production}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Flags
ROLLBACK=false
SKIP_BACKUP=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--rollback] [--skip-backup]"
            exit 1
            ;;
    esac
done

# Logging functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE" >&2
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}" | tee -a "$LOG_FILE"
}

# Check if running as correct user
check_user() {
    if [[ $(whoami) != "fg-app" && $EUID -ne 0 ]]; then
        error "This script should be run as fg-app user or root"
        exit 1
    fi
}

# Change to app directory
cd_to_app_dir() {
    if [ ! -d "$APP_DIR" ]; then
        error "Application directory $APP_DIR does not exist"
        exit 1
    fi
    cd "$APP_DIR"
}

# Create deployment lock
create_lock() {
    local lock_file="$APP_DIR/.deploy.lock"
    if [ -f "$lock_file" ]; then
        local pid=$(cat "$lock_file")
        if kill -0 "$pid" 2>/dev/null; then
            error "Another deployment is already running (PID: $pid)"
            exit 1
        else
            warn "Removing stale lock file"
            rm -f "$lock_file"
        fi
    fi
    echo $$ > "$lock_file"
    trap "rm -f '$lock_file'" EXIT
}

# Backup current state
backup_state() {
    if [ "$SKIP_BACKUP" = true ]; then
        warn "Skipping backup as requested"
        return
    fi
    
    log "Creating backup before deployment..."
    local backup_name="pre_deploy_$(date +%Y%m%d_%H%M%S)"
    
    # Backup database
    if docker ps --format '{{.Names}}' | grep -q "fg-database"; then
        docker exec fg-database pg_dump -U "${DATABASE_USER:-fg_user}" -d "${DATABASE_NAME:-fg_index_prod}" > "$BACKUP_DIR/${backup_name}.sql"
        gzip "$BACKUP_DIR/${backup_name}.sql"
        log "Database backup created: ${backup_name}.sql.gz"
    else
        warn "Database container not running, skipping database backup"
    fi
    
    # Backup current docker-compose state
    docker-compose -f "$COMPOSE_FILE" config > "$BACKUP_DIR/${backup_name}_compose.yml"
    
    # Save current image IDs for rollback
    docker images --format "{{.Repository}}:{{.Tag}} {{.ID}}" | grep -E "(frontend|backend)" > "$BACKUP_DIR/${backup_name}_images.txt"
}

# Pull latest code
update_code() {
    if [ "$ROLLBACK" = true ]; then
        log "Rollback mode - skipping code update"
        return
    fi
    
    log "Pulling latest code from repository..."
    git fetch origin
    local current_commit=$(git rev-parse HEAD)
    echo "$current_commit" > "$BACKUP_DIR/last_commit.txt"
    
    git reset --hard origin/main
    local new_commit=$(git rev-parse HEAD)
    
    if [ "$current_commit" != "$new_commit" ]; then
        log "Code updated from $current_commit to $new_commit"
    else
        info "Code is already up to date"
    fi
}

# Pull Docker images
pull_images() {
    if [ "$ROLLBACK" = true ]; then
        log "Rollback mode - restoring previous images"
        local backup_file=$(ls -t "$BACKUP_DIR"/*_images.txt | head -n1)
        if [ -f "$backup_file" ]; then
            while IFS= read -r line; do
                local image_tag=$(echo "$line" | cut -d' ' -f1)
                log "Using previous image: $image_tag"
            done < "$backup_file"
        else
            warn "No previous image backup found for rollback"
        fi
        return
    fi
    
    log "Pulling latest Docker images..."
    
    # Login to GitHub Container Registry if credentials are available
    if [ -n "${GITHUB_TOKEN:-}" ]; then
        echo "$GITHUB_TOKEN" | docker login ghcr.io -u "${GITHUB_ACTOR:-}" --password-stdin
    fi
    
    # Pull images with timeout using profiles
    timeout 300 docker-compose -f "$COMPOSE_FILE" --profile "$ENVIRONMENT" pull || {
        error "Failed to pull Docker images within timeout"
        return 1
    }
    
    log "Docker images updated successfully"
}

# Health check function
health_check() {
    local max_attempts=5
    local wait_time=10
    local attempt=1
    
    log "Performing health checks..."
    
    while [ $attempt -le $max_attempts ]; do
        # Check main health endpoint
        if curl -f -s --max-time 10 "http://localhost/health" >/dev/null && \
           curl -f -s --max-time 10 "http://localhost/api/health" >/dev/null; then
            log "✅ Health checks passed"
            return 0
        fi
        
        warn "Health check attempt $attempt/$max_attempts failed, waiting ${wait_time}s..."
        sleep $wait_time
        attempt=$((attempt + 1))
    done
    
    error "❌ Health checks failed after $max_attempts attempts"
    return 1
}

# Simple deployment
deploy_services() {
    log "Starting deployment..."
    
    # Deploy services with environment profile
    docker-compose -f "$COMPOSE_FILE" --profile "$ENVIRONMENT" up -d --remove-orphans
    
    # Wait for services to stabilize
    log "Waiting for services to stabilize..."
    sleep 30
}

# Run database migrations
run_migrations() {
    if [ "$ROLLBACK" = true ]; then
        warn "Rollback mode - skipping migrations"
        return
    fi
    
    log "Running database migrations..."
    
    # Check if backend container is running
    if docker ps --format '{{.Names}}' | grep -q "fg-backend"; then
        # Run Prisma migrations
        docker exec fg-backend npm run db:migrate || {
            warn "Database migrations failed, but continuing deployment"
        }
        
        # Generate Prisma client
        docker exec fg-backend npm run db:generate || {
            warn "Prisma client generation failed"
        }
    else
        warn "Backend container not found, skipping migrations"
    fi
}

# Cleanup old resources
cleanup() {
    log "Cleaning up old resources..."
    
    # Remove unused containers
    docker container prune -f >/dev/null 2>&1 || true
    
    # Remove unused images (keep last 3 versions)
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}" | \
        grep -E "(backend|frontend)" | \
        tail -n +4 | \
        awk '{print $1":"$2}' | \
        head -n -3 | \
        xargs -r docker rmi 2>/dev/null || true
    
    # Remove unused volumes (be careful with this)
    docker volume ls -q -f dangling=true | xargs -r docker volume rm 2>/dev/null || true
    
    # Remove old log files (keep last 30 days)
    find "$APP_DIR/logs" -name "*.log*" -mtime +30 -delete 2>/dev/null || true
    
    # Remove old backups (keep last 7 days)
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "pre_deploy_*" -mtime +7 -delete 2>/dev/null || true
}

# Rollback function
rollback() {
    error "Deployment failed, initiating rollback..."
    
    # Get last successful commit
    local last_commit_file="$BACKUP_DIR/last_commit.txt"
    if [ -f "$last_commit_file" ]; then
        local last_commit=$(cat "$last_commit_file")
        log "Rolling back code to commit: $last_commit"
        git reset --hard "$last_commit"
    fi
    
    # Restore database if backup exists
    local latest_backup=$(ls -t "$BACKUP_DIR"/pre_deploy_*.sql.gz 2>/dev/null | head -n1)
    if [ -n "$latest_backup" ]; then
        warn "Restoring database from backup: $(basename "$latest_backup")"
        gunzip -c "$latest_backup" | docker exec -i fg-database psql -U "${DATABASE_USER:-fg_user}" -d "${DATABASE_NAME:-fg_index_prod}"
    fi
    
    # Restart services with previous configuration
    docker-compose -f "$COMPOSE_FILE" --profile "$ENVIRONMENT" down
    sleep 5
    docker-compose -f "$COMPOSE_FILE" --profile "$ENVIRONMENT" up -d
    
    error "Rollback completed"
    exit 1
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$status: $message - $DOMAIN\"}" \
            "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || true
    fi
    
    # Log the notification
    log "Notification sent: $status - $message"
}

# Main deployment function
main() {
    log "Starting Fear & Greed Index deployment..."
    log "Rollback mode: $ROLLBACK"
    log "Skip backup: $SKIP_BACKUP"
    
    check_user
    cd_to_app_dir
    create_lock
    
    # Pre-deployment steps
    backup_state
    update_code
    pull_images
    
    # Deployment
    deploy_services
    run_migrations
    
    # Post-deployment validation
    if ! health_check; then
        rollback
    fi
    
    # Cleanup
    cleanup
    
    # Success notification
    local commit=$(git rev-parse --short HEAD)
    log "✅ Deployment completed successfully!"
    log "Deployed commit: $commit"
    
    send_notification "✅ SUCCESS" "Deployment completed for commit $commit"
    
    # Show service status
    info "Service status:"
    docker-compose -f "$COMPOSE_FILE" --profile "$ENVIRONMENT" ps
}

# Trap errors and rollback
trap 'rollback' ERR

# Execute main function
main "$@"