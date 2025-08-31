# Monitoring & Observability Guide

Comprehensive monitoring and observability setup for the Fear & Greed Index production deployment.

## Monitoring Architecture

```
Application Metrics → Logs → Alerts → Dashboards
       ↓               ↓        ↓         ↓
   Health Checks   Log Files  Slack    System Reports
   Performance     Rotation   Email    Status Pages
   Resource Usage  Analysis   SMS      Grafana/Custom
```

## Overview

The monitoring system provides:
- **Real-time health monitoring** of all services
- **Performance metrics** collection and analysis
- **Automated alerting** for critical issues
- **Log aggregation** and analysis
- **Resource utilization** tracking
- **SSL certificate monitoring**
- **Database performance monitoring**

## Health Check Endpoints

### Application Health Endpoints

#### Main Health Check
```bash
# Basic health check
curl https://investand.voyagerss.com/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

#### API Health Check
```bash
# API services health
curl https://investand.voyagerss.com/api/health

# Expected response:
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected",
    "external_apis": "operational"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Detailed System Health
```bash
# Admin-only detailed health (requires authentication)
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://investand.voyagerss.com/api/admin/health

# Expected response:
{
  "status": "healthy",
  "system": {
    "cpu_usage": "45%",
    "memory_usage": "65%",
    "disk_usage": "23%",
    "uptime": "15 days, 3 hours"
  },
  "services": {
    "database": {
      "status": "connected",
      "connections": 5,
      "response_time": "12ms"
    },
    "redis": {
      "status": "connected",
      "memory_usage": "45MB",
      "connected_clients": 3
    },
    "scheduler": {
      "status": "running",
      "last_collection": "2024-01-15T09:00:00Z",
      "success_rate": "98.5%"
    }
  }
}
```

### Container Health Checks

Health checks are configured in `docker-compose.prod.yml`:

```yaml
# Backend health check
healthcheck:
  test: ["CMD", "node", "healthcheck.js"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s

# Database health check
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U fg_user -d fg_index_prod"]
  interval: 30s
  timeout: 5s
  retries: 5
  start_period: 30s
```

## Monitoring Script

The `/opt/fg-index/scripts/monitor.sh` script provides comprehensive system monitoring:

### Basic Monitoring
```bash
# Run basic health checks
sudo -u fg-app /opt/fg-index/scripts/monitor.sh

# Run comprehensive checks
sudo -u fg-app /opt/fg-index/scripts/monitor.sh --check-all

# Enable alerting
sudo -u fg-app /opt/fg-index/scripts/monitor.sh --check-all --alert

# Generate system report
sudo -u fg-app /opt/fg-index/scripts/monitor.sh --report
```

### Automated Monitoring

The monitoring script runs automatically via cron:
```bash
# Check cron jobs
sudo -u fg-app crontab -l

# Monitoring runs every 5 minutes
*/5 * * * * /opt/fg-index/scripts/monitor.sh --check-all --alert
```

## Metrics Collection

### System Metrics

#### CPU and Memory
```bash
# CPU usage monitoring
top -bn1 | grep "Cpu(s)" | awk '{print $2}'

# Memory usage monitoring
free -h | awk 'FNR==2{printf "Used: %s/%s (%.0f%%)", $3,$2,$3*100/$2}'

# Load average
uptime | awk -F'load average:' '{print $2}'
```

#### Disk Usage
```bash
# Disk space monitoring
df -h / | awk 'NR==2{printf "%s/%s (%s)", $3,$2,$5}'

# Disk I/O
iostat -x 1 1 | grep -E "(Device|sda|nvme)"
```

### Application Metrics

#### Response Times
```bash
# API response time monitoring
curl -w "@curl-format.txt" -s -o /dev/null https://investand.voygerss.com/api/health

# curl-format.txt content:
time_namelookup:  %{time_namelookup}\n
time_connect:     %{time_connect}\n
time_pretransfer: %{time_pretransfer}\n
time_starttransfer: %{time_starttransfer}\n
time_total:       %{time_total}\n
```

#### Database Metrics
```bash
# Database connection count
docker exec fg-database-prod psql -U fg_user -d fg_index_prod -t -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'"

# Database size
docker exec fg-database-prod psql -U fg_user -d fg_index_prod -t -c \
  "SELECT pg_size_pretty(pg_database_size('fg_index_prod'))"

# Long-running queries
docker exec fg-database-prod psql -U fg_user -d fg_index_prod -c \
  "SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
   FROM pg_stat_activity 
   WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'"
```

### Container Metrics
```bash
# Container resource usage
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Container health status
docker ps --format "table {{.Names}}\t{{.Status}}"
```

## Log Management

### Log Structure

Logs are organized in `/opt/fg-index/logs/`:
```
logs/
├── backend/           # Backend application logs
│   ├── app.log       # General application logs
│   ├── error.log     # Error logs
│   └── access.log    # API access logs
├── frontend/          # Frontend nginx logs
│   ├── access.log    # Web access logs
│   └── error.log     # Web server errors
├── nginx/            # Main nginx proxy logs
│   ├── access.log    # Proxy access logs
│   └── error.log     # Proxy errors
├── postgres/         # Database logs
│   └── postgresql.log
├── redis/            # Cache logs
│   └── redis.log
├── scheduler/        # Data collection logs
│   └── scheduler.log
├── deploy.log        # Deployment logs
├── monitor.log       # Monitoring logs
├── backup.log        # Backup operation logs
└── alerts.log        # Security and system alerts
```

### Log Rotation

Automated log rotation configured in `/opt/fg-index/scripts/logrotate.conf`:
```bash
# Manual log rotation
sudo logrotate -f /opt/fg-index/scripts/logrotate.conf

# Check log rotation status
sudo logrotate -d /opt/fg-index/scripts/logrotate.conf
```

### Log Analysis

#### Error Analysis
```bash
# Find recent errors across all logs
grep -r -i "error\|exception\|fatal" /opt/fg-index/logs/ --include="*.log" | head -20

# Count errors by service
find /opt/fg-index/logs -name "*.log" -exec basename {} \; | sort | uniq -c

# Analyze error patterns
grep -r "error" /opt/fg-index/logs/ | awk '{print $3}' | sort | uniq -c | sort -nr
```

#### Performance Analysis
```bash
# API response time analysis (nginx access logs)
awk '{print $NF}' /opt/fg-index/logs/nginx/access.log | sort -n | tail -20

# Database query analysis
grep "duration:" /opt/fg-index/logs/backend/app.log | awk '{print $4}' | sort -n | tail -10
```

#### Security Analysis
```bash
# Failed authentication attempts
grep -i "auth.*fail\|unauthorized\|forbidden" /opt/fg-index/logs/**/*.log

# Suspicious IP addresses
awk '{print $1}' /opt/fg-index/logs/nginx/access.log | sort | uniq -c | sort -nr | head -20

# Rate limit violations
grep "limiting requests" /opt/fg-index/logs/nginx/error.log
```

## Alerting System

### Alert Configuration

Alerts are configured in the monitoring script with different severity levels:

#### Critical Alerts
- Service failures (containers down)
- Database connection failures
- SSL certificate expiry (< 7 days)
- Disk usage > 90%
- Memory usage > 95%
- High error rates (> 50 errors/hour)

#### Warning Alerts
- High resource usage (CPU > 80%, Memory > 85%, Disk > 80%)
- SSL certificate expiry (< 30 days)
- Long-running database queries
- API response time > 2 seconds
- Failed health checks

### Notification Channels

#### Slack Integration
```bash
# Configure Slack webhook in .env.production
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Test Slack notification
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test alert from FG Index monitoring"}' \
  $SLACK_WEBHOOK_URL
```

#### Email Alerts
```bash
# Configure email alerts
ALERT_EMAIL=alerts@investand.voyagerss.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@investand.voyagerss.com
SMTP_PASS=your_email_password

# Test email alert
echo "Test alert" | mail -s "Test Alert" $ALERT_EMAIL
```

### Alert Escalation

1. **Level 1**: Slack notification (immediate)
2. **Level 2**: Email alert (5 minutes if unacknowledged)
3. **Level 3**: SMS/Phone alert (15 minutes if unacknowledged)
4. **Level 4**: Manager escalation (30 minutes if unacknowledged)

## Performance Monitoring

### Key Performance Indicators (KPIs)

#### Application KPIs
- **Response Time**: API < 200ms, Web < 1s
- **Throughput**: Requests per second
- **Error Rate**: < 0.1% for critical endpoints
- **Uptime**: > 99.9% availability

#### Infrastructure KPIs
- **CPU Usage**: < 70% average
- **Memory Usage**: < 80% average
- **Disk Usage**: < 75% average
- **Network I/O**: Monitor for anomalies

#### Business KPIs
- **Data Collection Success Rate**: > 98%
- **Fear & Greed Index Calculation**: Daily updates
- **API Usage**: Track usage patterns
- **User Engagement**: Monitor frontend metrics

### Performance Dashboards

#### System Dashboard
Create a simple HTML dashboard at `/opt/fg-index/dashboard.html`:
```html
<!DOCTYPE html>
<html>
<head>
    <title>FG Index System Status</title>
    <meta http-equiv="refresh" content="30">
</head>
<body>
    <h1>Fear & Greed Index - System Status</h1>
    <div id="status">
        <!-- Populated by monitoring script -->
        <iframe src="/api/admin/health" width="100%" height="400"></iframe>
    </div>
    
    <h2>Recent Alerts</h2>
    <pre id="alerts">
        <!-- Load recent alerts from alerts.log -->
    </pre>
    
    <h2>System Metrics</h2>
    <div id="metrics">
        <!-- System resource usage charts -->
    </div>
</body>
</html>
```

### Custom Metrics

#### Application-Specific Metrics
```javascript
// In your Node.js application
const prometheus = require('prom-client');

// Custom metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

const dataCollectionSuccess = new prometheus.Counter({
  name: 'data_collection_success_total',
  help: 'Total successful data collections'
});

const fearGreedIndexValue = new prometheus.Gauge({
  name: 'fear_greed_index_value',
  help: 'Current Fear & Greed Index value'
});
```

## Database Monitoring

### PostgreSQL Monitoring

#### Connection Monitoring
```sql
-- Active connections
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';

-- Connection by database
SELECT datname, count(*) 
FROM pg_stat_activity 
GROUP BY datname;
```

#### Performance Monitoring
```sql
-- Slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Database size
SELECT pg_size_pretty(pg_database_size('fg_index_prod'));

-- Table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Lock Monitoring
```sql
-- Current locks
SELECT locktype, database, relation, page, tuple, 
       virtualxid, transactionid, mode, granted
FROM pg_locks;

-- Blocking queries
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity 
     ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
     ON blocking_locks.locktype = blocked_locks.locktype
     AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
JOIN pg_catalog.pg_stat_activity blocking_activity 
     ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### Redis Monitoring

#### Memory Usage
```bash
# Redis memory info
docker exec fg-redis-prod redis-cli info memory

# Key statistics
docker exec fg-redis-prod redis-cli info keyspace

# Client connections
docker exec fg-redis-prod redis-cli info clients
```

#### Performance Metrics
```bash
# Redis statistics
docker exec fg-redis-prod redis-cli info stats

# Slow log
docker exec fg-redis-prod redis-cli slowlog get 10
```

## SSL Certificate Monitoring

### Certificate Status
```bash
# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/investand.voyagerss.com/fullchain.pem \
  -text -noout | grep -A 2 "Validity"

# Check certificate via HTTPS
echo | openssl s_client -servername investand.voyagerss.com \
  -connect investand.voyagerss.com:443 2>/dev/null | \
  openssl x509 -noout -dates
```

### Automated Certificate Monitoring
The monitoring script checks certificate expiry and alerts:
- **30 days**: Warning alert
- **7 days**: Critical alert
- **1 day**: Emergency alert

## Troubleshooting Monitoring Issues

### Common Monitoring Problems

#### 1. High False Positive Alerts
```bash
# Adjust thresholds in monitor.sh
DISK_WARNING_THRESHOLD=85  # Increase from 80
MEMORY_WARNING_THRESHOLD=90  # Increase from 85

# Add alert dampening
ALERT_COOLDOWN=3600  # Don't repeat alerts for 1 hour
```

#### 2. Missing Alerts
```bash
# Check monitoring script execution
grep "Starting system monitoring" /opt/fg-index/logs/monitor.log

# Verify cron job
sudo -u fg-app crontab -l

# Test alert notifications
sudo -u fg-app /opt/fg-index/scripts/monitor.sh --alert --check-all
```

#### 3. Log Rotation Issues
```bash
# Check disk space
df -h /opt/fg-index/logs

# Force log rotation
sudo logrotate -f /opt/fg-index/scripts/logrotate.conf

# Check logrotate status
sudo logrotate -d /opt/fg-index/scripts/logrotate.conf
```

### Monitoring Script Debugging

Enable verbose logging:
```bash
# Add debug mode to monitor.sh
DEBUG=true /opt/fg-index/scripts/monitor.sh --check-all

# Check script execution
bash -x /opt/fg-index/scripts/monitor.sh --check-all
```

## Best Practices

### Monitoring Best Practices

1. **Monitor What Matters**: Focus on business-critical metrics
2. **Set Realistic Thresholds**: Avoid alert fatigue
3. **Document Runbooks**: Clear procedures for common issues
4. **Regular Review**: Monthly review of alerts and thresholds
5. **Test Alerting**: Regular testing of notification channels

### Performance Monitoring

1. **Baseline Metrics**: Establish normal performance patterns
2. **Trend Analysis**: Monitor long-term performance trends
3. **Capacity Planning**: Monitor growth and plan for scaling
4. **User Experience**: Monitor real user metrics, not just server metrics

### Log Management

1. **Structured Logging**: Use consistent log formats
2. **Log Levels**: Appropriate use of debug, info, warn, error
3. **Retention Policies**: Balance storage costs with analysis needs
4. **Security**: Never log sensitive information

## Integration with External Services

### Third-Party Monitoring Services

#### Uptime Monitoring
- **Pingdom**: External uptime monitoring
- **StatusCake**: Multi-location monitoring
- **UptimeRobot**: Free uptime monitoring

#### APM (Application Performance Monitoring)
- **New Relic**: Full-stack monitoring
- **DataDog**: Infrastructure and application monitoring
- **Grafana**: Open-source dashboard and alerting

#### Log Analysis
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Fluentd**: Log collection and forwarding
- **Splunk**: Enterprise log analysis

### API Monitoring

Monitor external API dependencies:
```bash
# Korea Investment & Securities API
curl -w "%{http_code}" -s -o /dev/null https://openapi.koreainvestment.com:9443/oauth2/tokenP

# Bank of Korea API
curl -w "%{http_code}" -s -o /dev/null https://ecos.bok.or.kr/api/

# DART API
curl -w "%{http_code}" -s -o /dev/null https://opendart.fss.or.kr/api/
```

## Monitoring Checklist

### Daily Monitoring Tasks
- [ ] Review overnight alerts
- [ ] Check system resource usage
- [ ] Verify backup completion
- [ ] Review application logs for errors
- [ ] Check SSL certificate status

### Weekly Monitoring Tasks
- [ ] Analyze performance trends
- [ ] Review and tune alert thresholds
- [ ] Update monitoring documentation
- [ ] Test alert notification channels
- [ ] Review database performance metrics

### Monthly Monitoring Tasks
- [ ] Comprehensive system health review
- [ ] Monitor capacity planning metrics
- [ ] Update monitoring procedures
- [ ] Review incident response times
- [ ] Audit monitoring access and permissions

## Contact Information

### Monitoring Support
- **Primary Contact**: monitoring@investand.voyagerss.com
- **Emergency**: +1-XXX-XXX-XXXX
- **Escalation**: Platform team lead

### Monitoring Resources
- **Dashboards**: https://investand.voyagerss.com/admin/monitoring
- **Logs**: SSH access to `/opt/fg-index/logs/`
- **Alerts**: Slack #alerts channel
- **Documentation**: This guide and runbooks