# KOSPI Fear & Greed Index 프로젝트 TODO

## 📋 프로젝트 개요
KOSPI 시장의 Fear & Greed Index 지표를 일별로 수집, 저장, 시각화하는 웹 애플리케이션

## 🎯 주요 목표
- [ ] KOSPI Fear & Greed Index 데이터 수집 시스템 구축
- [ ] 일별 데이터 저장 및 관리
- [ ] 직관적인 데이터 시각화 화면 제공
- [ ] Google AdSense 광고 수익화

## 📊 데이터 수집 계획

### Phase 1: API 조사 및 선정
- [ ] 한국거래소(KRX) API 조사
- [ ] 금융감독원 API 조사  
- [ ] 네이버/다음 금융 API 조사
- [ ] Yahoo Finance Korea API 조사
- [ ] 투자자 심리지수 관련 공공데이터 포털 확인
- [ ] 대안: 웹 스크래핑 방식 검토

### Phase 2: 데이터 수집 구현
- [ ] API 연동 모듈 개발
- [ ] 데이터 검증 로직 구현
- [ ] 일별 자동 수집 스케줄러 구현
- [ ] 에러 처리 및 로깅 시스템 구축

## 🛠 기술 스택

### Backend (Node.js)
- [ ] **Framework**: Express.js 또는 Fastify
- [ ] **Database**: PostgreSQL 또는 MySQL
- [ ] **ORM/ODM**: Prisma 또는 Mongoose
- [ ] **Scheduler**: node-cron
- [ ] **API Client**: axios
- [ ] **Validation**: joi 또는 zod
- [ ] **Logging**: winston
- [ ] **Environment**: dotenv

### Frontend (Vue.js + Quasar)
- [ ] **Framework**: Vue 3 + Composition API
- [ ] **UI Framework**: Quasar Framework
- [ ] **Charts**: Chart.js 또는 ECharts
- [ ] **State Management**: Pinia
- [ ] **HTTP Client**: axios
- [ ] **Build Tool**: Vite

### DevOps & Deployment
- [ ] **Containerization**: Docker
- [ ] **CI/CD**: GitHub Actions
- [ ] **Hosting**: AWS/GCP/Azure 또는 Vercel
- [ ] **Domain & SSL**: Cloudflare

## 📈 데이터베이스 설계

### 테이블 구조
- [ ] **fear_greed_index**
  - id (Primary Key)
  - date (날짜)
  - value (지수 값)
  - level (공포/탐욕 단계)
  - description (설명)
  - created_at
  - updated_at

- [ ] **market_indicators** (추가 지표)
  - id (Primary Key)
  - date (날짜)
  - kospi_index (코스피 지수)
  - trading_volume (거래량)
  - foreign_investment (외국인 투자)
  - created_at

## 🎨 UI/UX 설계

### 메인 페이지
- [ ] **Hero Section**: 현재 Fear & Greed Index 대형 표시
- [ ] **차트 섹션**: 
  - [ ] 일별 추이 라인 차트
  - [ ] 월별/분기별 히트맵
  - [ ] 분포 히스토그램
- [ ] **카드 섹션**:
  - [ ] 오늘의 지수 카드
  - [ ] 전일 대비 변화 카드  
  - [ ] 주간/월간 평균 카드
  - [ ] 시장 상황 요약 카드

### 상세 페이지
- [ ] **히스토리 테이블**: 일별 상세 데이터
- [ ] **필터링**: 기간별, 지수 범위별 필터
- [ ] **내보내기**: CSV/Excel 다운로드

## 💰 수익화 (Google AdSense)

### 광고 배치 계획
- [ ] **Header Banner**: 상단 배너 광고
- [ ] **Sidebar**: 우측 사이드바 광고
- [ ] **Content**: 컨텐츠 중간 네이티브 광고
- [ ] **Footer**: 하단 배너 광고

### AdSense 구현
- [ ] Google AdSense 계정 생성
- [ ] 사이트 등록 및 승인
- [ ] 광고 코드 통합
- [ ] 반응형 광고 설정
- [ ] 광고 성과 추적

## 🚀 개발 단계

### Sprint 1: 프로젝트 셋업 (1주)
- [ ] 프로젝트 구조 생성
- [ ] 개발 환경 설정
- [ ] Git 저장소 설정
- [ ] 기본 CI/CD 파이프라인 구축

### Sprint 2: Backend 개발 (2주)
- [ ] API 서버 기본 구조
- [ ] 데이터베이스 설계 및 마이그레이션
- [ ] 데이터 수집 모듈 개발
- [ ] RESTful API 엔드포인트 구현

### Sprint 3: Frontend 개발 (2주)  
- [ ] Vue + Quasar 프로젝트 설정
- [ ] 컴포넌트 구조 설계
- [ ] 차트 및 데이터 시각화 구현
- [ ] 반응형 UI 구현

### Sprint 4: 통합 및 배포 (1주)
- [ ] Frontend-Backend 통합
- [ ] 성능 최적화
- [ ] SEO 최적화
- [ ] 프로덕션 배포

### Sprint 5: 수익화 및 마케팅 (1주)
- [ ] Google AdSense 통합
- [ ] Google Analytics 설정
- [ ] 메타데이터 최적화
- [ ] 소셜 미디어 공유 기능

## 📋 체크리스트

### 기술적 요구사항
- [ ] 데이터 수집 자동화
- [ ] 실시간 데이터 업데이트
- [ ] 모바일 반응형 디자인
- [ ] SEO 최적화
- [ ] 성능 최적화 (Core Web Vitals)

### 비즈니스 요구사항  
- [ ] 사용자 친화적 인터페이스
- [ ] 빠른 로딩 속도
- [ ] 안정적인 서비스 운영
- [ ] 광고 수익 최적화

## 🔍 추가 고려사항
- [ ] 데이터 백업 및 복구 전략
- [ ] 보안 및 개인정보 보호
- [ ] 모니터링 및 알림 시스템
- [ ] 사용자 피드백 수집 시스템
- [ ] A/B 테스팅 환경 구축

## 📚 참고 자료
- [ ] KOSPI 관련 공식 문서 수집
- [ ] Fear & Greed Index 계산 방법 연구
- [ ] 유사 서비스 벤치마킹
- [ ] 금융 데이터 시각화 모범 사례 연구

---
**프로젝트 시작일**: {현재 날짜}  
**예상 완료일**: {시작일 + 7주}  
**담당자**: 개발팀  
**상태**: 기획 단계 

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