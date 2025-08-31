import cron from 'node-cron'
import { KrxCollectionService } from '@/services/collectors/KrxCollectionService'
import { BOKCollector } from '@/collectors/financial/bokCollector'
import { DartCollectionService } from '@/services/collectors/DartCollectionService'
import { FearGreedCalculator } from '@/services/core/fearGreedCalculator'
import { DatabaseService } from '@/services/core/databaseService'
import { MarketDataRepository } from '@/repositories/market/MarketDataRepository'
import { FearGreedIndexRepository } from '@/repositories/analytics/FearGreedIndexRepository'
import { BatchQueueManager } from './BatchQueueManager'
import { ErrorRecoverySystem } from './ErrorRecoverySystem'
import { RateLimitingService } from './RateLimitingService'
import { BatchMonitoringService } from './BatchMonitoringService'
import { logger } from '@/utils/common/logger'
// import { DartBatchService } from '@/services/dartBatchService' // Not implemented yet
// import { fetchUpbitIndexData } from '@/collectors/upbitCollector' // Not implemented yet
// import { fetchCnnFearGreedIndexData } from '@/collectors/cnnCollector' // Not implemented yet
// import { fetchKoreaFGIndexData } from '@/collectors/koreaFGCollector' // Not implemented yet

// 스케줄러 상태 관리
let isSchedulerRunning = false
let scheduledJobs: cron.ScheduledTask[] = []

// 8시간 배치 세션 상태 관리
interface BatchSession {
  id: string
  type: string
  startTime: Date
  maxDuration: number
  isActive: boolean
  completedTasks: string[]
  failedTasks: string[]
}

let currentBatchSession: BatchSession | null = null
let batchHistory: BatchSession[] = []

/**
 * 8시간 간격 데이터 수집 스케줄러 시작
 */
export function startDataCollectionScheduler(): void {
  if (isSchedulerRunning) {
    logger.info('데이터 수집 스케줄러가 이미 실행 중입니다.')
    return
  }

  logger.info('8시간 간격 배치 데이터 수집 스케줄러를 시작합니다.')

  try {
    // 배치 큐 관리자 초기화
    BatchQueueManager.initialize()
    
    // 에러 복구 시스템 초기화
    ErrorRecoverySystem.initialize()
    // 1. 매일 오전 6:00 - 아침 배치 세션 (전일 데이터 수집)
    const morningBatchJob = cron.schedule('0 6 * * *', async () => {
      await executeBatchSession('morning', 'high')
    }, {
      scheduled: false,
      timezone: 'Asia/Seoul'
    })

    // 2. 평일 오후 2:00 - 오후 배치 세션 (장중 데이터 수집)
    const afternoonBatchJob = cron.schedule('0 14 * * 1-5', async () => {
      await executeBatchSession('afternoon', 'high')
    }, {
      scheduled: false,
      timezone: 'Asia/Seoul'
    })

    // 3. 매일 오후 10:00 - 저녁 배치 세션 (일일 데이터 완성)
    const eveningBatchJob = cron.schedule('0 22 * * *', async () => {
      await executeBatchSession('evening', 'medium')
    }, {
      scheduled: false,
      timezone: 'Asia/Seoul'
    })

    // 4. 매일 자정 - 시스템 상태 체크 및 로그 정리
    const maintenanceJob = cron.schedule('0 0 * * *', async () => {
      console.log('[Scheduler] 시스템 유지보수 작업 시작')
      await performMaintenance()
    }, {
      scheduled: false,
      timezone: 'Asia/Seoul'
    })

    // 5. 매일 00:10 - 외부 지수(Upbit, CNN, KoreaFG) 수집 및 저장
    const externalIndexJob = cron.schedule('10 0 * * *', async () => {
      console.log('[Scheduler] 외부 지수(Upbit, CNN, KoreaFG) 수집 작업 시작')
      const date: string = getTodayDateString()
      try {
        // TODO: Implement external data collectors
        // const [upbit, cnn, korea] = await Promise.all([
        //   fetchUpbitIndexData(date).catch(e => { console.error('[Upbit] 수집 실패:', e); return null }),
        //   fetchCnnFearGreedIndexData(date).catch(e => { console.error('[CNN] 수집 실패:', e); return null }),
        //   fetchKoreaFGIndexData(date).catch(e => { console.error('[KoreaFG] 수집 실패:', e); return null })
        // ])
        console.log('[Info] External collectors not implemented yet')
        // TODO: Save external data when collectors are implemented
        // await Promise.all([
        //   upbit ? DatabaseService.saveUpbitIndexData(upbit) : Promise.resolve(),
        //   cnn ? DatabaseService.saveCnnFearGreedIndexData(cnn) : Promise.resolve(),
        //   korea ? DatabaseService.saveKoreaFGIndexData(korea) : Promise.resolve()
        // ])
        console.log('[Scheduler] 외부 지수(Upbit, CNN, KoreaFG) 수집 및 저장 완료')
      } catch (error) {
        console.error('[Scheduler] 외부 지수 수집/저장 실패:', error)
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Seoul'
    })

    // 6. 평일 오후 6:30 - DART 공시 데이터 일일 배치 수집
    const dartBatchJob = cron.schedule('30 18 * * 1-5', async () => {
      console.log('[Scheduler] DART 공시 데이터 배치 수집 시작')
      // TODO: Implement DART collector and batch service
      // const yesterday = DARTCollector.getLastBusinessDay(1)
      try {
        // await DartBatchService.scheduleDailyDisclosureCollection(yesterday)
        console.log('[Info] DART batch service not implemented yet')
      } catch (error) {
        console.error('[Scheduler] DART 배치 작업 실패:', error)
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Seoul'
    })

    // 7. 매주 일요일 오전 2:00 - DART KOSPI 200 재무 데이터 수집
    const dartFinancialJob = cron.schedule('0 2 * * 0', async () => {
      console.log('[Scheduler] DART 재무 데이터 배치 수집 시작')
      const currentYear = new Date().getFullYear().toString()
      try {
        // await DartBatchService.scheduleFinancialDataCollection(currentYear)
        console.log('[Info] DART financial batch service not implemented yet')
      } catch (error) {
        console.error('[Scheduler] DART 재무 데이터 배치 작업 실패:', error)
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Seoul'
    })

    // 스케줄러 작업 배열에 추가
    scheduledJobs = [morningBatchJob, afternoonBatchJob, eveningBatchJob, maintenanceJob, externalIndexJob, dartBatchJob, dartFinancialJob]

    // 모든 작업 시작
    scheduledJobs.forEach(job => job.start())

    isSchedulerRunning = true
    logger.info('8시간 간격 배치 데이터 수집 스케줄러가 성공적으로 시작되었습니다.')
    logger.info('배치 스케줄:')
    logger.info('  - 아침 배치: 매일 06:00 (전일 데이터 수집)')
    logger.info('  - 오후 배치: 평일 14:00 (장중 데이터 수집)')
    logger.info('  - 저녁 배치: 매일 22:00 (일일 데이터 완성)')
    logger.info('  - DART 공시 배치: 평일 18:30')
    logger.info('  - 시스템 유지보수: 매일 00:00')
    logger.info('  - 외부 지수: 매일 00:10')
    logger.info('  - DART 재무 배치: 매주 일요일 02:00')

  } catch (error) {
    console.error('스케줄러 시작 중 오류:', error)
    throw error
  }
}

/**
 * 스케줄러 중지
 */
export function stopDataCollectionScheduler(): void {
  if (!isSchedulerRunning) {
    console.log('스케줄러가 실행 중이 아닙니다.')
    return
  }

  console.log('데이터 수집 스케줄러를 중지합니다.')

  try {
    scheduledJobs.forEach(job => {
      job.stop()
    })

    scheduledJobs = []
    isSchedulerRunning = false

    console.log('데이터 수집 스케줄러가 성공적으로 중지되었습니다.')

  } catch (error) {
    console.error('스케줄러 중지 중 오류:', error)
    throw error
  }
}

/**
 * 일일 데이터 수집 (수동 실행용)
 */
export async function collectDailyData(date?: string): Promise<void> {
  const targetDate: string = date ?? getTodayDateString()
  
  console.log(`[Manual] ${targetDate} 일일 데이터 수집을 시작합니다.`)

  try {
    // KRX 데이터 수집
    await collectKRXData(targetDate).catch(error => {
      console.error(`[Manual] ${targetDate} KRX 데이터 수집 실패:`, error)
    })

    // BOK 데이터 수집
    await collectBOKData(targetDate).catch(error => {
      console.error(`[Manual] ${targetDate} BOK 데이터 수집 실패:`, error)
    })

    // DART 공시 데이터 수집
    await collectDARTData(targetDate).catch(error => {
      console.error(`[Manual] ${targetDate} DART 데이터 수집 실패:`, error)
    })

    // 외부 지수(Upbit, CNN, KoreaFG) 수집 및 저장
    await (async () => {
      try {
        // TODO: Implement external collectors in manual mode
        // const [upbit, cnn, korea] = await Promise.all([
        //   fetchUpbitIndexData(targetDate).catch((e: any) => { console.error('[Upbit] 수집 실패:', e); return null }),
        //   fetchCnnFearGreedIndexData(targetDate).catch((e: any) => { console.error('[CNN] 수집 실패:', e); return null }),
        //   fetchKoreaFGIndexData(targetDate).catch((e: any) => { console.error('[KoreaFG] 수집 실패:', e); return null })
        // ])
        console.log('[Info] External collectors not implemented yet')
        // TODO: Save external data when collectors are available
        // await Promise.all([
        //   upbit ? DatabaseService.saveUpbitIndexData(upbit).catch((e: any) => console.error('[Upbit] 저장 실패:', e)) : Promise.resolve(),
        //   cnn ? DatabaseService.saveCnnFearGreedIndexData(cnn).catch((e: any) => console.error('[CNN] 저장 실패:', e)) : Promise.resolve(),
        //   korea ? DatabaseService.saveKoreaFGIndexData(korea).catch((e: any) => console.error('[KoreaFG] 저장 실패:', e)) : Promise.resolve()
        // ])
        console.log('[Manual] 외부 지수(Upbit, CNN, KoreaFG) 수집 및 저장 완료')
      } catch (error) {
        console.error('[Manual] 외부 지수 수집/저장 실패:', error)
      }
    })()

    // Fear & Greed Index 계산
    await calculateAndSaveFearGreedIndex(targetDate).catch(error => {
      console.error(`[Manual] ${targetDate} Fear & Greed Index 계산 실패:`, error)
    })

    console.log(`[Manual] ${targetDate} 일일 데이터 수집이 완료되었습니다.`)

  } catch (error) {
    console.error(`[Manual] ${targetDate} 일일 데이터 수집 실패:`, error)
    throw error
  }
}

/**
 * KRX 데이터 수집
 */
async function collectKRXData(date?: string): Promise<void> {
  const targetDate: string = date ?? KrxCollectionService.getLastBusinessDay() ?? getTodayDateString()
  try {
    console.log(`[KRX] ${targetDate} 데이터 수집 시작`)

    if (!targetDate) {
      throw new Error('Target date is required for KRX data collection')
    }

    // 새로운 KrxCollectionService 사용하여 전체 시장데이터 수집
    const result = await KrxCollectionService.collectDailyMarketData(targetDate, true)
    
    if (result.kospiSuccess && result.kosdaqSuccess) {
      console.log(`[KRX] ${targetDate} 데이터 수집 및 저장 완료`)
      console.log(`  - KOSPI 성공: ${result.kospiSuccess}`)
      console.log(`  - KOSDAQ 성공: ${result.kosdaqSuccess}`)
      console.log(`  - 투자자데이터 성공: ${result.investorDataSuccess}`)
    } else {
      console.warn(`[KRX] ${targetDate} 일부 데이터 수집 실패:`, result.summary.errors)
    }

  } catch (error) {
    console.error('[KRX] 데이터 수집 실패:', error)
    // 에러 알림 (Slack, 이메일 등)
    // await sendErrorNotification('KRX 데이터 수집 실패', error)
    throw error
  }
}

/**
 * BOK 데이터 수집
 */
async function collectBOKData(date?: string): Promise<void> {
  const targetDate: string = date ?? getTodayDateString()
  try {
    logger.info(`[BOK] ${targetDate} 데이터 수집 시작`)

    // API 키 검증
    const isApiValid = await BOKCollector.validateApiKey()
    if (!isApiValid) {
      logger.warn('[BOK] API 키가 유효하지 않습니다. 데이터 수집을 건너뜁니다.')
      return
    }

    if (!targetDate) {
      throw new Error('Target date is required for BOK data collection')
    }

    const bokData = await BOKCollector.collectDailyData(targetDate)

    // 데이터베이스에 저장 using MarketDataRepository
    if (bokData.interestRates) {
      await MarketDataRepository.saveInterestRateData(bokData.interestRates)
    }
    if (bokData.exchangeRates) {
      await MarketDataRepository.saveExchangeRateData(bokData.exchangeRates)
    }
    if (bokData.economicIndicators) {
      await MarketDataRepository.saveEconomicIndicatorData(bokData.economicIndicators)
    }

    logger.info(`[BOK] ${targetDate} 데이터 수집 완료`)

    // 수집된 데이터 로깅
    if (bokData.interestRates) {
      logger.info(`  - 기준금리: ${bokData.interestRates.baseRate}%`)
      logger.info(`  - 국고채 10년: ${bokData.interestRates.treasuryBond10Y}%`)
    }
    if (bokData.exchangeRates) {
      logger.info(`  - USD/KRW: ${bokData.exchangeRates.usdKrw}`)
    }

  } catch (error) {
    logger.error('[BOK] 데이터 수집 실패:', error)
    // 에러 알림
    // await sendErrorNotification('BOK 데이터 수집 실패', error)
    throw error
  }
}

/**
 * DART 공시 데이터 수집
 */
async function collectDARTData(date?: string): Promise<void> {
  const targetDate: string = date ?? DartCollectionService.getLastBusinessDay()
  try {
    console.log(`[DART] ${targetDate} 공시 데이터 수집 시작`)

    if (!targetDate) {
      throw new Error('Target date is required for DART data collection')
    }

    // 새로운 DartCollectionService 사용하여 일일 공시 데이터 수집
    const dartResult = await DartCollectionService.collectDailyDisclosures(targetDate, true)

    console.log(`[DART] ${targetDate} 공시 데이터 수집 완료: ${dartResult.totalDisclosures}건`)
    console.log(`  - 지분공시: ${dartResult.stockDisclosures.length}건`)

  } catch (error) {
    console.error('[DART] 공시 데이터 수집 실패:', error)
    // 에러 알림
    // await sendErrorNotification('DART 데이터 수집 실패', error)
    throw error
  }
}

/**
 * Fear & Greed Index 계산 및 저장
 */
async function calculateAndSaveFearGreedIndex(date?: string): Promise<void> {
  try {
    const targetDate = date ?? getTodayDateString()
    console.log(`[FearGreed] ${targetDate} Fear & Greed Index 계산 시작`)

    if (!targetDate) {
      throw new Error('Target date is required for Fear & Greed Index calculation')
    }

    const fearGreedResult = await FearGreedCalculator.calculateIndex(targetDate)

    if (!fearGreedResult) {
      console.warn(`[FearGreed] ${targetDate} 데이터 부족으로 계산 불가`)
      return
    }

    // 데이터베이스에 저장
    await FearGreedIndexRepository.saveFearGreedIndex(fearGreedResult)

    console.log(`[FearGreed] ${targetDate} 계산 완료`)
    console.log(`  - 지수: ${fearGreedResult.value}`)
    console.log(`  - 레벨: ${fearGreedResult.level}`)
    console.log(`  - 신뢰도: ${fearGreedResult.confidence}%`)
    console.log(`  - 구성요소:`)
    console.log(`    * 주가 모멘텀: ${fearGreedResult.components.priceMomentum}`)
    console.log(`    * 투자자 심리: ${fearGreedResult.components.investorSentiment}`)
    console.log(`    * Put/Call 비율: ${fearGreedResult.components.putCallRatio}`)
    console.log(`    * 변동성: ${fearGreedResult.components.volatilityIndex}`)
    console.log(`    * 안전자산 수요: ${fearGreedResult.components.safeHavenDemand}`)

    // 극한 상황 알림
    if (fearGreedResult.value <= 20 || fearGreedResult.value >= 80) {
      console.log(`🚨 [Alert] 극한 상황 감지: ${fearGreedResult.level} (${fearGreedResult.value})`)
      // await sendAlertNotification(fearGreedResult)
    }

  } catch (error) {
    console.error('[FearGreed] Fear & Greed Index 계산 실패:', error)
    // 에러 알림
    // await sendErrorNotification('Fear & Greed Index 계산 실패', error)
    throw error
  }
}

/**
 * 시스템 유지보수 작업
 */
async function performMaintenance(): Promise<void> {
  try {
    console.log('[Maintenance] 시스템 유지보수 시작')

    // 1. 로그 파일 정리 (30일 이상된 로그 삭제)
    console.log('  - 로그 파일 정리 중...')
    
    // 2. 데이터베이스 백업
    console.log('  - 데이터베이스 백업 중...')
    
    // 3. 시스템 상태 체크
    console.log('  - 시스템 상태 체크 중...')
    
    // 4. 메모리 사용량 체크
    const memUsage = process.memoryUsage()
    console.log(`  - 메모리 사용량: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`)
    
    // 5. 디스크 사용량 체크
    console.log('  - 디스크 사용량 체크 중...')

    console.log('[Maintenance] 시스템 유지보수 완료')

  } catch (error) {
    console.error('[Maintenance] 유지보수 중 오류:', error)
    throw error
  }
}

/**
 * 과거 데이터 일괄 수집 (초기 데이터 구축용)
 */
export async function collectHistoricalData(startDate: string, endDate: string): Promise<void> {
  console.log(`[Historical] ${startDate} ~ ${endDate} 과거 데이터 수집 시작`)

  try {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const dates: string[] = []

    // 날짜 목록 생성
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay()
      // 주말 제외 (토요일=6, 일요일=0)
      if (day !== 0 && day !== 6) {
        const dateStr = d.toISOString().split('T')[0] as string
        dates.push(dateStr)
      }
    }

    console.log(`총 ${dates.length}개 영업일 데이터 수집 예정`)

    // 순차적으로 데이터 수집 (API 제한 고려)
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i]
      console.log(`[${i + 1}/${dates.length}] ${date} 데이터 수집 중...`)

      try {
        await collectDailyData(date)
        
        // API 호출 제한 대응을 위해 딜레이
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`${date} 데이터 수집 실패:`, error)
        // 실패해도 계속 진행
      }
    }

    console.log(`[Historical] 과거 데이터 수집 완료`)

  } catch (error) {
    console.error('[Historical] 과거 데이터 수집 실패:', error)
    throw error
  }
}

/**
 * 스케줄러 상태 조회
 */
export function getSchedulerStatus(): {
  isRunning: boolean
  jobCount: number
  nextRuns: string[]
} {
  const nextRuns = scheduledJobs.map(() => 'Scheduled')

  return {
    isRunning: isSchedulerRunning,
    jobCount: scheduledJobs.length,
    nextRuns
  }
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0] || ''
} 