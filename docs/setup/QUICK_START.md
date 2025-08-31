# 🚀 빠른 시작 가이드

## 프로토타입 실행하기

### 1️⃣ 사전 준비
```bash
# Node.js v18+ 설치 확인
node --version

# MySQL 서버 실행 확인 (localhost:3306)
# - 사용자: root
# - 비밀번호: admin
# - 데이터베이스: fg_index (자동 생성됨)

# Git으로 프로젝트 클론 (이미 완료된 경우 생략)
git clone https://github.com/your-username/kospi-fg-index.git
cd kospi-fg-index
```

### 2️⃣ Backend 서버 실행
```bash
# 새 터미널 1: Backend 서버
cd backend

# 패키지 설치 (이미 완료됨)
npm install

# 환경 변수 확인 (.env 파일이 이미 생성됨)
cat .env
# DATABASE_URL="mysql://root:admin@localhost:3306/fg_index"

# 데이터베이스 스키마 생성 (Prisma)
npx prisma generate
npx prisma db push

# 개발 서버 시작
npm run dev

# ✅ 백엔드 서버가 http://localhost:3000 에서 실행됨
```

### 3️⃣ Frontend 서버 실행
```bash
# 새 터미널 2: Frontend 서버
cd frontend

# 패키지 설치 (이미 완료됨)
npm install

# Quasar CLI 설치 (전역)
npm install -g @quasar/cli

# 프론트엔드 서버 시작
npm run dev
# 또는
quasar dev

# ✅ 프론트엔드가 http://localhost:8080 에서 실행됨
```

### 4️⃣ 브라우저에서 확인
- **웹 애플리케이션**: http://localhost:8080
- **API 서버**: http://localhost:3000/api
- **API 상태 확인**: http://localhost:3000/health

## 📊 현재 프로토타입 기능

### ✅ 구현 완료
- [x] **Backend API 서버** (Node.js + Express + TypeScript)
- [x] **Frontend 대시보드** (Vue 3 + Quasar + TypeScript)
- [x] **MySQL 데이터베이스 연동** (Prisma ORM)
- [x] **Fear & Greed Index 화면** (샘플 데이터)
- [x] **KOSPI/KOSDAQ 지수 표시**
- [x] **반응형 디자인** (모바일/데스크톱)
- [x] **API 엔드포인트 구조**
- [x] **에러 핸들링 및 로깅**
- [x] **데이터베이스 스키마** (Prisma)

### 🚧 구현 예정
- [ ] **실제 API 연동** (KRX, BOK)
- [ ] **Chart.js 차트 구현**
- [ ] **Fear & Greed Index 계산 로직**
- [ ] **자동 데이터 수집 스케줄러**
- [ ] **Google AdSense 통합**

## 🗄️ 데이터베이스 스키마

### 주요 테이블
- `fear_greed_index` - Fear & Greed Index 일일 데이터
- `kospi_data` - KOSPI 일일 주가 데이터
- `kosdaq_data` - KOSDAQ 일일 주가 데이터
- `investor_trading` - 투자자별 매매동향
- `economic_sentiment` - 경제심리지수 (한국은행)
- `derivatives_data` - 파생상품 거래 데이터
- `data_collection_log` - 데이터 수집 로그

### Prisma 명령어
```bash
# 스키마 변경 후 DB 반영
npx prisma db push

# 클라이언트 재생성
npx prisma generate

# DB 브라우저 열기
npx prisma studio
```

## 🔗 주요 API 엔드포인트

### Fear & Greed Index
- `GET /api/fear-greed/current` - 현재 지수
- `GET /api/fear-greed/history` - 히스토리
- `GET /api/fear-greed/stats` - 통계

### 시장 데이터
- `GET /api/data/market` - 전체 시장 데이터
- `GET /api/data/kospi` - KOSPI 지수
- `GET /api/data/kosdaq` - KOSDAQ 지수

### 시스템
- `GET /health` - 서버 상태 확인
- `GET /api/status` - API 상태

## 🛠 다음 개발 단계

1. **한국은행 API 키 발급**: https://ecos.bok.or.kr
2. **실제 데이터 연동**: KRX, BOK API 구현
3. **차트 라이브러리**: Chart.js 통합
4. **실제 데이터 수집**: 스케줄러 및 데이터 파이프라인
5. **배포 준비**: Docker, CI/CD 파이프라인

## 🔧 트러블슈팅

### MySQL 연결 오류 시
```bash
# MySQL 서버 상태 확인
mysql -h localhost -P 3306 -u root -p

# 데이터베이스 생성 (필요시)
CREATE DATABASE fg_index;
```

### 포트 충돌 시
```bash
# 포트 변경 (backend)
PORT=3001 npm run dev

# 포트 변경 (frontend)
quasar dev --port 8081
```

### 패키지 설치 오류 시
```bash
# 캐시 삭제 후 재설치
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Prisma 오류 시
```bash
# Prisma 클라이언트 재생성
npx prisma generate

# 데이터베이스 리셋 (주의: 데이터 삭제됨)
npx prisma db push --force-reset
```

## 📞 도움말

문제가 발생하면 다음을 확인하세요:

1. **Node.js 버전**: v18 이상 필요
2. **MySQL 서버**: localhost:3306에서 실행 중인지 확인
3. **데이터베이스 접속**: root/admin 계정으로 접속 가능한지 확인
4. **포트 충돌**: 3000, 8080 포트가 사용 중인지 확인
5. **환경 변수**: .env 파일이 올바르게 설정되었는지 확인

더 자세한 내용은 다음 문서들을 참조하세요:
- [`docs/LOCAL_SETUP.md`](./LOCAL_SETUP.md) - 상세 설치 가이드
- [`docs/API_ENDPOINTS.md`](./API_ENDPOINTS.md) - API 사용법
- [`docs/FEAR_GREED_LOGIC.md`](./FEAR_GREED_LOGIC.md) - 지수 계산 로직 