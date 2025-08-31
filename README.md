# 🇰🇷 KOSPI Fear & Greed Index

> KOSPI 시장의 투자자 심리를 종합적으로 분석하는 Fear & Greed Index 웹 애플리케이션

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)
![Vue](https://img.shields.io/badge/vue-3.x-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)

## 📊 프로젝트 개요

**KOSPI Fear & Greed Index**는 한국 주식시장(KOSPI)의 투자자 심리를 종합적으로 분석하여 0-100 스케일의 지수로 시각화하는 웹 애플리케이션입니다. CNN Fear & Greed Index를 참고하여 한국 시장에 특화된 지표들을 활용해 자체적인 심리지수를 산출합니다.

### ✨ 주요 기능

- 📈 **일별 Fear & Greed Index 산출 및 시각화**
- 📊 **실시간 시장 데이터 기반 종합 분석**
- 📱 **반응형 웹 디자인** (모바일, 태블릿, 데스크톱)
- 🎯 **직관적인 차트 및 대시보드**
- 💰 **Google AdSense 수익화**
- 🔄 **자동 데이터 수집 시스템**

## 🏗 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Vue 3)                        │
│              Quasar + Chart.js + Pinia + AdSense               │
└─────────────────────────────────────────────────────────────────┘
                                │
                        HTTPS/REST API
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (Node.js)                          │
│            Express + TypeScript + PostgreSQL                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
    ┌───────────────┐  ┌─────────────────┐  ┌─────────────────┐
    │ Data Collector│  │   Database      │  │  External APIs  │
    │  (Scheduler)  │  │ (PostgreSQL)    │  │  (KRX, BOK)     │
    └───────────────┘  └─────────────────┘  └─────────────────┘
```

## 🎯 Fear & Greed Index 구성 요소

### 📊 지표 구성 (가중치)

1. **주가 모멘텀** (25%) - KOSPI 지수 변화율 및 이동평균 분석
2. **투자자 심리** (25%) - 개인/외국인/기관 투자자 매매 동향  
3. **풋/콜 비율** (20%) - KOSPI200 옵션 풋/콜 거래 비율
4. **변동성 지수** (15%) - V-KOSPI 변동성 지수 역수
5. **안전자산 수요** (15%) - 국채 수익률 및 원/달러 환율 변동

### 📈 지수 해석

| 범위 | 상태 | 설명 |
|------|------|------|
| 0-25 | 극도의 공포 | 시장 과매도 상태, 매수 기회 |
| 25-45 | 공포 | 시장 불안, 신중한 접근 |
| 45-55 | 중립 | 균형 잡힌 시장 심리 |
| 55-75 | 탐욕 | 시장 과열, 주의 필요 |
| 75-100 | 극도의 탐욕 | 시장 과매수 상태, 매도 고려 |

## 🛠 기술 스택

### Frontend
- **Framework**: Vue 3 + Composition API
- **UI Library**: Quasar Framework
- **Charts**: Chart.js + ECharts
- **State Management**: Pinia
- **Build Tool**: Vite
- **Language**: TypeScript

### Backend  
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Language**: TypeScript
- **Scheduler**: node-cron
- **Authentication**: JWT

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Winston + Sentry
- **Hosting**: AWS/GCP/Azure

## 🚀 빠른 시작

### 필수 요구사항

- Node.js 18+
- PostgreSQL 15+
- npm 또는 yarn

### 1. 저장소 클론

```bash
git clone https://github.com/username/kospi-fg-index.git
cd kospi-fg-index
```

### 2. 프로젝트 초기 설정

#### 자동 설정 (권장)
```bash
# 전체 프로젝트 자동 설정 (환경변수 + 의존성 + Docker)
npm run setup
```

#### 수동 설정
```bash
# 1. 환경 파일 생성
cp env.sample .env

# 2. 환경 변수 설정 (.env 파일 수정)
# Edit .env file with your actual values
nano .env

# 3. 의존성 설치
npm run install:all

# 4. 환경 검증
npm run env:validate
```

🔗 **자세한 설정 가이드**: [docs/setup/LOCAL_SETUP.md](docs/setup/LOCAL_SETUP.md)

### 3. 개발 서버 실행

```bash
# 개발 환경 시작 (추천)
npm run start:dev

# 또는 단계별 실행
npm run docker:up        # Docker 서비스 시작
npm run migrate          # 데이터베이스 마이그레이션
npm start               # 애플리케이션 시작
```

### 4. 웹 애플리케이션 접속

- **Frontend**: http://localhost (포트 80)
- **Backend API**: http://localhost:3000
- **Database**: localhost:5432 (PostgreSQL)

### 5. 서비스 상태 확인

```bash
# 서비스 상태 및 헬스체크
npm run status

# 전체 헬스체크
npm run health

# 실시간 로그 보기
npm run logs
```

## 📁 프로젝트 구조

```
kospi-fg-index/
├── docs/                    # 📚 프로젝트 문서
│   ├── setup/              # 🚀 설정 가이드
│   ├── architecture/       # 🏗️ 시스템 아키텍처
│   ├── api/                # 🔌 API 문서
│   ├── deployment/         # 🚀 배포 가이드
│   ├── operations/         # 🔧 운영 관리
│   └── archive/            # 📦 아카이브
├── scripts/                # 🛠️ 관리 스크립트
│   ├── fg-manager.sh       # 메인 프로젝트 관리도구
│   ├── docker-utils.sh     # Docker 유틸리티
│   ├── env-utils.sh        # 환경변수 관리
│   ├── deploy.sh          # 배포 스크립트
│   ├── basic-monitor.sh   # 모니터링
│   ├── backup.sh          # 백업 스크립트
│   └── setup-vm.sh        # VM 설정
├── frontend/               # Vue.js 프론트엔드
│   ├── src/
│   │   ├── components/     # Vue 컴포넌트
│   │   ├── pages/          # 페이지 컴포넌트
│   │   ├── stores/         # Pinia 스토어
│   │   ├── composables/    # Composition API
│   │   └── utils/          # 유틸리티
│   └── public/             # 정적 파일
├── backend/                # Node.js 백엔드
│   ├── src/
│   │   ├── routes/         # API 라우터
│   │   ├── services/       # 비즈니스 로직
│   │   ├── collectors/     # 데이터 수집기
│   │   ├── repositories/   # 데이터 액세스
│   │   └── utils/          # 유틸리티
│   └── prisma/             # 데이터베이스 스키마
├── docker-compose.yml      # 🐳 통합 Docker 설정
├── .github/workflows/      # 🔄 CI/CD 파이프라인
├── package.json            # 📦 프로젝트 관리 스크립트
└── README.md              # 📖 프로젝트 README
```

### 🛠️ 새로운 스크립트 시스템

이 프로젝트는 통합된 관리 스크립트를 제공합니다:

```bash
# 📋 주요 명령어
npm run setup               # 프로젝트 초기 설정
npm run start:dev          # 개발환경 시작
npm run start:prod         # 프로덕션 시작
npm run deploy:prod        # 프로덕션 배포
npm run health             # 시스템 헬스체크
npm run backup             # 전체 백업

# 🐳 Docker 관리
npm run docker:up          # 서비스 시작
npm run docker:down        # 서비스 중지
npm run docker:clean       # 리소스 정리

# 🔧 환경 관리
npm run env:setup          # 환경 설정
npm run env:validate       # 환경 검증
npm run env:switch:prod    # 프로덕션 환경 전환
```

## 📊 데이터 소스

### 공공 API 활용

1. **한국거래소(KRX) API**
   - KOSPI/KOSDAQ 지수 데이터
   - 투자자별 매매 동향
   - 파생상품 거래 현황

2. **한국은행(BOK) API**  
   - 경제심리지수(ESI)
   - 기업경기조사(BSI)
   - 소비자동향조사(CSI)
   - 금리 및 환율 데이터

3. **금융위원회 공공데이터**
   - 금융투자협회 통계
   - 자금 동향 데이터

### 데이터 수집 스케줄

```
06:00 - 한국은행 API (금리, 환율)
09:30 - KRX API (장 시작 후 데이터)  
15:45 - KRX API (장 마감 후 확정 데이터)
18:00 - Fear & Greed Index 계산 및 저장
```

## 🎨 UI/UX 디자인

### 메인 페이지

- **Hero Section**: 현재 Fear & Greed Index 대형 표시
- **차트 영역**: 일별 추이 라인 차트, 히트맵, 히스토그램
- **정보 카드**: 오늘의 지수, 변화율, 평균, 시장 요약
- **Google AdSense**: 상단, 사이드바, 컨텐츠 중간 배치

### 주요 화면

1. **대시보드**: 종합 현황 및 주요 지표
2. **차트 분석**: 상세 차트 및 필터링
3. **과거 데이터**: 히스토리 테이블 및 다운로드
4. **정보**: 지수 설명 및 해석 가이드

## 🔧 개발 가이드

### API 엔드포인트

```typescript
// Fear & Greed Index API
GET /api/feargreed/current          # 현재 지수
GET /api/feargreed/history          # 과거 데이터
GET /api/feargreed/chart/:period    # 차트 데이터

// 시장 데이터 API
GET /api/market/kospi               # KOSPI 지수
GET /api/market/investors           # 투자자별 매매
GET /api/market/derivatives         # 파생상품 데이터
```

### 환경 변수

#### 🔧 환경 설정 파일

프로젝트 루트에 있는 `env.sample` 파일을 `.env`로 복사하여 사용하세요:

```bash
cp env.sample .env
```

#### 필수 변수
```env
# Database
DATABASE_URL=mysql://fg_user:password@localhost:3306/kospi_fg_index

# Essential APIs
DART_API_KEY=your_dart_api_key

# Security
JWT_SECRET=your_jwt_secret_minimum_32_characters_long_please_change_this
ADMIN_PASSWORD=your_secure_admin_password

# Application
NODE_ENV=development
FRONTEND_PORT=80
BACKEND_PORT=3000
```

#### 선택적 변수
```env
# Korean Financial APIs
KIS_API_KEY=your_korea_investment_api_key
KIS_API_SECRET=your_korea_investment_api_secret
BOK_API_KEY=your_bank_of_korea_api_key

# Cache & Session Store
REDIS_URL=redis://:your_redis_password@localhost:6379/0
REDIS_PASSWORD=your_redis_password

# Notifications (Optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
```

> 📋 **완전한 환경 설정 가이드**: `env.sample` 파일에 모든 변수와 상세한 설명이 포함되어 있습니다.

## 🧪 테스트

```bash
# 전체 테스트 실행
npm test

# 단위 테스트
npm run test:unit

# 통합 테스트  
npm run test:integration

# E2E 테스트
npm run test:e2e

# 커버리지 확인
npm run test:coverage
```

## 📦 배포

### Production 빌드

```bash
# 전체 빌드
npm run build

# 환경별 빌드
cd frontend && npm run build:prod      # 프로덕션 빌드
cd backend && npm run build:prod       # 백엔드 빌드

# Docker 이미지 빌드
docker-compose build
```

### 배포 가이드

```bash
# 환경별 배포
npm run deploy:staging      # 스테이징 배포
npm run deploy:prod        # 프로덕션 배포

# 또는 직접 스크립트 실행
ENVIRONMENT=production ./scripts/deploy.sh

# 롤백 (문제 발생시)
npm run rollback
```

🔗 **상세 배포 가이드**: [docs/deployment/DEPLOYMENT.md](docs/deployment/DEPLOYMENT.md)

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참고하세요.

## 📞 문의

- **프로젝트 홈페이지**: [https://kospi-feargreed.com](https://kospi-feargreed.com)
- **이슈 트래커**: [GitHub Issues](https://github.com/username/kospi-fg-index/issues)
- **이메일**: contact@kospi-feargreed.com

## 🙏 감사의 말

- [CNN Fear & Greed Index](https://www.cnn.com/markets/fear-and-greed) - 영감을 준 원본 지수
- [한국거래소](http://www.krx.co.kr) - 시장 데이터 제공
- [한국은행](https://www.bok.or.kr) - 경제 지표 제공
- Vue.js, Quasar, Chart.js 커뮤니티

---

**⭐ 이 프로젝트가 도움이 되었다면 스타를 눌러주세요!** 