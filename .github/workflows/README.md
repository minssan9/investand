# GitHub Actions Workflows

Simplified CI/CD workflows for the KOSPI Fear & Greed Index project.

## Main Workflow

### Production Deployment (`deploy.yml`)
- **Trigger**: Push to `main` or `master` branch
- **Purpose**: Complete CI/CD pipeline for production deployment

**Pipeline Steps**:
1. **Test**: Run backend and frontend tests with linting
2. **Security**: Vulnerability scanning with Trivy
3. **Build**: Build and push Docker images to GitHub Container Registry
4. **Deploy**: Deploy to production server using SSH
5. **Notify**: Send deployment status to Slack (optional)

## Required GitHub Secrets

Configure these secrets in your GitHub repository (Settings → Secrets and variables → Actions):

```yaml
# Server Access
VM_HOST: "your-server-ip-or-domain"
VM_USER: "your-username"  
VM_SSH_KEY: |
  -----BEGIN OPENSSH PRIVATE KEY-----
  [Your private key content]
  -----END OPENSSH PRIVATE KEY-----

# Application Environment Variables
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

## How It Works

### Automated Deployment
1. Push code to `main` branch
2. GitHub Actions automatically:
   - Runs tests and linting
   - Scans for security vulnerabilities
   - Builds Docker images
   - Deploys to your server
   - Runs health checks
   - Sends notifications

### Security Features
- **Trivy scanning**: Detects vulnerabilities in code and dependencies
- **SARIF upload**: Results appear in GitHub Security tab
- **Container scanning**: Scans Docker images before deployment

### Deployment Features
- **Zero-downtime**: Uses Docker Compose for seamless updates
- **Health checks**: Validates application is running properly
- **Automatic rollback**: Falls back to previous version on failure
- **Backup creation**: Creates database backup before deployment

## Usage

### Normal Deployment
```bash
git add .
git commit -m "feat: your changes"
git push origin main
```

### Monitor Deployment
- Check GitHub Actions tab in your repository
- Watch for Slack notifications (if configured)
- Verify health at your application URL

## Troubleshooting

### Common Issues

**SSH Connection Failed**
- Verify `VM_SSH_KEY` is properly formatted (include headers/footers)
- Check `VM_HOST` and `VM_USER` are correct
- Ensure SSH key is added to server's authorized_keys

**Health Check Failed**
- SSH into server and check: `docker ps`
- View logs: `docker-compose logs`
- Check health endpoints: `curl http://localhost/health`

**Build Failed**
- Review build logs in GitHub Actions
- Check Docker file syntax
- Verify package.json dependencies

### Manual Recovery
If automated deployment fails:
```bash
# SSH to server
ssh user@your-server

# Navigate to app directory
cd /home/min/fg-index

# Manual deployment
./scripts/deploy.sh

# Check status
docker ps
```

## Best Practices

- **Test locally** before pushing to main
- **Monitor logs** in GitHub Actions for any issues  
- **Keep secrets updated** and rotate regularly
- **Review security scan results** in GitHub Security tab
- **Use descriptive commit messages** for deployment tracking 