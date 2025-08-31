#!/bin/bash

# Basic monitoring script for Fear & Greed Index
# Simple health checks without complex monitoring
# Usage: ./basic-monitor.sh [--health-only]

set -euo pipefail

# Configuration
APP_DIR="/home/min/fg-index"
LOG_FILE="$APP_DIR/logs/monitor.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Flags
HEALTH_ONLY=false

# Parse command line arguments
if [[ $# -gt 0 && $1 == "--health-only" ]]; then
    HEALTH_ONLY=true
fi

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

# Check Docker containers
check_containers() {
    log "Checking Docker containers..."
    
    if ! systemctl is-active --quiet docker; then
        error "Docker service is not running"
        return 1
    fi
    
    local expected_containers=("fg-nginx" "fg-frontend" "fg-backend" "fg-database" "fg-redis")
    local failed_containers=()
    
    for container in "${expected_containers[@]}"; do
        if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            failed_containers+=("$container")
        fi
    done
    
    if [ ${#failed_containers[@]} -gt 0 ]; then
        error "${#failed_containers[@]} containers are down: ${failed_containers[*]}"
        return 1
    else
        log "All expected containers are running"
    fi
}

# Check application health
check_health() {
    log "Checking application health..."
    
    # Check main health endpoint
    if ! curl -f -s --max-time 10 "http://localhost/health" >/dev/null; then
        error "Main health endpoint failed"
        return 1
    fi
    
    # Check API health endpoint
    if ! curl -f -s --max-time 10 "http://localhost/api/health" >/dev/null; then
        error "API health endpoint failed"
        return 1
    fi
    
    log "Health endpoints are OK"
}

# Check basic system resources
check_system() {
    if [ "$HEALTH_ONLY" = true ]; then
        return 0
    fi
    
    log "Checking system resources..."
    
    # Check disk usage
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        error "Disk usage critical: ${disk_usage}%"
    elif [ "$disk_usage" -gt 80 ]; then
        warn "Disk usage high: ${disk_usage}%"
    else
        log "Disk usage: ${disk_usage}% - OK"
    fi
    
    # Check memory usage
    local memory_info=$(free | awk 'FNR==2{printf "%.0f", $3/$2*100}')
    if [ "$memory_info" -gt 95 ]; then
        error "Memory usage critical: ${memory_info}%"
    elif [ "$memory_info" -gt 85 ]; then
        warn "Memory usage high: ${memory_info}%"
    else
        log "Memory usage: ${memory_info}% - OK"
    fi
}

# Main monitoring function
main() {
    log "Starting basic monitoring checks..."
    
    local exit_code=0
    
    if ! check_containers; then
        exit_code=1
    fi
    
    if ! check_health; then
        exit_code=1
    fi
    
    if ! check_system; then
        exit_code=1
    fi
    
    if [ $exit_code -eq 0 ]; then
        log "✅ All checks passed - system is healthy"
    else
        error "❌ Some checks failed"
    fi
    
    exit $exit_code
}

# Execute main function
main "$@"