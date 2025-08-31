import { api } from '@/boot/axios'

// Admin API 응답 타입 정의
export interface DataCollectionRequest {
  date: string
  sources: string[]
}

export interface DataCollectionResult {
  source: string
  status: 'SUCCESS' | 'FAILED'
  message: string
}

export interface DataCollectionResponse {
  date: string
  results: DataCollectionResult[]
}

export interface CalculateIndexRequest {
  date: string
}

export interface CalculateIndexResponse {
  date: string
  value: number
  level: string
  confidence: number
  components: {
    priceMomentum: number
    investorSentiment: number
    putCallRatio: number
    volatilityIndex: number
    safeHavenDemand: number
  }
}

export interface AdminUser {
  id: string
  username: string
  role: 'admin' | 'viewer'
  lastLogin: string
  permissions: string[]
}

// DART Admin Types
export interface DartBatchRequest {
  date: string
  options?: {
    sentimentOnly?: boolean
  }
}

export interface DartFinancialBatchRequest {
  businessYear: string
}

export interface DartBatchResponse {
  jobId: string
  message: string
}

// Fear & Greed Admin Types
export interface FearGreedCalculationRequest {
  date: string
}

export interface FearGreedRangeRequest {
  startDate: string
  endDate: string
}

export interface FearGreedRangeResponse {
  date: string
  value: number
  level: string
  status: 'success' | 'failed'
  message?: string
}

// Admin API 서비스
export const adminApi = {
  // 인증 관련
  async login(username: string, password: string): Promise<{ token: string; user: AdminUser }> {
    try {
      // 실제 API 구현 전까지 mock 데이터 사용
      if (username === 'admin' && password === 'admin123') {
        const mockResponse = {
          token: 'mock_admin_token_' + Date.now(),
          user: {
            id: '1',
            username: 'admin',
            role: 'admin' as const,
            lastLogin: new Date().toISOString(),
            permissions: ['read', 'write', 'delete', 'admin']
          }
        }
        return mockResponse
      } else {
        throw new Error('Invalid credentials')
      }
    } catch (error) {
      throw new Error('로그인에 실패했습니다.')
    }
  },

  async validateToken(token: string): Promise<AdminUser> {
    try {
      // Token validation logic here
      // For now, return mock user if token exists
      if (token.startsWith('mock_admin_token_')) {
        return {
          id: '1',
          username: 'admin',
          role: 'admin',
          lastLogin: new Date().toISOString(),
          permissions: ['read', 'write', 'delete', 'admin']
        }
      }
      throw new Error('Invalid token')
    } catch (error) {
      throw new Error('토큰 검증에 실패했습니다.')
    }
  },

  // 데이터 수집 관리
  async collectData(request: DataCollectionRequest): Promise<DataCollectionResponse> {
    try {
      const response = await api.post<{ success: boolean; data: DataCollectionResponse }>(
        '/api/admin/collect-data', 
        request
      )
      return response.data.data
    } catch (error) {
      console.error('Data collection failed:', error)
      throw new Error('데이터 수집에 실패했습니다.')
    }
  },

  // Fear & Greed 계산 관리
  async calculateIndex(request: CalculateIndexRequest): Promise<CalculateIndexResponse> {
    try {
      const response = await api.post<{ success: boolean; data: CalculateIndexResponse }>(
        '/api/admin/calculate-index',
        request
      )
      return response.data.data
    } catch (error) {
      console.error('Index calculation failed:', error)
      throw new Error('Fear & Greed Index 계산에 실패했습니다.')
    }
  },

  async recalculateRange(startDate: string, endDate: string): Promise<any[]> {
    try {
      const response = await api.post<{ success: boolean; data: any[] }>(
        '/api/admin/recalculate-range',
        { startDate, endDate }
      )
      return response.data.data
    } catch (error) {
      console.error('Range recalculation failed:', error)
      throw new Error('범위 재계산에 실패했습니다.')
    }
  },

  // DART 관리 기능
  async scheduleDartDailyBatch(request: DartBatchRequest): Promise<DartBatchResponse> {
    try {
      const response = await api.post<{ success: boolean; data: DartBatchResponse }>(
        '/api/dart/batch/daily',
        request
      )
      return response.data.data
    } catch (error) {
      console.error('DART daily batch scheduling failed:', error)
      throw new Error('DART 일별 배치 예약에 실패했습니다.')
    }
  },

  async scheduleDartFinancialBatch(request: DartFinancialBatchRequest): Promise<DartBatchResponse> {
    try {
      const response = await api.post<{ success: boolean; data: DartBatchResponse }>(
        '/api/dart/batch/financial',
        request
      )
      return response.data.data
    } catch (error) {
      console.error('DART financial batch scheduling failed:', error)
      throw new Error('DART 재무 배치 예약에 실패했습니다.')
    }
  },

  async getDartBatchStatus(): Promise<any> {
    try {
      const response = await api.get<{ success: boolean; data: any }>(
        '/api/dart/batch/status'
      )
      return response.data.data
    } catch (error) {
      console.error('DART batch status fetch failed:', error)
      throw new Error('DART 배치 상태 조회에 실패했습니다.')
    }
  },

  async getDartHealth(): Promise<any> {
    try {
      const response = await api.get<{ success: boolean; data: any }>(
        '/api/dart/health'
      )
      return response.data.data
    } catch (error) {
      console.error('DART health check failed:', error)
      throw new Error('DART 헬스 체크에 실패했습니다.')
    }
  },

  async getDartStats(date?: string): Promise<any> {
    try {
      const queryParams = date ? `?date=${date}` : ''
      const response = await api.get<{ success: boolean; data: any }>(
        `/api/dart/stats${queryParams}`
      )
      return response.data.data
    } catch (error) {
      console.error('DART stats fetch failed:', error)
      throw new Error('DART 통계 조회에 실패했습니다.')
    }
  },

  // Fear & Greed 관리 기능
  async calculateFearGreedIndex(request: FearGreedCalculationRequest): Promise<CalculateIndexResponse> {
    try {
      const response = await api.post<{ success: boolean; data: CalculateIndexResponse }>(
        '/api/fear-greed/calculate',
        request
      )
      return response.data.data
    } catch (error) {
      console.error('Fear & Greed index calculation failed:', error)
      throw new Error('Fear & Greed Index 계산에 실패했습니다.')
    }
  },

  async recalculateFearGreedRange(request: FearGreedRangeRequest): Promise<FearGreedRangeResponse[]> {
    try {
      const response = await api.post<{ success: boolean; data: FearGreedRangeResponse[] }>(
        '/api/fear-greed/recalculate-range',
        request
      )
      return response.data.data
    } catch (error) {
      console.error('Fear & Greed range recalculation failed:', error)
      throw new Error('Fear & Greed Index 범위 재계산에 실패했습니다.')
    }
  },

  async getFearGreedCurrent(): Promise<any> {
    try {
      const response = await api.get<{ success: boolean; data: any }>(
        '/api/fear-greed/current'
      )
      return response.data.data
    } catch (error) {
      console.error('Fear & Greed current index fetch failed:', error)
      throw new Error('현재 Fear & Greed Index 조회에 실패했습니다.')
    }
  },

  async getFearGreedHistory(days: number = 30): Promise<any[]> {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>(
        `/api/fear-greed/history?days=${days}`
      )
      return response.data.data
    } catch (error) {
      console.error('Fear & Greed history fetch failed:', error)
      throw new Error('Fear & Greed Index 히스토리 조회에 실패했습니다.')
    }
  },

  async getFearGreedStats(): Promise<any> {
    try {
      const response = await api.get<{ success: boolean; data: any }>(
        '/api/fear-greed/stats'
      )
      return response.data.data
    } catch (error) {
      console.error('Fear & Greed stats fetch failed:', error)
      throw new Error('Fear & Greed Index 통계 조회에 실패했습니다.')
    }
  }
}

export default adminApi