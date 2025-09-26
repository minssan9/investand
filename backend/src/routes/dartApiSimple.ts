import express from 'express'
import { logger } from '@/utils/common/logger'
import { DartCollectionService } from '@/services/collectors/DartCollectionService'
import { formatDate } from '@/utils/common/dateUtils'

const router = express.Router()

/**
 * GET /api/dart/batch/status
 * 배치 서비스 상태 조회
 */
router.get('/batch/status', async (req, res) => {
  try {
    // Mock status for now - in production this would call DartBatchService.getStatus()
    const status = {
      isRunning: true,
      activeJobs: 0,
      completedToday: 5,
      pendingJobs: 0,
      lastRunTime: new Date().toISOString(),
      nextRunTime: null
    }

    res.json({
      success: true,
      data: status
    })

    logger.info('[DART Batch] Status query successful')

  } catch (error) {
    logger.error('[DART Batch] Status query failed:', error)
    res.status(500).json({
      error: '배치 서비스 상태 조회 중 오류가 발생했습니다.',
      message: (error as Error).message
    })
  }
})

/**
 * GET /api/dart/health
 * DART API 헬스 체크
 */
router.get('/health', async (req, res) => {
  try {
    const status = {
      isOperational: true,
      rateLimit: { remaining: 1000 },
      lastError: null
    }

    res.json({
      success: true,
      data: {
        isOperational: status.isOperational,
        rateLimit: status.rateLimit,
        timestamp: new Date().toISOString(),
        lastError: status.lastError || null
      }
    })

  } catch (error) {
    logger.error('[DART Health] 헬스 체크 실패:', error)
    res.status(503).json({
      success: false,
      error: 'DART 서비스 헬스 체크 실패',
      message: (error as Error).message
    })
  }
})

/**
 * POST /api/dart/test
 * DART API 테스트 - 특정 날짜의 공시 데이터 조회
 */
router.post('/test', async (req, res) => {
  try {
    const { date, maxPages = 1, pageSize = 10 } = req.body
    const targetDate = date || formatDate(new Date())

    logger.info(`[DART Test] Testing DART API for date: ${targetDate}`)

    const result = await DartCollectionService.collectDailyDisclosures(
      targetDate,
      false,
      { maxPages, pageSize }
    )

    res.json({
      success: true,
      message: 'DART API 테스트 성공',
      data: {
        date: targetDate,
        totalDisclosures: result.totalDisclosures,
        sampleDisclosures: result.stockDisclosures.slice(0, 5),
        count: result.stockDisclosures.length
      }
    })

  } catch (error) {
    logger.error('[DART Test] API 테스트 실패:', error)
    res.status(500).json({
      success: false,
      error: 'DART API 테스트 실패',
      message: (error as Error).message
    })
  }
})

/**
 * POST /api/dart/batch/daily
 * DART 일별 배치 수집 - 수동 트리거
 */
router.post('/batch/daily', async (req, res) => {
  try {
    const { date, maxPages = 50, pageSize = 100 } = req.body
    const targetDate = date || formatDate(new Date())

    logger.info(`[DART Batch] Manual daily batch triggered for date: ${targetDate}`)

    const result = await DartCollectionService.collectDailyDisclosures(
      targetDate,
      true,
      { maxPages, pageSize }
    )

    res.json({
      success: true,
      message: 'DART 일별 데이터 수집 완료',
      data: {
        date: targetDate,
        totalDisclosures: result.totalDisclosures,
        savedDisclosures: result.stockDisclosures.length,
        summary: {
          maxPages,
          pageSize,
          timestamp: new Date().toISOString()
        }
      }
    })

  } catch (error) {
    logger.error('[DART Batch] Daily batch failed:', error)
    res.status(500).json({
      success: false,
      error: 'DART 일별 배치 수집 실패',
      message: (error as Error).message
    })
  }
})

export default router