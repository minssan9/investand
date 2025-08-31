# 🚀 로컬 개발 환경 설정 가이드

## 📋 시스템 요구사항

### 필수 설치 프로그램
- **Node.js**: v18.0.0 이상 (LTS 권장)
- **npm**: v8.0.0 이상 또는 **yarn**: v1.22.0 이상 또는 **pnpm**: v7.0.0 이상
- **PostgreSQL**: v14.0 이상
- **Git**: v2.30.0 이상

### 권장 개발 도구
- **VS Code**: 통합 개발 환경
- **DBeaver**: 데이터베이스 관리 도구
- **Postman**: API 테스트 도구
- **Docker Desktop**: 컨테이너 환경 (선택사항)

## 🛠 설치 순서

### 1. 저장소 클론
```bash
# 프로젝트 클론
git clone https://github.com/your-username/kospi-fg-index.git
cd kospi-fg-index

# 브랜치 확인
git branch -a
git checkout main
```

### 2. Node.js 환경 설정
```bash
# Node.js 버전 확인
node --version
npm --version

# 전역 패키지 설치 (선택사항)
npm install -g @vue/cli
npm install -g typescript
npm install -g nodemon
```

### 3. 패키지 설치

#### Backend 패키지 설치
```bash
# backend 디렉토리로 이동
cd backend

# 의존성 설치
npm install

# 또는 yarn 사용시
yarn install

# 또는 pnpm 사용시
pnpm install
```

#### Frontend 패키지 설치
```bash
# frontend 디렉토리로 이동
cd ../frontend

# 의존성 설치
npm install

# Quasar CLI 전역 설치
npm install -g @quasar/cli
```

## 🗄 데이터베이스 설정

### MySQL 설치 및 설정

#### 방법 1: 직접 설치
```bash
# macOS (Homebrew)
brew install mysql@8.0
brew services start mysql@8.0

# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# 서비스 시작
sudo systemctl start mysql
sudo systemctl enable mysql
```

#### 방법 2: Docker 사용
```bash
# MySQL Docker 컨테이너 실행
docker run --name kospi-mysql \
  -e MYSQL_DATABASE=fg_index \
  -e MYSQL_USER=kospi_user \
  -e MYSQL_PASSWORD=kospi_password \
  -e MYSQL_ROOT_PASSWORD=root_password \
  -p 3306:3306 \
  -d mysql:8.0
```

### 데이터베이스 초기화
```bash
# MySQL 접속
mysql -u root -p

# 데이터베이스 및 사용자 생성
CREATE DATABASE fg_index CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kospi_user'@'%' IDENTIFIED BY 'kospi_password';
GRANT ALL PRIVILEGES ON fg_index.* TO 'kospi_user'@'%';
FLUSH PRIVILEGES;
EXIT;
```

## ⚙️ 환경 변수 설정

### Backend 환경 변수
`backend/.env` 파일을 생성하고 다음 내용을 입력:

```env
# 서버 설정
NODE_ENV=development
PORT=3000
HOST=localhost

# 데이터베이스 설정
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=fg_index
DB_USER=kospi_user
DB_PASSWORD=kospi_password
DB_POOL_MIN=2
DB_POOL_MAX=10

# JWT 설정
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
JWT_EXPIRES_IN=24h

# API 키 설정
KRX_API_KEY=your-krx-api-key
BOK_API_KEY=your-bok-api-key
INVESTING_API_KEY=your-investing-com-api-key

# Redis 설정 (캐시용, 선택사항)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 로그 설정
LOG_LEVEL=debug
LOG_DIR=./logs

# 스케줄러 설정
ENABLE_SCHEDULER=true
DATA_COLLECTION_TIME=16:00
CALCULATION_TIME=17:00

# CORS 설정
CORS_ORIGIN=http://localhost:8080,http://127.0.0.1:8080

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend 환경 변수
`frontend/.env` 파일을 생성하고 다음 내용을 입력:

```env
# API 서버 설정
VUE_APP_API_BASE_URL=http://localhost:3000/api
VUE_APP_API_TIMEOUT=10000

# Google AdSense 설정
VUE_APP_GOOGLE_ADSENSE_CLIENT=ca-pub-your-adsense-client-id
VUE_APP_GOOGLE_ANALYTICS_ID=G-YOUR-GA4-ID

# 환경 설정
VUE_APP_ENV=development
VUE_APP_DEBUG=true

# 차트 설정
VUE_APP_CHART_THEME=light
VUE_APP_CHART_ANIMATION=true

# PWA 설정
VUE_APP_PWA_NAME=KOSPI Fear & Greed Index
VUE_APP_PWA_SHORT_NAME=KOSPI FGI
```

## 🚀 서버 실행 방법

### 개발 서버 실행

#### 1. Backend 서버 시작
```bash
# backend 디렉토리에서
cd backend

# 개발 모드로 실행 (nodemon 사용)
npm run dev

# 또는 일반 실행
npm start

# 또는 TypeScript 직접 실행
npm run ts-dev
```

**Backend 서버 접속 URL**: http://localhost:3000

#### 2. Frontend 개발 서버 시작
```bash
# 새 터미널에서 frontend 디렉토리로 이동
cd frontend

# Quasar 개발 서버 실행
quasar dev

# 또는 Vite 개발 서버 실행
npm run dev
```

**Frontend 서버 접속 URL**: http://localhost:8080

### 프로덕션 빌드 및 실행

#### Backend 프로덕션 빌드
```bash
cd backend

# TypeScript 컴파일
npm run build

# 프로덕션 실행
npm run start:prod
```

#### Frontend 프로덕션 빌드
```bash
cd frontend

# 프로덕션 빌드
quasar build

# 빌드 결과 확인
ls -la dist/

# 정적 서버로 실행 (선택사항)
npx serve dist/spa
```

## 🧪 데이터베이스 마이그레이션 및 시드

### 마이그레이션 실행
```bash
cd backend

# 마이그레이션 실행
npm run migrate

# 마이그레이션 롤백
npm run migrate:rollback

# 새 마이그레이션 생성
npm run migrate:make migration-name
```

### 시드 데이터 삽입
```bash
# 시드 데이터 실행
npm run seed

# 특정 시드 파일 실행
npm run seed:run -- --specific=sample-data.js
```

## 🔧 개발 도구 설정

### VS Code 설정
`.vscode/settings.json` 파일 생성:
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.workingDirectories": ["backend", "frontend"],
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.env": true
  }
}
```

### VS Code 확장 프로그램 권장
```json
{
  "recommendations": [
    "Vue.volar",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

## 📝 개발 스크립트

### Backend 스크립트
```bash
# 개발 서버 (hot reload)
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm run start

# 테스트 실행
npm run test

# 테스트 커버리지
npm run test:coverage

# 린트 검사
npm run lint

# 린트 자동 수정
npm run lint:fix

# 타입 체크
npm run type-check

# 데이터베이스 관련
npm run migrate
npm run seed
npm run db:reset
```

### Frontend 스크립트
```bash
# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 프리뷰
npm run preview

# 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 린트
npm run lint

# 타입 체크
npm run type-check

# PWA 빌드
npm run build:pwa
```

## 🐳 Docker 설정 (선택사항)

### Docker Compose 실행
```bash
# 전체 스택 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 특정 서비스만 실행
docker-compose up -d mysql
docker-compose up -d backend
docker-compose up -d frontend

# 정리
docker-compose down
```

### 개별 Docker 명령어
```bash
# Backend 이미지 빌드
docker build -t kospi-backend ./backend

# Frontend 이미지 빌드
docker build -t kospi-frontend ./frontend

# 컨테이너 실행
docker run -p 3000:3000 kospi-backend
docker run -p 8080:8080 kospi-frontend
```

## 🔍 트러블슈팅

### 자주 발생하는 문제들

#### 1. 포트 충돌
```bash
# 포트 사용 중인 프로세스 확인
lsof -i :3000
lsof -i :8080

# 프로세스 종료
kill -9 PID
```

#### 2. 데이터베이스 연결 오류
```bash
# MySQL 서비스 상태 확인
brew services list | grep mysql  # macOS
sudo systemctl status mysql      # Linux

# 연결 테스트
mysql -u kospi_user -p
```

#### 3. 패키지 설치 오류
```bash
# npm 캐시 정리
npm cache clean --force

# node_modules 재설치
rm -rf node_modules package-lock.json
npm install

# 권한 문제 (macOS/Linux)
sudo chown -R $(whoami) ~/.npm
```

#### 4. TypeScript 컴파일 오류
```bash
# TypeScript 버전 확인
npx tsc --version

# 타입 정의 재설치
npm install --save-dev @types/node @types/express

# 캐시 정리
npx tsc --build --clean
```

### 로그 확인 방법

#### Backend 로그
```bash
# 개발 환경 로그
tail -f backend/logs/development.log

# 에러 로그만 확인
tail -f backend/logs/error.log

# 실시간 로그 (PM2 사용시)
pm2 logs kospi-backend
```

#### Frontend 로그
```bash
# 브라우저 개발자 도구 콘솔 확인
# 또는 빌드 로그 확인
npm run build --verbose
```

## 📊 성능 모니터링

### 로컬 성능 확인
```bash
# Backend API 응답 시간 테스트
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health

# 메모리 사용량 확인
node --inspect backend/dist/server.js

# 데이터베이스 성능
mysql -u kospi_user -p -e "EXPLAIN ANALYZE SELECT * FROM fear_greed_index;"
```

### 개발 도구
- **Backend**: http://localhost:3000/api-docs (Swagger UI)
- **Database**: http://localhost:3000 (MySQL 연결)
- **Redis**: http://localhost:6379 (RedisInsight)

---

## 🎉 설정 완료 확인

모든 설정이 완료되면 다음 URL들이 정상 작동해야 합니다:

1. **Backend API**: http://localhost:3000/api/health
2. **Frontend**: http://localhost:8080
3. **API 문서**: http://localhost:3000/api-docs
4. **데이터베이스**: MySQL 연결 확인

### 최종 확인 명령어
```bash
# Backend 상태 확인
curl http://localhost:3000/api/health

# Frontend 빌드 확인
cd frontend && npm run build

# 테스트 실행
cd backend && npm test
cd frontend && npm test
```

---
**업데이트**: 2024년 12월  
**문의**: 개발팀 Slack 채널 #kospi-fg-index 