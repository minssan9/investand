#!/bin/bash

# Fear & Greed Index - Project Manager
# Main entry point for project management tasks
# Usage: ./fg-manager.sh <command> [options]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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
    echo "Fear & Greed Index - Project Manager"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "🚀 Quick Start Commands:"
    echo "  setup           - Initial project setup (environment + dependencies)"
    echo "  start [env]     - Start the application (dev|staging|prod)"
    echo "  stop            - Stop all services"
    echo "  restart [env]   - Restart the application"
    echo "  status          - Show project status"
    echo ""
    echo "🔧 Development Commands:"
    echo "  dev             - Start development environment"
    echo "  build           - Build all services"
    echo "  test            - Run tests"
    echo "  logs [service]  - Show service logs"
    echo "  shell <service> - Open shell in service"
    echo ""
    echo "🛠 Maintenance Commands:"
    echo "  backup          - Create full backup (database + environment)"
    echo "  restore         - Restore from backup"
    echo "  clean           - Clean up Docker resources"
    echo "  health          - Check system health"
    echo "  update          - Update dependencies and rebuild"
    echo ""
    echo "🚀 Deployment Commands:"
    echo "  deploy [env]    - Deploy to environment"
    echo "  rollback        - Rollback to previous version"
    echo ""
    echo "📋 Environment Commands:"
    echo "  env:setup       - Setup environment files"
    echo "  env:validate    - Validate environment"
    echo "  env:switch <env> - Switch environment"
    echo ""
    echo "Examples:"
    echo "  $0 setup"
    echo "  $0 start prod"
    echo "  $0 logs backend"
    echo "  $0 deploy staging"
}

# Change to project root
cd "$PROJECT_ROOT"

# Quick setup command
cmd_setup() {
    log "🚀 Setting up Fear & Greed Index project..."
    
    # Environment setup
    log "Setting up environment..."
    "$SCRIPT_DIR/env-utils.sh" setup
    
    # Install dependencies
    log "Installing backend dependencies..."
    cd backend && npm install && cd ..
    
    log "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
    
    # Setup Docker
    log "Building Docker images..."
    "$SCRIPT_DIR/docker-utils.sh" up development
    
    # Run migrations
    log "Running database migrations..."
    sleep 10  # Wait for database to be ready
    "$SCRIPT_DIR/docker-utils.sh" migrate
    
    log "✅ Project setup completed!"
    echo ""
    info "Next steps:"
    echo "  1. Update API keys in backend/.env (especially DART_API_KEY)"
    echo "  2. Run: $0 env:validate"
    echo "  3. Run: $0 start dev"
    echo "  4. Visit: http://localhost (frontend) and http://localhost:3000 (API)"
}

# Start application
cmd_start() {
    local env=${1:-development}
    log "🚀 Starting Fear & Greed Index ($env environment)..."
    "$SCRIPT_DIR/docker-utils.sh" up "$env"
    
    # Show status after starting
    sleep 5
    cmd_status
}

# Stop application
cmd_stop() {
    log "🛑 Stopping Fear & Greed Index..."
    "$SCRIPT_DIR/docker-utils.sh" down
}

# Restart application
cmd_restart() {
    local env=${1:-development}
    log "🔄 Restarting Fear & Greed Index ($env environment)..."
    "$SCRIPT_DIR/docker-utils.sh" restart "$env"
}

# Show status
cmd_status() {
    log "📊 Fear & Greed Index Status"
    echo ""
    
    # Environment info
    info "Environment: ${ENVIRONMENT:-development}"
    
    # Docker status
    "$SCRIPT_DIR/docker-utils.sh" status
    
    echo ""
    # Health check
    if "$SCRIPT_DIR/docker-utils.sh" health >/dev/null 2>&1; then
        log "✅ All services healthy"
    else
        warn "⚠️ Some services may have issues - run 'health' command for details"
    fi
}

# Development mode
cmd_dev() {
    log "🧑‍💻 Starting development environment..."
    
    # Start services
    "$SCRIPT_DIR/docker-utils.sh" up development
    
    # Show development info
    echo ""
    info "Development environment ready!"
    echo "  Frontend:  http://localhost"
    echo "  Backend:   http://localhost:3000"
    echo "  Database:  localhost:5432 (PostgreSQL) or localhost:3306 (MySQL)"
    echo "  Redis:     localhost:6379"
    echo ""
    echo "Useful commands:"
    echo "  $0 logs backend     - View backend logs"
    echo "  $0 shell backend    - Open backend shell"
    echo "  $0 test            - Run tests"
}

# Build services
cmd_build() {
    log "🔨 Building all services..."
    
    # Build backend
    log "Building backend..."
    cd backend
    npm run build
    cd ..
    
    # Build frontend
    log "Building frontend..."
    cd frontend
    npm run build
    cd ..
    
    # Build Docker images
    log "Building Docker images..."
    docker-compose build
    
    log "✅ Build completed"
}

# Run tests
cmd_test() {
    log "🧪 Running tests..."
    
    # Backend tests
    log "Running backend tests..."
    cd backend
    npm test
    cd ..
    
    # Frontend tests
    log "Running frontend tests..."
    cd frontend
    npm test
    cd ..
    
    log "✅ Tests completed"
}

# Backup system
cmd_backup() {
    log "💾 Creating full system backup..."
    
    # Environment backup
    "$SCRIPT_DIR/env-utils.sh" backup
    
    # Database backup
    "$SCRIPT_DIR/docker-utils.sh" backup
    
    log "✅ Full backup completed"
}

# Health check
cmd_health() {
    log "🏥 Performing comprehensive health check..."
    
    # Environment validation
    if "$SCRIPT_DIR/env-utils.sh" validate; then
        log "✅ Environment validation passed"
    else
        error "❌ Environment validation failed"
    fi
    
    # Service health check
    "$SCRIPT_DIR/docker-utils.sh" health
}

# Update system
cmd_update() {
    log "⬆️ Updating Fear & Greed Index..."
    
    # Pull latest code
    if git status --porcelain | grep -q .; then
        warn "Uncommitted changes detected. Stashing them..."
        git stash
    fi
    
    git pull origin main
    
    # Update dependencies
    log "Updating backend dependencies..."
    cd backend && npm update && cd ..
    
    log "Updating frontend dependencies..."
    cd frontend && npm update && cd ..
    
    # Rebuild
    cmd_build
    
    # Restart services
    cmd_restart
    
    log "✅ Update completed"
}

# Deploy
cmd_deploy() {
    local env=${1:-production}
    log "🚀 Deploying to $env environment..."
    
    if [ "$env" = "production" ]; then
        warn "Deploying to PRODUCTION environment!"
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "Deployment cancelled"
            return 0
        fi
    fi
    
    # Use appropriate deployment script
    ENVIRONMENT="$env" "$SCRIPT_DIR/deploy.sh"
}

# Rollback
cmd_rollback() {
    warn "🔄 Rolling back to previous version..."
    read -p "Continue with rollback? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Rollback cancelled"
        return 0
    fi
    
    "$SCRIPT_DIR/deploy.sh" --rollback
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
        setup)
            cmd_setup
            ;;
        start)
            cmd_start "$@"
            ;;
        stop)
            cmd_stop
            ;;
        restart)
            cmd_restart "$@"
            ;;
        status)
            cmd_status
            ;;
        dev)
            cmd_dev
            ;;
        build)
            cmd_build
            ;;
        test)
            cmd_test
            ;;
        logs)
            "$SCRIPT_DIR/docker-utils.sh" logs "$@"
            ;;
        shell)
            "$SCRIPT_DIR/docker-utils.sh" shell "$@"
            ;;
        backup)
            cmd_backup
            ;;
        restore)
            "$SCRIPT_DIR/docker-utils.sh" restore "$@"
            ;;
        clean)
            "$SCRIPT_DIR/docker-utils.sh" clean
            ;;
        health)
            cmd_health
            ;;
        update)
            cmd_update
            ;;
        deploy)
            cmd_deploy "$@"
            ;;
        rollback)
            cmd_rollback
            ;;
        env:setup)
            "$SCRIPT_DIR/env-utils.sh" setup
            ;;
        env:validate)
            "$SCRIPT_DIR/env-utils.sh" validate
            ;;
        env:switch)
            "$SCRIPT_DIR/env-utils.sh" switch "$@"
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
