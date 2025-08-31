# 🚀 MVP Implementation Setup

## Prerequisites
- Node.js v18+
- MySQL/PostgreSQL database
- DART API key

## Quick Start
```bash
# 1. Backend Setup
cd backend
npm install
npx prisma generate
npx prisma db push

# 2. Environment Configuration
cp .env.example .env
# Edit .env with your API keys

# 3. Start Development
npm run dev
```

## Essential Environment Variables
```env
NODE_ENV=development
DATABASE_URL=mysql://user:pass@localhost:3306/db
DART_API_KEY=your_dart_api_key_here
JWT_SECRET=your_jwt_secret_here
PORT=3000
LOG_LEVEL=info
```

## Testing Service
```bash
# Health check
curl http://localhost:3000/health

# API endpoints
curl http://localhost:3000/api/dart/disclosures
```

For detailed setup: See `docs/LOCAL_SETUP.md`