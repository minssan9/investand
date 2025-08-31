# API 엔드포인트 및 사용법 가이드

## 📊 실제 사용 가능한 API 목록

### 1. 한국거래소(KRX) 데이터 API

#### 기본 정보
- **베이스 URL**: `http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd`
- **인증**: 필요 없음 (공개 API)
- **응답 형식**: JSON
- **제한**: 일반적으로 요청량 제한 없음

#### 주요 엔드포인트

##### 1) KOSPI/KOSDAQ 지수 데이터
```javascript
const krxIndexData = {
  url: 'http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  data: {
    bld: 'dbms/MDC/STAT/standard/MDCSTAT00301',
    locale: 'ko_KR',
    trdDd: '20251201', // YYYYMMDD 형식
    money: '1', // 1: 원화, 2: 달러
    csvxls_isNo: 'false'
  }
}
```

##### 2) 투자자별 매매동향
```javascript
const investorTradingData = {
  url: 'http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd',
  method: 'POST',
  data: {
    bld: 'dbms/MDC/STAT/standard/MDCSTAT02203',
    locale: 'ko_KR',
    strtDd: '20241201', // 시작일
    endDd: '20251201',  // 종료일
    mktId: 'STK',       // STK: 전체, KOSPI: 코스피, KOSDAQ: 코스닥
    csvxls_isNo: 'false'
  }
}
```

##### 3) 파생상품 거래 데이터
```javascript
const derivativesData = {
  url: 'http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd',
  method: 'POST',
  data: {
    bld: 'dbms/MDC/STAT/standard/MDCSTAT30701',
    locale: 'ko_KR',
    trdDd: '20251201',
    prodId: 'ALL', // ALL: 전체, KRDRVOPTN: 옵션, KRDRVFUTR: 선물
    csvxls_isNo: 'false'
  }
}
```

### 2. 한국은행(BOK) 경제통계 API

#### 기본 정보
- **베이스 URL**: `https://ecos.bok.or.kr/api/`
- **인증**: API 키 필요 (무료 발급)
- **발급처**: https://ecos.bok.or.kr
- **일일 한도**: 10,000회 요청

#### API 키 신청 과정
1. https://ecos.bok.or.kr 회원가입
2. Open API > 인증키 신청
3. 승인 후 발급 (보통 즉시 승인)

#### 주요 엔드포인트

##### 1) 경제심리지수(ESI)
```javascript
const esiData = {
  url: 'https://ecos.bok.or.kr/api/StatisticSearch/[API_KEY]/json/kr/1/100/511Y003/M/202401/202412/',
  // 511Y003: 경제심리지수 통계코드
  // M: 월별 데이터
  // 202401/202412: 시작월/종료월
}
```

##### 2) 한국은행 기준금리
```javascript
const baseRateData = {
  url: 'https://ecos.bok.or.kr/api/StatisticSearch/[API_KEY]/json/kr/1/100/722Y001/D/20241201/20251201/',
  // 722Y001: 한국은행 기준금리 통계코드
  // D: 일별 데이터
}
```

##### 3) 원/달러 환율
```javascript
const exchangeRateData = {
  url: 'https://ecos.bok.or.kr/api/StatisticSearch/[API_KEY]/json/kr/1/100/731Y001/D/20241201/20251201/',
  // 731Y001: 원/달러 환율 통계코드
}
```

##### 4) 100대 통계지표 (핵심 지표)
```javascript
const keyStatData = {
  url: 'https://ecos.bok.or.kr/api/KeyStatisticList/[API_KEY]/json/kr/1/100/',
  // 최신 주요 경제지표 100개 제공
}
```

### 3. 공공데이터포털 API

#### 기본 정보
- **베이스 URL**: `https://api.odcloud.kr/api/`
- **인증**: 공공데이터포털 API 키 필요
- **발급처**: https://www.data.go.kr

### 4. VIX 지수 (해외 데이터)

#### Yahoo Finance API (비공식)
```javascript
const vixData = {
  url: 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX',
  // ^VIX: VIX 지수 심볼
  params: {
    period1: Math.floor(Date.now() / 1000) - 86400 * 30, // 30일 전
    period2: Math.floor(Date.now() / 1000), // 현재
    interval: '1d', // 일별 데이터
    includePrePost: 'false'
  }
}
```

## 🛠 실제 구현 예제

### Node.js + Express API 서버 예제

```javascript
// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// KRX 지수 데이터 수집
app.get('/api/krx/index/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    const response = await axios.post('http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd', 
      new URLSearchParams({
        bld: 'dbms/MDC/STAT/standard/MDCSTAT00301',
        locale: 'ko_KR',
        trdDd: date,
        money: '1',
        csvxls_isNo: 'false'
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// BOK 경제심리지수 수집
app.get('/api/bok/esi/:apiKey', async (req, res) => {
  try {
    const { apiKey } = req.params;
    
    const response = await axios.get(
      `https://ecos.bok.or.kr/api/StatisticSearch/${apiKey}/json/kr/1/100/511Y003/M/202401/202412/`
    );
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 투자자별 매매동향 수집
app.get('/api/krx/investor-trading/:startDate/:endDate', async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    
    const response = await axios.post('http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd',
      new URLSearchParams({
        bld: 'dbms/MDC/STAT/standard/MDCSTAT02203',
        locale: 'ko_KR',
        strtDd: startDate,
        endDd: endDate,
        mktId: 'STK',
        csvxls_isNo: 'false'
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
```

### Python 구현 예제

```python
# data_collector.py
import requests
import json
from datetime import datetime, timedelta

class KOSPIDataCollector:
    def __init__(self):
        self.krx_base_url = "http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd"
        
    def get_index_data(self, date_str):
        """KOSPI/KOSDAQ 지수 데이터 수집"""
        data = {
            'bld': 'dbms/MDC/STAT/standard/MDCSTAT00301',
            'locale': 'ko_KR',
            'trdDd': date_str,
            'money': '1',
            'csvxls_isNo': 'false'
        }
        
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.post(self.krx_base_url, data=data, headers=headers)
        return response.json()
    
    def get_investor_trading(self, start_date, end_date):
        """투자자별 매매동향 데이터 수집"""
        data = {
            'bld': 'dbms/MDC/STAT/standard/MDCSTAT02203',
            'locale': 'ko_KR',
            'strtDd': start_date,
            'endDd': end_date,
            'mktId': 'STK',
            'csvxls_isNo': 'false'
        }
        
        response = requests.post(self.krx_base_url, data=data)
        return response.json()

class BOKDataCollector:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://ecos.bok.or.kr/api/"
    
    def get_esi_data(self, start_period, end_period):
        """경제심리지수 데이터 수집"""
        url = f"{self.base_url}StatisticSearch/{self.api_key}/json/kr/1/100/511Y003/M/{start_period}/{end_period}/"
        response = requests.get(url)
        return response.json()
    
    def get_key_statistics(self):
        """100대 통계지표 수집"""
        url = f"{self.base_url}KeyStatisticList/{self.api_key}/json/kr/1/100/"
        response = requests.get(url)
        return response.json()

# 사용 예제
if __name__ == "__main__":
    # KRX 데이터 수집
    krx_collector = KOSPIDataCollector()
    index_data = krx_collector.get_index_data("20251201")
    print("KRX 지수 데이터:", json.dumps(index_data, indent=2, ensure_ascii=False))
    
    # BOK 데이터 수집 (API 키 필요)
    # bok_collector = BOKDataCollector("YOUR_API_KEY")
    # esi_data = bok_collector.get_esi_data("202401", "202412")
    # print("경제심리지수:", json.dumps(esi_data, indent=2, ensure_ascii=False))
```

## 🚨 주의사항 및 제한사항

### 1. KRX API
- **CORS 이슈**: 브라우저에서 직접 호출 시 CORS 오류 발생
- **해결방법**: 백엔드 서버를 통해 프록시로 호출
- **데이터 지연**: 20분 지연 데이터 제공
- **휴장일**: 주말, 공휴일 데이터 없음

### 2. BOK API
- **인증키 필수**: 반드시 사전 발급 필요
- **요청 제한**: 일일 10,000회
- **데이터 갱신**: 보통 T+1일 또는 T+2일에 갱신

### 3. 데이터 형식
- **날짜 형식**: YYYYMMDD (예: 20251201)
- **숫자 형식**: 쉼표 구분 문자열로 제공되는 경우 있음
- **인코딩**: UTF-8 사용 권장

## 📝 다음 단계

1. **API 키 발급**: 한국은행 ECOS 시스템에서 인증키 신청
2. **프록시 서버 구축**: CORS 문제 해결을 위한 백엔드 API 서버 개발
3. **데이터 파이프라인 구축**: 정기적인 데이터 수집 시스템 구현
4. **데이터 검증**: 수집된 데이터의 품질 검사 로직 구현
5. **캐싱 시스템**: 불필요한 API 호출 방지를 위한 캐싱 구현 