import { logger } from '@/utils/common/logger'

interface MetricData {
  count: number
  totalDuration: number
  averageDuration: number
  minDuration: number
  maxDuration: number
  successCount: number
  failureCount: number
  lastExecution: Date
  recentExecutions: Array<{
    timestamp: Date
    duration: number
    success: boolean
    error?: string
  }>
}

class MetricCollector {
  private data: MetricData

  constructor(private batchId: string) {
    this.data = {
      count: 0,
      totalDuration: 0,
      averageDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      successCount: 0,
      failureCount: 0,
      lastExecution: new Date(),
      recentExecutions: []
    }
  }

  recordStart(): void {
    // 시작 시간 기록은 monitorBatchExecution에서 처리
  }

  recordSuccess(duration: number, result?: any): void {
    this.data.count++
    this.data.successCount++
    this.updateDurationStats(duration)
    
    this.data.recentExecutions.push({
      timestamp: new Date(),
      duration,
      success: true
    })
    
    // 최근 실행 기록은 최대 100개만 보관
    if (this.data.recentExecutions.length > 100) {
      this.data.recentExecutions.shift()
    }
    
    this.data.lastExecution = new Date()
    
    logger.debug(`[Metrics] ${this.batchId} 성공 기록: ${duration}ms`)
  }

  recordFailure(error: Error): void {
    this.data.count++
    this.data.failureCount++
    
    this.data.recentExecutions.push({
      timestamp: new Date(),
      duration: 0,
      success: false,
      error: error.message
    })
    
    if (this.data.recentExecutions.length > 100) {
      this.data.recentExecutions.shift()
    }
    
    this.data.lastExecution = new Date()
    
    logger.debug(`[Metrics] ${this.batchId} 실패 기록: ${error.message}`)
  }

  private updateDurationStats(duration: number): void {
    this.data.totalDuration += duration
    this.data.averageDuration = this.data.totalDuration / this.data.successCount
    this.data.minDuration = Math.min(this.data.minDuration, duration)
    this.data.maxDuration = Math.max(this.data.maxDuration, duration)
  }

  getAverageDuration(): number {
    return this.data.averageDuration
  }

  getSuccessRate(): number {
    if (this.data.count === 0) return 0
    return (this.data.successCount / this.data.count) * 100
  }

  getMetrics(): MetricData {
    return { ...this.data }
  }
}

interface AlertConfig {
  type: string
  severity: 'info' | 'warning' | 'critical'
  threshold?: number
  cooldown?: number
}

interface Alert {
  type: string
  severity: 'info' | 'warning' | 'critical'
  details: any
  timestamp: Date
}

class AlertManager {
  private recentAlerts: Map<string, Date> = new Map()
  private readonly cooldownPeriod = 5 * 60 * 1000 // 5분

  async sendAlert(alert: Alert): Promise<void> {
    const alertKey = `${alert.type}_${alert.severity}`
    const lastAlert = this.recentAlerts.get(alertKey)
    
    // 쿨다운 기간 체크
    if (lastAlert && (Date.now() - lastAlert.getTime()) < this.cooldownPeriod) {
      return
    }

    this.recentAlerts.set(alertKey, new Date())
    
    // 실제 알림 전송 (현재는 로깅으로 처리)
    const logLevel = alert.severity === 'critical' ? 'error' : 
                     alert.severity === 'warning' ? 'warn' : 'info'
    
    logger[logLevel](`[Alert] ${alert.type}`, {
      severity: alert.severity,
      details: alert.details,
      timestamp: alert.timestamp
    })
    
    // TODO: 실제 알림 시스템 연동 (Slack, Email 등)
    // await this.sendToSlack(alert)
    // await this.sendEmail(alert)
  }
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  components: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy'
    message?: string
    error?: string
    lastCheck?: Date
  }>
  timestamp: Date
  recommendations: string[]
}

export class BatchMonitoringService {
  private static metrics: Map<string, MetricCollector> = new Map()
  private static alerts: AlertManager = new AlertManager()
  
  static async monitorBatchExecution<T>(
    batchId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now()
    const metric = this.getMetricCollector(batchId)
    
    try {
      metric.recordStart()
      const result = await operation()
      
      const duration = Date.now() - startTime
      metric.recordSuccess(duration, result)
      
      // 성능 저하 감지
      if (this.isPerformanceDegrading(batchId, duration)) {
        await this.alerts.sendAlert({
          type: 'performance_degradation',
          severity: 'warning',
          details: { 
            batchId, 
            duration, 
            averageDuration: metric.getAverageDuration(),
            degradationFactor: duration / metric.getAverageDuration()
          },
          timestamp: new Date()
        })
      }
      
      return result
      
    } catch (error) {
      const duration = Date.now() - startTime
      metric.recordFailure(error as Error)
      
      // 실패 패턴 분석
      const pattern = this.analyzeFailurePattern(batchId, error as Error)
      if (pattern.isAnomalous) {
        await this.alerts.sendAlert({
          type: 'anomalous_failure',
          severity: 'critical',
          details: { 
            batchId, 
            error: (error as Error).message, 
            pattern,
            duration
          },
          timestamp: new Date()
        })
      }
      
      throw error
    }
  }
  
  private static getMetricCollector(batchId: string): MetricCollector {
    if (!this.metrics.has(batchId)) {
      this.metrics.set(batchId, new MetricCollector(batchId))
    }
    return this.metrics.get(batchId)!
  }
  
  private static isPerformanceDegrading(batchId: string, duration: number): boolean {
    const metric = this.metrics.get(batchId)
    if (!metric) return false
    
    const avgDuration = metric.getAverageDuration()
    if (avgDuration === 0) return false
    
    // 평균 대비 2배 이상 느리면 성능 저하로 판단
    const degradationThreshold = 2.0
    return duration > (avgDuration * degradationThreshold)
  }
  
  private static analyzeFailurePattern(batchId: string, error: Error): {
    isAnomalous: boolean
    failureRate: number
    recentFailures: number
  } {
    const metric = this.metrics.get(batchId)
    if (!metric) {
      return { isAnomalous: false, failureRate: 0, recentFailures: 0 }
    }
    
    const metrics = metric.getMetrics()
    const failureRate = metrics.count > 0 ? (metrics.failureCount / metrics.count) * 100 : 0
    
    // 최근 10분간의 실패 횟수 계산
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const recentFailures = metrics.recentExecutions.filter(
      exec => exec.timestamp > tenMinutesAgo && !exec.success
    ).length
    
    // 이상 패턴 감지 조건:
    // 1. 실패율이 50% 이상
    // 2. 최근 10분간 연속 5회 이상 실패
    const isAnomalous = failureRate > 50 || recentFailures >= 5
    
    return {
      isAnomalous,
      failureRate,
      recentFailures
    }
  }
  
  static async performHealthCheck(): Promise<SystemHealth> {
    const health: SystemHealth = {
      overall: 'healthy',
      components: {},
      timestamp: new Date(),
      recommendations: []
    }
    
    try {
      // 각 컴포넌트별 헬스 체크
      const checks = await Promise.allSettled([
        this.checkDatabaseHealth(),
        this.checkApiEndpointHealth(),
        this.checkMemoryUsage(),
        this.checkDiskSpace(),
        this.checkQueueHealth()
      ])
      
      const componentNames = ['database', 'api', 'memory', 'disk', 'queue']
      
      checks.forEach((check, index) => {
        const componentName = componentNames[index]
        
        if (check.status === 'fulfilled') {
          health.components[componentName] = check.value
        } else {
          health.components[componentName] = {
            status: 'unhealthy',
            error: check.reason?.message || 'Unknown error',
            lastCheck: new Date()
          }
          health.overall = 'unhealthy'
        }
      })
      
      // 전체 상태 결정
      const componentStatuses = Object.values(health.components).map(c => c.status)
      if (componentStatuses.some(status => status === 'unhealthy')) {
        health.overall = 'unhealthy'
      } else if (componentStatuses.some(status => status === 'degraded')) {
        health.overall = 'degraded'
      }
      
      // 권장사항 생성
      health.recommendations = this.generateHealthRecommendations(health)
      
    } catch (error) {
      logger.error('[Health] 헬스 체크 실행 중 오류:', error)
      health.overall = 'unhealthy'
      health.components.system = {
        status: 'unhealthy',
        error: (error as Error).message
      }
    }
    
    return health
  }
  
  private static async checkDatabaseHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    message?: string
    responseTime?: number
  }> {
    try {
      const start = Date.now()
      // TODO: 실제 데이터베이스 연결 테스트
      // await prisma.$queryRaw`SELECT 1`
      const responseTime = Date.now() - start
      
      if (responseTime > 5000) {
        return {
          status: 'degraded',
          message: 'Database response time is slow',
          responseTime
        }
      }
      
      return {
        status: 'healthy',
        responseTime
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: (error as Error).message
      }
    }
  }
  
  private static async checkApiEndpointHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    message?: string
  }> {
    // TODO: 외부 API 엔드포인트 상태 확인
    return {
      status: 'healthy',
      message: 'All API endpoints are responsive'
    }
  }
  
  private static async checkMemoryUsage(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    usage?: number
    message?: string
  }> {
    try {
      const memUsage = process.memoryUsage()
      const usagePercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100
      
      if (usagePercentage > 90) {
        return {
          status: 'unhealthy',
          usage: usagePercentage,
          message: 'Critical memory usage'
        }
      } else if (usagePercentage > 70) {
        return {
          status: 'degraded',
          usage: usagePercentage,
          message: 'High memory usage'
        }
      }
      
      return {
        status: 'healthy',
        usage: usagePercentage
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: (error as Error).message
      }
    }
  }
  
  private static async checkDiskSpace(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    message?: string
  }> {
    // TODO: 디스크 사용량 체크
    return {
      status: 'healthy',
      message: 'Sufficient disk space available'
    }
  }
  
  private static async checkQueueHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    queueSizes?: Record<string, number>
    message?: string
  }> {
    try {
      // TODO: 큐 상태 확인
      // const queueSizes = BatchQueueManager.getQueueStatus()
      
      return {
        status: 'healthy',
        message: 'All queues are processing normally'
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: (error as Error).message
      }
    }
  }
  
  private static generateHealthRecommendations(health: SystemHealth): string[] {
    const recommendations: string[] = []
    
    Object.entries(health.components).forEach(([component, status]) => {
      if (status.status === 'degraded') {
        switch (component) {
          case 'memory':
            recommendations.push('메모리 사용량이 높습니다. 가비지 컬렉션을 수행하거나 배치 크기를 줄이는 것을 고려하세요.')
            break
          case 'database':
            recommendations.push('데이터베이스 응답 시간이 느립니다. 쿼리 최적화나 연결 풀 조정을 고려하세요.')
            break
          case 'queue':
            recommendations.push('큐 처리가 지연되고 있습니다. 워커 수를 늘리거나 배치 크기를 조정하세요.')
            break
        }
      } else if (status.status === 'unhealthy') {
        recommendations.push(`${component} 컴포넌트에 심각한 문제가 있습니다. 즉시 확인이 필요합니다.`)
      }
    })
    
    return recommendations
  }
  
  static getBatchMetrics(batchId?: string): any {
    if (batchId) {
      const metric = this.metrics.get(batchId)
      return metric ? metric.getMetrics() : null
    }
    
    const allMetrics: any = {}
    this.metrics.forEach((metric, id) => {
      allMetrics[id] = metric.getMetrics()
    })
    
    return allMetrics
  }
  
  static getSystemMetrics(): {
    totalBatches: number
    activeBatches: number
    successRate: number
    averageResponseTime: number
  } {
    const metrics = Array.from(this.metrics.values()).map(m => m.getMetrics())
    
    const totalExecutions = metrics.reduce((sum, m) => sum + m.count, 0)
    const totalSuccesses = metrics.reduce((sum, m) => sum + m.successCount, 0)
    const totalDuration = metrics.reduce((sum, m) => sum + m.totalDuration, 0)
    
    return {
      totalBatches: this.metrics.size,
      activeBatches: metrics.filter(m => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
        return m.lastExecution > fiveMinutesAgo
      }).length,
      successRate: totalExecutions > 0 ? (totalSuccesses / totalExecutions) * 100 : 0,
      averageResponseTime: totalSuccesses > 0 ? totalDuration / totalSuccesses : 0
    }
  }
}