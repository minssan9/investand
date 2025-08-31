# Production Deployment Guide - Simplified CI/CD

Streamlined deployment guide for the Fear & Greed Index application using GitHub Actions and Docker.

## Overview

This simplified deployment setup provides:
- **Automated CI/CD** with GitHub Actions
- **Containerized deployment** with Docker Compose
- **Health checks** and basic monitoring
- **Automated backups** with simple retention
- **GitHub Container Registry** for image storage

## Architecture

```
Internet → VM/Server → nginx (reverse proxy) → Docker Containers
                       ├── Frontend (Vue.js)
                       ├── Backend (Node.js/Express)
                       ├── Database (PostgreSQL/MySQL)
                       └── Cache (Redis)
```

## Prerequisites

### 1. Server Setup
- **Instance Type**: 2 vCPUs, 4GB RAM minimum
- **OS**: Linux (Ubuntu/Rocky/CentOS)  
- **Disk**: 20GB minimum
- **Network**: Allow HTTP (80) and HTTPS (443) traffic
- **Docker**: Docker and Docker Compose installed

### 2. GitHub Repository Setup
- Fork or clone the repository
- Configure GitHub Actions secrets (see [Secrets Configuration](#secrets-configuration))

### 3. Domain Configuration (Optional)
- Point your domain to server's public IP
- Configure SSL if using custom domain

## Initial VM Setup

### 1. Run Setup Script

Connect to your VM and run the automated setup script:

```bash
# Download and run the setup script
sudo dnf update -y && sudo dnf install -y curl
curl -fsSL https://github.com/minssan9/kospi-fg-index/tree/main/scripts/setup-vm.sh -o setup-vm.sh
cd /home/min/fg-index/scripts
chmod +x setup-vm.sh
sudo ./setup-vm.sh
```

The setup script will:
- Install Docker, Docker Compose, nginx, certbot
- Configure firewall (firewalld) and fail2ban
- Set up application user and directories
- Configure automatic security updates (dnf-automatic)
- Set up SSL certificate for your domain
- Create monitoring and backup scripts

### 2. Manual Steps After Setup

1. **Add GitHub Deploy Key**:
   ```bash
   # The setup script will display the public key
   cat /home/min/.ssh/id_rsa.pub
   ```
   Add this key to your GitHub repository: Settings → Deploy keys → Add deploy key

2. **Clone Repository**:
   ```bash
   sudo -u min git clone git@github.com/minssan9/kospi-fg-index.git /home/min/fg-index
   cd /home/min/fg-index
   ```

3. **Configure Environment**:
   ```bash
   sudo -u min cp .env.example .env
   sudo -u min vi .env
   ```
   Fill in your actual API keys and credentials and set NODE_ENV=production (see [Environment Configuration](#environment-configuration))

### 3. Initial Deployment

Run the first deployment manually to verify everything works:

```bash
cd /home/min/fg-index
sudo -u min ./scripts/deploy.sh
```

## Secrets Configuration

Configure the following secrets in your GitHub repository (Settings → Secrets and variables → Actions):

### Required Secrets (GitHub Actions)

```yaml
# Server Access
VM_HOST: "your-server-ip-or-domain"
VM_USER: "your-username"
VM_SSH_KEY: |
  -----BEGIN OPENSSH PRIVATE KEY-----
  [Your private key content]
  -----END OPENSSH PRIVATE KEY-----

# Application Environment
DATABASE_URL: "postgresql://user:password@database:5432/dbname"
DATABASE_NAME: "fg_index_prod"
DATABASE_USER: "fg_user"
DATABASE_PASSWORD: "secure_password"
KIS_API_KEY: "your_korea_investment_api_key"
KIS_API_SECRET: "your_korea_investment_api_secret"
BOK_API_KEY: "your_bank_of_korea_api_key"
DART_API_KEY: "your_dart_api_key"
REDIS_URL: "redis://:password@redis:6379/0"
REDIS_PASSWORD: "secure_redis_password"
JWT_SECRET: "your_jwt_secret_min_32_chars"
ADMIN_PASSWORD: "secure_admin_password"
CERTBOT_EMAIL: "your-email@domain.com"

# Optional
SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/..."
```

### Production Environment File (.env)

Create `.env` file on your server with NODE_ENV=production and the following configuration:

#### Required Variables
```env
# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://fg_user:secure_password@database:5432/fg_index_prod
DATABASE_NAME=fg_index_prod
DATABASE_USER=fg_user
DATABASE_PASSWORD=secure_database_password

# Database connections
DB_CONNECTION_POOL_MIN=2
DB_CONNECTION_POOL_MAX=10
DB_CONNECTION_TIMEOUT=30000
DB_QUERY_TIMEOUT=10000

# Redis
REDIS_URL=redis://:secure_redis_password@redis:6379/0
REDIS_PASSWORD=secure_redis_password

# API Keys
KIS_API_KEY=your_korea_investment_api_key
KIS_API_SECRET=your_korea_investment_api_secret
BOK_API_KEY=your_bank_of_korea_api_key
DART_API_KEY=your_dart_api_key

# Security
JWT_SECRET=your_jwt_secret_min_32_chars_long
ADMIN_PASSWORD=secure_admin_password

# Performance Tuning
CACHE_TTL=3600
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# SSL Configuration
CERTBOT_EMAIL=admin@investand.voyagerss.com
```

#### Optional Variables
```env
# Monitoring & Notifications
ALERT_EMAIL=alerts@investand.voyagerss.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# S3 Backup (Optional)
BACKUP_S3_BUCKET=fg-index-backups
BACKUP_S3_ACCESS_KEY=your_s3_access_key
BACKUP_S3_SECRET_KEY=your_s3_secret_key

# External Services
UPBIT_ACCESS_KEY=your_upbit_access_key
UPBIT_SECRET_KEY=your_upbit_secret_key
```

## Deployment Process

### Automated Deployment (Recommended)

1. **Push to main branch**:
   ```bash
   git add .
   git commit -m "feat: update feature"
   git push origin main
   ```

2. **GitHub Actions will automatically**:
   - Run tests and linting
   - Perform security scanning
   - Build Docker images
   - Deploy to production server
   - Run health checks

### Manual Deployment

For emergency deployments or troubleshooting:

```bash
cd /home/min/fg-index
./scripts/deploy.sh
```

#### Deployment Options
```bash
# Standard deployment
./scripts/deploy.sh

# Skip backup (faster)
./scripts/deploy.sh --skip-backup

# Rollback to previous version
./scripts/deploy.sh --rollback
```

## Monitoring and Maintenance

### Health Check Endpoints

- **Main Health**: `http://your-server/health`
- **API Health**: `http://your-server/api/health`

### Basic Monitoring

Use the basic monitoring script:

```bash
# Quick health check
./scripts/basic-monitor.sh --health-only

# Full system check
./scripts/basic-monitor.sh
```

### Log Management

Logs are automatically rotated and stored in `/home/min/fg-index/logs/`:

```bash
# View recent logs
tail -f /home/min/fg-index/logs/backend/app.log
tail -f /home/min/fg-index/logs/nginx/access.log
tail -f /home/min/fg-index/logs/deploy.log

# Check for errors
grep -i error /home/min/fg-index/logs/**/*.log
```

### Database Backup

Manual backup:

```bash
# Create backup
./scripts/backup.sh

# Restore from backup  
./scripts/backup.sh --restore
```

### SSL Certificate Management

Certificates are automatically renewed via cron. Manual renewal:

```bash
# Check certificate status
sudo certbot certificates

# Manual renewal
sudo certbot renew --nginx

# Force renewal (testing)
sudo certbot renew --force-renewal --nginx
```

## Troubleshooting

### Common Issues

#### 1. Deployment Fails
```bash
# Check deployment logs
tail -f /home/min/fg-index/logs/deploy.log

# Check container status
cd /home/min/fg-index
docker-compose --profile production ps

# Restart services
sudo -u min docker-compose --profile production restart
```

#### 2. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Check nginx configuration
sudo nginx -t

# Restart nginx container
docker restart fg-nginx
```

#### 3. Database Connection Issues
```bash
# Check database container
docker logs fg-database

# Test database connection (PostgreSQL)
docker exec fg-database pg_isready -U fg_user -d fg_index_prod

# Test database connection (MySQL)
docker exec fg-database mysqladmin ping -h localhost -u fg_user -p

# Access database console (PostgreSQL)
docker exec -it fg-database psql -U fg_user -d fg_index_prod

# Access database console (MySQL)
docker exec -it fg-database mysql -u fg_user -p fg_index_prod
```

#### 4. High Resource Usage
```bash
# Check resource usage
sudo -u min /home/min/fg-index/scripts/monitor.sh --check-all

# Check container stats
docker stats

# Clean up old containers and images
docker system prune -f
```

#### 5. SELinux Issues (Rocky Linux Specific)
```bash
# Check SELinux status
sestatus

# Check SELinux denials
sudo ausearch -m AVC -ts recent

# Temporarily set SELinux to permissive (for troubleshooting only)
sudo setenforce 0

# Re-enable SELinux
sudo setenforce 1

# Check if Docker has proper SELinux context
ls -Z /var/lib/docker

# Allow container access to specific directories (if needed)
sudo setsebool -P container_manage_cgroup on
```

### Recovery Procedures

#### 1. Complete System Recovery
```bash
# Stop all services
cd /home/min/fg-index
sudo -u min docker-compose --profile production down

# Restore from backup
sudo -u min ./scripts/backup.sh --restore

# Redeploy
sudo -u min ./scripts/deploy.sh
```

#### 2. Database Recovery
```bash
# Find latest backup
ls -la /home/min/fg-index/backups/backup_full_*.sql.gz

# Restore database (PostgreSQL)
gunzip -c /home/min/fg-index/backups/backup_full_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i fg-database psql -U fg_user -d fg_index_prod

# Restore database (MySQL)
gunzip -c /home/min/fg-index/backups/backup_full_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i fg-database mysql -u fg_user -p fg_index_prod
```

#### 3. Rollback Deployment
```bash
# Automatic rollback (if health checks fail)
sudo -u min ./scripts/deploy.sh --rollback

# Manual rollback to specific commit
cd /home/min/fg-index
git reset --hard COMMIT_HASH
sudo -u min ./scripts/deploy.sh
```

## Performance Optimization

### System-Level Optimization (Rocky Linux)
```bash
# Update system packages
sudo dnf update -y

# Install performance monitoring tools
sudo dnf install -y htop iotop nethogs

# Optimize kernel parameters for containers
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf
echo 'fs.file-max=65536' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Enable and configure firewalld zones
sudo firewall-cmd --permanent --zone=public --add-service=http
sudo firewall-cmd --permanent --zone=public --add-service=https
sudo firewall-cmd --reload
```

### Database Optimization
```sql
-- Run these queries to optimize database performance
ANALYZE;
VACUUM;
REINDEX;

-- Check slow queries
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

### Container Resource Limits
Adjust in `docker-compose.yml` under the deploy section:
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

### nginx Optimization
Key settings in `nginx.prod.conf`:
- Gzip compression enabled
- HTTP/2 support
- Connection keep-alive
- Rate limiting configured

## Security Checklist

- [ ] SSL/TLS certificate configured and auto-renewing
- [ ] Firewall (firewalld) enabled with minimal required ports
- [ ] fail2ban configured for SSH protection
- [ ] SELinux enabled and properly configured
- [ ] Docker containers run as non-root users
- [ ] Database credentials are secure and rotated
- [ ] Admin passwords are strong and unique
- [ ] API keys are properly secured in environment variables
- [ ] Security headers configured in nginx
- [ ] Regular security updates enabled (dnf-automatic)
- [ ] Backup encryption configured (if using S3)

## Support and Monitoring

### Alerts Configuration

The system sends alerts for:
- **Critical**: Service failures, high resource usage, SSL expiry
- **Warnings**: Performance degradation, configuration issues
- **Info**: Successful deployments, backup completion

### Contact Information

- **Primary**: Configure Slack webhook for real-time alerts
- **Secondary**: Email notifications for critical issues
- **Escalation**: Phone alerts for prolonged outages (external service)

### Maintenance Schedule

- **Daily**: Automated backups, log rotation
- **Weekly**: Security updates, performance review
- **Monthly**: Full system health check, disaster recovery test
- **Quarterly**: Security audit, dependency updates

## Additional Resources

- [SECURITY.md](./SECURITY.md) - Security hardening guide
- [MONITORING.md](./MONITORING.md) - Detailed monitoring setup
- [API Documentation](./API_ENDPOINTS.md) - API reference
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Common issues and solutions