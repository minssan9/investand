# Environment Configuration Changes

## Summary
Updated the project to use a single `.env` file approach instead of multiple environment-specific files, simplifying configuration management while maintaining environment flexibility.

## Changes Made

### 1. Docker Compose Updates
- **Updated `docker-compose.yml`** to use single `.env` file for all services
- **Removed `env_file: - .env${ENV_SUFFIX}`** references
- **Added `env_file: - .env`** to all services (frontend, backend, scheduler, database, redis)
- **Updated default database** from PostgreSQL to MySQL for development compatibility

### 2. Environment File Consolidation
- **Created comprehensive `.env.example`** with organized sections:
  - Application Settings
  - Database Configuration  
  - Cache & Session Store
  - Security & Authentication
  - Korean Financial Data APIs
  - Data Collection & Scheduling
  - Caching & Performance
  - Rate Limiting
  - Logging & Monitoring
  - External Services & Notifications
  - Development & Testing
  - Production Deployment Settings
  - Docker Compose Environment Variables

### 3. Script Updates
- **Updated `scripts/env-utils.sh`**:
  - Modified `cmd_switch()` to update NODE_ENV in single .env file
  - Updated `cmd_check()` to read from single .env file
  - Simplified backup/restore to work with single file approach
- **Updated deployment script** to reference single .env file
- **Updated package.json scripts** to use NODE_ENV overrides instead of separate files

### 4. Package.json Updates
- **Frontend**: Modified build scripts to use NODE_ENV overrides
- **Backend**: Updated production scripts to use single .env with NODE_ENV
- **Root**: Scripts now work with single .env file approach

## Benefits

### Simplified Configuration
- **Single source of truth** for environment variables
- **No more environment-specific file management**
- **Easier to maintain and understand**

### Flexible Environment Switching
- **NODE_ENV variable** controls environment behavior
- **ENVIRONMENT variable** controls Docker Compose profiles
- **Easy switching** via `npm run env:switch:prod` etc.

### Better Developer Experience
- **Clear .env.example** with comprehensive documentation
- **Organized sections** with helpful comments
- **Production examples** included in comments

## Usage

### Setup
```bash
# Copy example to create your .env
cp .env.example .env

# Edit .env file with your specific values
# Then run setup
npm run env:setup
```

### Environment Switching
```bash
# Switch to production (updates NODE_ENV in .env)
npm run env:switch:prod

# Switch to development
npm run env:switch:dev

# Check current environment
npm run env:check
```

### Docker Profiles
The single .env file works with Docker Compose profiles:
```bash
# Development (default)
docker-compose up

# Production with all services
docker-compose --profile production up

# Staging environment
docker-compose --profile staging up
```

## Migration Notes

### For Existing Deployments
1. Backup current environment files
2. Create `.env` from appropriate existing environment file
3. Update any deployment scripts to use single .env
4. Test configuration with `npm run env:validate`

### Environment Variables
All environment variables now go in the single `.env` file. The `NODE_ENV` variable controls:
- Application behavior (development/staging/production)
- Build optimizations
- Logging levels
- Debug features

The `ENVIRONMENT` variable controls:
- Docker Compose profiles
- Deployment targets
- Service configurations

## Security Notes
- **.env file should never be committed** to version control
- **Production deployments** should use secure methods to manage .env
- **All sensitive values** should be updated from .env.example defaults
- **API keys and passwords** must be changed from placeholder values
