# KOSPI Fear & Greed Index 기술 스택 및 아키텍처

## 🏗 시스템 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend Layer                         │
├─────────────────────────────────────────────────────────────────┤
│  Vue 3 + Quasar + Chart.js + Pinia + Google AdSense             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS/REST API
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Backend Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  Node.js + Express + TypeScript + JWT + CORS                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Data Collector │ │   Database      │ │  External APIs  │
│   (Scheduler)   │ │  (PostgreSQL)   │ │   (KRX, BOK)    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## 🛠 기술 스택 상세

### Frontend Stack

#### 🎨 **Vue 3 Ecosystem**
```json
{
  "vue": "^3.4.0",
  "vue-router": "^4.2.0",
  "pinia": "^2.1.0",
  "@vueuse/core": "^10.7.0"
}
```

**선택 이유**:
- Composition API를 통한 로직 재사용성
- 뛰어난 성능과 번들 크기 최적화
- TypeScript 지원 우수
- 활발한 생태계

#### 🎯 **Quasar Framework**  
```json
{
  "@quasar/cli": "^2.3.0",
  "quasar": "^2.14.0"
}
```

**핵심 기능**:
- **그리드 시스템**: 반응형 레이아웃 구성
- **컴포넌트**: 카드, 차트, 테이블 등
- **반응형**: 모바일 우선 디자인
- **테마**: 다크/라이트 모드 지원

#### 📊 **차트 라이브러리**
```json
{
  "chart.js": "^4.2.0",
  "vue-chartjs": "^5.2.0",
  "echarts": "^5.4.0"
}
```

**차트 유형**:
- **라인 차트**: 일별 Fear & Greed Index 추이
- **도넛 차트**: 현재 시장 심리 상태
- **히트맵**: 월별/분기별 심리 변화
- **히스토그램**: 지수 분포 현황

#### 🎭 **상태 관리 (Pinia)**
```typescript
// stores/fearGreedStore.ts
export const useFearGreedStore = defineStore('fearGreed', () => {
  const currentIndex = ref<number>(0)
  const historicalData = ref<FearGreedData[]>([])
  const loading = ref<boolean>(false)

  const fetchLatestIndex = async () => {
    loading.value = true
    // API 호출 로직
  }

  return {
    currentIndex,
    historicalData,
    loading,
    fetchLatestIndex
  }
})
```

### Backend Stack

#### 🟢 **Node.js + Express**
```json
{
  "node": ">=18.0.0",
  "express": "^4.18.0",
  "typescript": "^5.3.0",
  "@types/node": "^20.10.0"
}
```

**프로젝트 구조**:
```
backend/
├── src/
│   ├── controllers/     # API 컨트롤러
│   ├── services/        # 비즈니스 로직
│   ├── models/          # 데이터 모델
│   ├── middleware/      # 미들웨어
│   ├── utils/           # 유틸리티
│   ├── collectors/      # 데이터 수집기
│   └── schedulers/      # 작업 스케줄러
├── prisma/              # 데이터베이스 스키마
└── tests/               # 테스트 코드
```

#### 🗃 **데이터베이스 (PostgreSQL + Prisma)**
```json
{
  "postgresql": "^15.0",
  "prisma": "^5.7.0",
  "@prisma/client": "^5.7.0"
}
```

**스키마 설계**:
```prisma
// prisma/schema.prisma
model FearGreedIndex {
  id          String   @id @default(cuid())
  date        DateTime @unique
  value       Float
  level       String   // EXTREME_FEAR, FEAR, NEUTRAL, GREED, EXTREME_GREED
  components  Json     // 각 구성 요소별 점수
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("fear_greed_index")
}

model MarketIndicator {
  id              String   @id @default(cuid())
  date            DateTime
  kospiIndex      Float
  kospiChange     Float
  tradingVolume   BigInt
  foreignBuying   BigInt
  individualBuying BigInt
  institutionalBuying BigInt
  putCallRatio    Float?
  vkospi          Float?
  createdAt       DateTime @default(now())

  @@unique([date])
  @@map("market_indicators")
}
```

#### ⏰ **스케줄러 (node-cron)**
```typescript
// src/schedulers/dataCollector.ts
import cron from 'node-cron'
import { KRXCollector } from '../collectors/krxCollector'
import { BOKCollector } from '../collectors/bokCollector'

// 평일 06:00 - 한국은행 데이터 수집
cron.schedule('0 6 * * 1-5', async () => {
  await BOKCollector.collectDailyData()
})

// 평일 15:45 - KRX 장마감 후 데이터 수집
cron.schedule('45 15 * * 1-5', async () => {
  await KRXCollector.collectDailyData()
})

// 평일 18:00 - Fear & Greed Index 계산
cron.schedule('0 18 * * 1-5', async () => {
  await FearGreedCalculator.calculateDailyIndex()
})
```

### Data Collection Layer

#### 📡 **API 클라이언트**
```typescript
// src/collectors/krxCollector.ts
export class KRXCollector {
  private static baseURL = 'http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd'

  static async fetchKOSPIData(date: string) {
    const params = {
      bld: 'dbms/MDC/STAT/standard/MDCSTAT01501',
      locale: 'ko_KR',
      trdDd: date
    }
    
    return await this.apiCall(params)
  }

  static async fetchInvestorTrading(date: string) {
    const params = {
      bld: 'dbms/MDC/STAT/standard/MDCSTAT02203',
      locale: 'ko_KR',
      trdDd: date,
      mktId: 'STK'
    }
    
    return await this.apiCall(params)
  }
}
```

#### 🧮 **Fear & Greed 계산 엔진**
```typescript
// src/services/fearGreedCalculator.ts
export class FearGreedCalculator {
  private static weights = {
    priceMovement: 0.25,     // 주가 움직임
    investorSentiment: 0.25, // 투자자 심리
    putCallRatio: 0.20,      // 풋콜 비율
    volatility: 0.15,        // 변동성
    safeHaven: 0.15          // 안전자산 수요
  }

  static async calculateIndex(date: string): Promise<number> {
    const indicators = await this.gatherIndicators(date)
    
    const scores = {
      priceScore: this.calculatePriceScore(indicators),
      sentimentScore: this.calculateSentimentScore(indicators),
      putCallScore: this.calculatePutCallScore(indicators),
      volatilityScore: this.calculateVolatilityScore(indicators),
      safeHavenScore: this.calculateSafeHavenScore(indicators)
    }

    return this.weightedAverage(scores)
  }

  private static calculatePriceScore(indicators: MarketIndicators): number {
    // KOSPI 20일 이동평균 대비 현재 위치
    const ma20Position = indicators.currentPrice / indicators.ma20
    
    // 0-100 스케일로 정규화
    return Math.min(100, Math.max(0, (ma20Position - 0.9) * 500))
  }
}
```

### Infrastructure & DevOps

#### 🐳 **컨테이너화 (Docker)**
```dockerfile
# Dockerfile.backend
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY prisma/ ./prisma/

EXPOSE 3000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "5000:5000"
    environment:
      - VITE_API_URL=http://localhost:3000

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/feargreed
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=feargreed
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### 🚀 **CI/CD (GitHub Actions)**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        run: |
          # 배포 스크립트 실행
```

### Google AdSense 통합

#### 💰 **광고 배치 전략**
```vue
<!-- components/AdBanner.vue -->
<template>
  <div class="ad-container" :class="adSize">
    <ins 
      class="adsbygoogle"
      :style="adStyle"
      data-ad-client="ca-pub-XXXXXXXXX"
      :data-ad-slot="adSlot"
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>
  </div>
</template>

<script setup lang="ts">
interface Props {
  adSize: 'header' | 'sidebar' | 'content' | 'footer'
  adSlot: string
}

const props = defineProps<Props>()

onMounted(() => {
  (window.adsbygoogle = window.adsbygoogle || []).push({})
})
</script>
```

#### 📱 **반응형 광고 레이아웃**
```scss
// styles/ads.scss
.ad-container {
  &.header {
    max-width: 728px;
    height: 90px;
    margin: 0 auto;
    
    @media (max-width: 768px) {
      max-width: 320px;
      height: 50px;
    }
  }

  &.sidebar {
    width: 300px;
    height: 250px;
    
    @media (max-width: 1024px) {
      display: none;
    }
  }

  &.content {
    max-width: 100%;
    min-height: 280px;
    margin: 20px 0;
  }
}
```

## 🔧 개발 환경 설정

### 로컬 개발 환경
```bash
# 1. 저장소 클론
git clone https://github.com/username/kospi-fg-index.git
cd kospi-fg-index

# 2. 환경 변수 설정
cp .env.example .env

# 3. 의존성 설치
npm install

# 4. 데이터베이스 설정
npm run db:migrate
npm run db:seed

# 5. 개발 서버 실행
npm run dev
```

### 환경 변수 (.env)
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/feargreed

# API Keys
KRX_API_KEY=your_krx_api_key
BOK_API_KEY=your_bok_api_key

# JWT
JWT_SECRET=your_jwt_secret

# Google AdSense
GOOGLE_ADSENSE_CLIENT=ca-pub-xxxxxxxxx

# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5000
```

## 📊 성능 최적화 전략

### Frontend 최적화
- **코드 스플리팅**: 라우트별 lazy loading
- **이미지 최적화**: WebP 포맷, lazy loading
- **번들 최적화**: Tree shaking, minification
- **CDN 활용**: 정적 자산 배포

### Backend 최적화
- **데이터베이스 인덱싱**: 쿼리 성능 최적화
- **캐싱**: Redis를 통한 API 응답 캐싱
- **API 레이트 리미팅**: 외부 API 호출 최적화
- **압축**: gzip 응답 압축

### 모니터링
- **성능 모니터링**: New Relic, DataDog
- **에러 추적**: Sentry
- **로그 관리**: Winston + ELK Stack
- **업타임 모니터링**: UptimeRobot

## 🛡 보안 고려사항

### API 보안
- **JWT 인증**: 안전한 토큰 기반 인증
- **CORS 설정**: 허용된 도메인만 접근
- **Rate Limiting**: API 호출 제한
- **Input Validation**: 입력 데이터 검증

### 데이터 보안
- **데이터베이스 암호화**: 민감 정보 암호화
- **API 키 관리**: 환경 변수로 분리
- **HTTPS 강제**: SSL/TLS 통신
- **정기 보안 스캔**: 취약점 점검

---
**업데이트**: 2024년 12월  
**다음 단계**: 프로토타입 개발 시작 