#!/bin/bash

# Environment Utilities for Fear & Greed Index
# Simplified environment and configuration management
# Usage: ./env-utils.sh <command> [options]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
    echo "Environment Utilities for Fear & Greed Index"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  setup           - Setup environment files from templates"
    echo "  validate        - Validate environment configuration"
    echo "  switch <env>    - Switch to different environment (dev|staging|prod)"
    echo "  check           - Check current environment status"
    echo "  secrets         - Generate secure secrets"
    echo "  backup          - Backup current environment files"
    echo "  restore         - Restore environment files from backup"
    echo ""
    echo "Examples:"
    echo "  $0 setup"
    echo "  $0 validate"
    echo "  $0 switch prod"
    echo "  $0 secrets"
}

# Setup environment files
cmd_setup() {
    log "Setting up environment files..."
    
    # Check if templates exist
    if [ ! -f "backend/env.template" ]; then
        error "Backend env.template not found!"
        return 1
    fi
    
    # Backup existing files
    if [ -f "backend/.env" ]; then
        cp "backend/.env" "backend/.env.backup.$(date +%Y%m%d_%H%M%S)"
        warn "Existing backend/.env backed up"
    fi
    
    # Copy templates
    cp backend/env.template backend/.env
    log "Created backend/.env from template"
    
    if [ -f "frontend/env.template" ]; then
        if [ -f "frontend/.env" ]; then
            cp "frontend/.env" "frontend/.env.backup.$(date +%Y%m%d_%H%M%S)"
            warn "Existing frontend/.env backed up"
        fi
        cp frontend/env.template frontend/.env
        log "Created frontend/.env from template"
    fi
    
    # Generate secrets
    cmd_secrets
    
    log "✅ Environment setup completed"
    warn "Don't forget to:"
    echo "  1. Update API keys in backend/.env"
    echo "  2. Configure database credentials"
    echo "  3. Run 'validate' command to check setup"
}

# Generate secure secrets
cmd_secrets() {
    log "Generating secure secrets..."
    
    # Generate JWT secret (64 characters)
    local jwt_secret
    if command -v openssl >/dev/null 2>&1; then
        jwt_secret=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    else
        jwt_secret=$(head -c 64 /dev/urandom | base64 | tr -d "=+/" | cut -c1-64)
    fi
    
    # Generate admin password (16 characters)
    local admin_password
    if command -v openssl >/dev/null 2>&1; then
        admin_password=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-16)
    else
        admin_password=$(head -c 16 /dev/urandom | base64 | tr -d "=+/" | cut -c1-16)
    fi
    
    # Generate Redis password (16 characters)
    local redis_password
    if command -v openssl >/dev/null 2>&1; then
        redis_password=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-16)
    else
        redis_password=$(head -c 16 /dev/urandom | base64 | tr -d "=+/" | cut -c1-16)
    fi
    
    # Update backend .env file
    if [ -f "backend/.env" ]; then
        # Use temporary file for safe replacement
        local temp_file
        temp_file=$(mktemp)
        
        # Replace secrets in .env file
        sed "s/your_jwt_secret_minimum_32_characters_long/$jwt_secret/g" backend/.env | \
        sed "s/your_secure_admin_password/$admin_password/g" | \
        sed "s/your_redis_password/$redis_password/g" > "$temp_file"
        
        mv "$temp_file" backend/.env
        
        log "✅ Generated secure JWT_SECRET"
        log "✅ Generated secure ADMIN_PASSWORD: $admin_password"
        log "✅ Generated secure REDIS_PASSWORD: $redis_password"
    else
        error "backend/.env file not found. Run 'setup' first."
        return 1
    fi
}

# Validate environment
cmd_validate() {
    log "Validating environment configuration..."
    
    local errors=0
    
    # Check if files exist
    if [ ! -f "backend/.env" ]; then
        error "backend/.env file not found"
        ((errors++))
    fi
    
    # Validate using backend validator if available
    if [ -f "backend/config/env-validator.js" ]; then
        cd backend
        if node config/env-validator.js .env; then
            log "✅ Backend validation passed"
        else
            error "❌ Backend validation failed"
            ((errors++))
        fi
        cd ..
    else
        warn "Backend validator not found, skipping detailed validation"
    fi
    
    # Check key environment variables
    if [ -f "backend/.env" ]; then
        source backend/.env
        
        # Check JWT secret
        if [ -z "${JWT_SECRET:-}" ] || [ "$JWT_SECRET" = "your_jwt_secret_minimum_32_characters_long" ]; then
            error "JWT_SECRET not configured properly"
            ((errors++))
        fi
        
        # Check database URL
        if [ -z "${DATABASE_URL:-}" ]; then
            error "DATABASE_URL not configured"
            ((errors++))
        fi
        
        # Check DART API key
        if [ -z "${DART_API_KEY:-}" ] || [ "$DART_API_KEY" = "your_dart_api_key" ]; then
            warn "DART_API_KEY not configured (required for full functionality)"
        fi
    fi
    
    if [ $errors -eq 0 ]; then
        log "✅ Environment validation passed"
        return 0
    else
        error "❌ Environment validation failed with $errors errors"
        return 1
    fi
}

# Switch environment
cmd_switch() {
    local env="$1"
    if [ -z "$env" ]; then
        error "Please specify environment: dev, staging, or prod"
        return 1
    fi
    
    case "$env" in
        dev|development)
            env="development"
            ;;
        staging)
            env="staging"
            ;;
        prod|production)
            env="production"
            ;;
        *)
            error "Invalid environment: $env (use dev|staging|prod)"
            return 1
            ;;
    esac
    
    log "Switching to $env environment..."
    
    # Create environment-specific .env file name
    local env_file=".env"
    if [ "$env" != "development" ]; then
        env_file=".env.$env"
    fi
    
    # Check if environment file exists
    if [ ! -f "$env_file" ]; then
        warn "Environment file $env_file not found"
        if [ -f "backend/env.template" ]; then
            log "Creating $env_file from template..."
            cp backend/env.template "$env_file"
        else
            error "Cannot create environment file - template not found"
            return 1
        fi
    fi
    
    # Update environment variable
    export ENVIRONMENT="$env"
    export ENV_SUFFIX=$([ "$env" = "development" ] && echo "" || echo ".$env")
    
    log "✅ Switched to $env environment"
    info "Environment file: $env_file"
    info "To persist this change, add 'export ENVIRONMENT=$env' to your shell profile"
}

# Check current environment
cmd_check() {
    log "Checking current environment status..."
    
    local env=${ENVIRONMENT:-development}
    local env_suffix=${ENV_SUFFIX:-}
    
    echo "Current environment: $env"
    echo "Environment file: .env$env_suffix"
    echo ""
    
    # Check which services are running
    if command -v docker >/dev/null 2>&1; then
        info "Docker services:"
        docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(fg-|kospi-)" || echo "No services running"
    else
        warn "Docker not available"
    fi
    
    # Check environment files
    echo ""
    info "Environment files:"
    for file in .env .env.staging .env.production backend/.env frontend/.env; do
        if [ -f "$file" ]; then
            echo "  ✅ $file"
        else
            echo "  ❌ $file (missing)"
        fi
    done
}

# Backup environment files
cmd_backup() {
    local backup_dir="backups/env_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    log "Creating environment backup in $backup_dir..."
    
    # Backup all .env files
    for file in .env .env.staging .env.production backend/.env frontend/.env; do
        if [ -f "$file" ]; then
            cp "$file" "$backup_dir/"
            log "Backed up $file"
        fi
    done
    
    log "✅ Environment backup created: $backup_dir"
}

# Restore environment files
cmd_restore() {
    # Find latest backup
    local latest_backup
    latest_backup=$(find backups -name "env_*" -type d | sort -r | head -n1)
    
    if [ -z "$latest_backup" ]; then
        error "No environment backups found"
        return 1
    fi
    
    warn "This will restore environment files from: $latest_backup"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Restore cancelled"
        return 0
    fi
    
    log "Restoring environment files from $latest_backup..."
    
    # Restore files
    for file in "$latest_backup"/*; do
        if [ -f "$file" ]; then
            local basename_file
            basename_file=$(basename "$file")
            
            # Determine target location
            if [[ "$basename_file" == backend.env ]]; then
                cp "$file" "backend/.env"
            elif [[ "$basename_file" == frontend.env ]]; then
                cp "$file" "frontend/.env"
            else
                cp "$file" "./$(basename "$file")"
            fi
            log "Restored $basename_file"
        fi
    done
    
    log "✅ Environment files restored"
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
        validate)
            cmd_validate
            ;;
        switch)
            cmd_switch "$@"
            ;;
        check)
            cmd_check
            ;;
        secrets)
            cmd_secrets
            ;;
        backup)
            cmd_backup
            ;;
        restore)
            cmd_restore
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
