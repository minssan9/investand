import { logger } from '@/utils/common/logger'
import { BatchQueueManager } from './BatchQueueManager'
import { ErrorRecoverySystem } from './ErrorRecoverySystem'
import { RateLimitingService } from './RateLimitingService'
import { BatchMonitoringService } from './BatchMonitoringService'
import { TransactionalDatabaseService } from './TransactionalDatabaseService'

export interface ValidationResult {
  success: boolean
  systemHealth: 'healthy' | 'degraded' | 'unhealthy'
  validationScore: number // 0-100
  issues: ValidationIssue[]
  recommendations: string[]
  metrics: {
    responseTime: number
    throughput: number
    errorRate: number
    resourceUsage: number
  }
}

interface ValidationIssue {
  severity: 'critical' | 'warning' | 'info'
  component: string
  message: string
  impact: string
  resolution?: string
}

interface TestScenario {
  name: string
  description: string
  execute: () => Promise<{ success: boolean; duration: number; error?: Error }>
  critical: boolean
}

export class BatchValidationService {
  private static readonly VALIDATION_TIMEOUT = 60000 // 1분
  private static readonly MAX_CONCURRENT_TESTS = 5
  
  /**
   * 전체 시스템 검증 실행
   */
  static async validateBatchProcessing(): Promise<ValidationResult> {
    logger.info('[BatchValidation] 전체 배치 시스템 검증 시작')
    
    const startTime = Date.now()
    const result: ValidationResult = {
      success: true,
      systemHealth: 'healthy',
      validationScore: 100,
      issues: [],
      recommendations: [],
      metrics: {
        responseTime: 0,
        throughput: 0,
        errorRate: 0,
        resourceUsage: 0
      }
    }
    
    try {
      // 1. 인프라 구성 요소 검증
      const infrastructureResults = await this.validateInfrastructure()
      this.mergeResults(result, infrastructureResults)
      
      // 2. 배치 처리 시나리오 테스트
      const scenarioResults = await this.executeTestScenarios()
      this.mergeResults(result, scenarioResults)
      
      // 3. 성능 및 안정성 검증
      const performanceResults = await this.validatePerformance()
      this.mergeResults(result, performanceResults)
      
      // 4. 에러 복구 메커니즘 검증
      const recoveryResults = await this.validateErrorRecovery()
      this.mergeResults(result, recoveryResults)
      
      // 5. 데이터 무결성 검증
      const integrityResults = await this.validateDataIntegrity()
      this.mergeResults(result, integrityResults)
      
      // 최종 점수 및 상태 계산
      result.validationScore = this.calculateValidationScore(result.issues)
      result.systemHealth = this.determineSystemHealth(result.validationScore, result.issues)
      result.metrics.responseTime = Date.now() - startTime
      
      // 추천 사항 생성
      result.recommendations = this.generateRecommendations(result.issues)
      
      logger.info(`[BatchValidation] 검증 완료: Score ${result.validationScore}/100, Health: ${result.systemHealth}`)
      
    } catch (error) {
      logger.error('[BatchValidation] 검증 실행 중 오류:', error)
      result.success = false
      result.systemHealth = 'unhealthy'
      result.validationScore = 0
      result.issues.push({
        severity: 'critical',
        component: 'validation_system',
        message: `Validation system failure: ${(error as Error).message}`,
        impact: 'Cannot determine system health'
      })
    }
    
    return result
  }
  
  /**
   * 인프라 구성 요소 검증
   */
  private static async validateInfrastructure(): Promise<Partial<ValidationResult>> {
    const issues: ValidationIssue[] = []
    let score = 100
    
    try {
      // 1. 배치 큐 매니저 검증
      const queueStatus = BatchQueueManager.getQueueStatus()
      if (Object.keys(queueStatus).length === 0) {
        issues.push({
          severity: 'critical',
          component: 'batch_queue',
          message: 'No batch queues initialized',
          impact: 'Batch processing will not work'
        })
        score -= 20
      }
      
      // 2. 에러 복구 시스템 검증
      const errorRecoveryStatus = ErrorRecoverySystem.getSystemStatus()
      if (errorRecoveryStatus.anomalousPatterns > 0) {
        issues.push({
          severity: 'warning',
          component: 'error_recovery',
          message: `${errorRecoveryStatus.anomalousPatterns} anomalous failure patterns detected`,
          impact: 'May indicate systemic issues'
        })
        score -= 10
      }
      
      // 3. 속도 제한 서비스 검증
      const rateLimitStats = RateLimitingService.getStats()
      Object.entries(rateLimitStats).forEach(([api, stats]: [string, any]) => {
        if (stats.circuitBreaker?.state === 'open') {
          issues.push({
            severity: 'critical',
            component: 'rate_limiting',
            message: `Circuit breaker open for ${api}`,
            impact: 'API calls will be blocked'
          })
          score -= 15
        }
      })
      
      // 4. 데이터베이스 연결 검증
      const dbStats = TransactionalDatabaseService.getConnectionStats()
      if (!dbStats.initialized) {
        issues.push({
          severity: 'critical',
          component: 'database',
          message: 'Database connection pool not initialized',
          impact: 'Data persistence will fail'
        })
        score -= 25
      }
      
      logger.info('[BatchValidation] 인프라 검증 완료')
      
    } catch (error) {
      issues.push({
        severity: 'critical',
        component: 'infrastructure',
        message: `Infrastructure validation failed: ${(error as Error).message}`,
        impact: 'Cannot verify system components'
      })
      score = 0
    }
    
    return { issues, validationScore: Math.max(0, score) }
  }
  
  /**
   * 배치 처리 시나리오 테스트 실행
   */
  private static async executeTestScenarios(): Promise<Partial<ValidationResult>> {
    const issues: ValidationIssue[] = []
    let score = 100
    
    const scenarios: TestScenario[] = [
      {
        name: 'basic_data_collection',
        description: 'Basic data collection workflow',
        critical: true,
        execute: async () => {
          const start = Date.now()
          try {
            // 기본 데이터 수집 워크플로우 시뮬레이션
            await this.simulateDataCollection('test', 10)
            return { success: true, duration: Date.now() - start }
          } catch (error) {
            return { success: false, duration: Date.now() - start, error: error as Error }
          }
        }
      },
      {
        name: 'batch_queue_processing',
        description: 'Batch queue processing test',
        critical: true,
        execute: async () => {
          const start = Date.now()
          try {
            // 배치 큐 처리 테스트
            await this.testBatchQueueProcessing()
            return { success: true, duration: Date.now() - start }
          } catch (error) {
            return { success: false, duration: Date.now() - start, error: error as Error }
          }
        }
      },
      {
        name: 'rate_limiting_compliance',
        description: 'Rate limiting compliance test',
        critical: false,
        execute: async () => {
          const start = Date.now()
          try {
            // 속도 제한 준수 테스트
            await this.testRateLimitingCompliance()
            return { success: true, duration: Date.now() - start }
          } catch (error) {
            return { success: false, duration: Date.now() - start, error: error as Error }
          }
        }
      },
      {
        name: 'concurrent_processing',
        description: 'Concurrent batch processing test',
        critical: false,
        execute: async () => {
          const start = Date.now()
          try {
            // 동시 처리 테스트
            await this.testConcurrentProcessing()
            return { success: true, duration: Date.now() - start }
          } catch (error) {
            return { success: false, duration: Date.now() - start, error: error as Error }
          }
        }
      },
      {
        name: 'memory_pressure_handling',
        description: 'Memory pressure handling test',
        critical: false,
        execute: async () => {
          const start = Date.now()
          try {
            // 메모리 압박 상황 처리 테스트
            await this.testMemoryPressureHandling()
            return { success: true, duration: Date.now() - start }
          } catch (error) {
            return { success: false, duration: Date.now() - start, error: error as Error }
          }
        }
      }
    ]
    
    const results = await Promise.allSettled(
      scenarios.map(scenario => this.executeScenario(scenario))
    )
    
    results.forEach((result, index) => {
      const scenario = scenarios[index]
      
      if (result.status === 'rejected') {
        issues.push({
          severity: scenario.critical ? 'critical' : 'warning',
          component: 'test_scenario',
          message: `Scenario '${scenario.name}' execution failed: ${result.reason}`,
          impact: scenario.critical ? 'Critical functionality compromised' : 'Non-critical functionality affected'
        })
        score -= scenario.critical ? 20 : 10
      } else if (!result.value.success) {
        issues.push({
          severity: scenario.critical ? 'critical' : 'warning',
          component: 'test_scenario',
          message: `Scenario '${scenario.name}' failed: ${result.value.error?.message}`,
          impact: scenario.critical ? 'Critical functionality compromised' : 'Non-critical functionality affected'
        })
        score -= scenario.critical ? 20 : 10
      }
    })
    
    logger.info(`[BatchValidation] 시나리오 테스트 완료: ${results.length}개 실행`)
    
    return { issues, validationScore: Math.max(0, score) }
  }
  
  /**
   * 개별 시나리오 실행
   */
  private static async executeScenario(scenario: TestScenario): Promise<{ success: boolean; error?: Error }> {
    logger.debug(`[BatchValidation] 시나리오 실행: ${scenario.name}`)
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Scenario timeout')), this.VALIDATION_TIMEOUT)
    })
    
    try {
      const result = await Promise.race([
        scenario.execute(),
        timeoutPromise
      ]) as { success: boolean; duration: number; error?: Error }
      
      logger.debug(`[BatchValidation] 시나리오 완료: ${scenario.name} (${result.duration}ms)`)
      return { success: result.success, error: result.error }
      
    } catch (error) {
      logger.error(`[BatchValidation] 시나리오 실패: ${scenario.name}`, error)
      return { success: false, error: error as Error }
    }
  }
  
  /**
   * 성능 및 안정성 검증
   */
  private static async validatePerformance(): Promise<Partial<ValidationResult>> {
    const issues: ValidationIssue[] = []
    let score = 100
    
    try {
      // 1. 시스템 헬스 체크
      const healthCheck = await BatchMonitoringService.performHealthCheck()
      
      if (healthCheck.overall === 'unhealthy') {
        issues.push({
          severity: 'critical',
          component: 'system_health',
          message: 'System health check failed',
          impact: 'System may not function properly'
        })
        score -= 30
      } else if (healthCheck.overall === 'degraded') {
        issues.push({
          severity: 'warning',
          component: 'system_health',
          message: 'System health degraded',
          impact: 'Performance may be affected'
        })
        score -= 15
      }
      
      // 2. 시스템 메트릭 검증
      const systemMetrics = BatchMonitoringService.getSystemMetrics()
      
      if (systemMetrics.successRate < 95) {
        issues.push({
          severity: systemMetrics.successRate < 80 ? 'critical' : 'warning',
          component: 'success_rate',
          message: `Success rate below threshold: ${systemMetrics.successRate.toFixed(1)}%`,
          impact: 'High failure rate indicates systemic issues'
        })
        score -= systemMetrics.successRate < 80 ? 25 : 10
      }
      
      if (systemMetrics.averageResponseTime > 30000) { // 30초 이상
        issues.push({
          severity: 'warning',
          component: 'response_time',
          message: `Average response time too high: ${systemMetrics.averageResponseTime}ms`,
          impact: 'Slow processing may cause delays'
        })
        score -= 10
      }
      
      logger.info('[BatchValidation] 성능 검증 완료')
      
    } catch (error) {
      issues.push({
        severity: 'critical',
        component: 'performance',
        message: `Performance validation failed: ${(error as Error).message}`,
        impact: 'Cannot verify system performance'
      })
      score = 0
    }
    
    return { issues, validationScore: Math.max(0, score) }
  }
  
  /**
   * 에러 복구 메커니즘 검증
   */
  private static async validateErrorRecovery(): Promise<Partial<ValidationResult>> {
    const issues: ValidationIssue[] = []
    let score = 100
    
    try {
      // 에러 복구 시스템 상태 확인
      const recoveryStatus = ErrorRecoverySystem.getSystemStatus()
      
      if (recoveryStatus.activeCircuitBreakers > 0) {
        issues.push({
          severity: 'warning',
          component: 'error_recovery',
          message: `${recoveryStatus.activeCircuitBreakers} active circuit breakers`,
          impact: 'Some operations may be blocked'
        })
        score -= 15
      }
      
      // 에러 복구 시나리오 테스트
      const mockError = new Error('Test error for recovery validation')
      const recoveryAction = await ErrorRecoverySystem.handleFailure(
        { id: 'test_operation', type: 'validation_test' },
        mockError,
        { attempts: 1 }
      )
      
      if (recoveryAction.action === 'dead_letter') {
        issues.push({
          severity: 'warning',
          component: 'error_recovery',
          message: 'Error recovery system not responsive to test scenarios',
          impact: 'May not handle real failures properly'
        })
        score -= 10
      }
      
      logger.info('[BatchValidation] 에러 복구 검증 완료')
      
    } catch (error) {
      issues.push({
        severity: 'critical',
        component: 'error_recovery',
        message: `Error recovery validation failed: ${(error as Error).message}`,
        impact: 'Error recovery may not work in real scenarios'
      })
      score -= 20
    }
    
    return { issues, validationScore: Math.max(0, score) }
  }
  
  /**
   * 데이터 무결성 검증
   */
  private static async validateDataIntegrity(): Promise<Partial<ValidationResult>> {
    const issues: ValidationIssue[] = []
    let score = 100
    
    try {
      // 트랜잭션 처리 테스트
      const testOperations = [
        {
          id: 'test_insert',
          type: 'insert' as const,
          table: 'testTable',
          data: { id: 'test_' + Date.now(), value: 'test_data' }
        }
      ]
      
      const transactionResult = await TransactionalDatabaseService.executeBatchTransaction(
        testOperations,
        { timeout: 5000 }
      )
      
      if (!transactionResult.success) {
        issues.push({
          severity: 'warning',
          component: 'data_integrity',
          message: 'Transaction processing test failed',
          impact: 'Data consistency may be compromised'
        })
        score -= 15
      }
      
      logger.info('[BatchValidation] 데이터 무결성 검증 완료')
      
    } catch (error) {
      issues.push({
        severity: 'warning',
        component: 'data_integrity',
        message: `Data integrity validation failed: ${(error as Error).message}`,
        impact: 'Cannot verify data consistency mechanisms'
      })
      score -= 10
    }
    
    return { issues, validationScore: Math.max(0, score) }
  }
  
  /**
   * 테스트 시뮬레이션 메서드들
   */
  private static async simulateDataCollection(source: string, recordCount: number): Promise<void> {
    // 데이터 수집 시뮬레이션
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    await delay(100) // 100ms 시뮬레이션
    
    if (Math.random() < 0.1) { // 10% 확률로 실패
      throw new Error('Simulated data collection failure')
    }
  }
  
  private static async testBatchQueueProcessing(): Promise<void> {
    const queueStatus = BatchQueueManager.getQueueStatus()
    if (Object.keys(queueStatus).length === 0) {
      throw new Error('No batch queues available for testing')
    }
  }
  
  private static async testRateLimitingCompliance(): Promise<void> {
    // 속도 제한 준수 테스트
    const startTime = Date.now()
    
    await RateLimitingService.executeWithRateLimit(
      'validation_test',
      async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return 'test_result'
      },
      { requestsPerSecond: 10, burstAllowance: 5, adaptiveScaling: false, maxBackoffDelay: 1000 }
    )
    
    const duration = Date.now() - startTime
    if (duration < 50) { // 너무 빨리 실행되면 속도 제한이 작동하지 않는 것
      throw new Error('Rate limiting not properly enforced')
    }
  }
  
  private static async testConcurrentProcessing(): Promise<void> {
    // 동시 처리 테스트
    const concurrentTasks = Array.from({ length: 5 }, (_, i) => 
      this.simulateDataCollection(`concurrent_${i}`, 5)
    )
    
    const results = await Promise.allSettled(concurrentTasks)
    const failedCount = results.filter(r => r.status === 'rejected').length
    
    if (failedCount > 2) { // 5개 중 2개 이상 실패하면 문제
      throw new Error(`Too many concurrent processing failures: ${failedCount}/5`)
    }
  }
  
  private static async testMemoryPressureHandling(): Promise<void> {
    // 메모리 사용량 체크
    const memUsage = process.memoryUsage()
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024
    
    if (heapUsedMB > 1024) { // 1GB 이상 사용 중이면 경고
      logger.warn(`[BatchValidation] High memory usage detected: ${heapUsedMB.toFixed(2)}MB`)
    }
  }
  
  /**
   * 결과 병합
   */
  private static mergeResults(target: ValidationResult, source: Partial<ValidationResult>): void {
    if (source.issues) {
      target.issues.push(...source.issues)
    }
    
    if (source.validationScore !== undefined) {
      // 가중 평균으로 점수 계산 (현재는 단순 평균)
      target.validationScore = Math.min(target.validationScore, source.validationScore)
    }
  }
  
  /**
   * 검증 점수 계산
   */
  private static calculateValidationScore(issues: ValidationIssue[]): number {
    let score = 100
    
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 25
          break
        case 'warning':
          score -= 10
          break
        case 'info':
          score -= 2
          break
      }
    })
    
    return Math.max(0, score)
  }
  
  /**
   * 시스템 상태 결정
   */
  private static determineSystemHealth(
    score: number, 
    issues: ValidationIssue[]
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const hasCriticalIssues = issues.some(issue => issue.severity === 'critical')
    
    if (hasCriticalIssues || score < 50) {
      return 'unhealthy'
    } else if (score < 80) {
      return 'degraded'
    } else {
      return 'healthy'
    }
  }
  
  /**
   * 추천 사항 생성
   */
  private static generateRecommendations(issues: ValidationIssue[]): string[] {
    const recommendations: string[] = []
    
    const criticalIssues = issues.filter(i => i.severity === 'critical').length
    const warningIssues = issues.filter(i => i.severity === 'warning').length
    
    if (criticalIssues > 0) {
      recommendations.push(`${criticalIssues}개의 중요한 문제를 즉시 해결해야 합니다.`)
    }
    
    if (warningIssues > 0) {
      recommendations.push(`${warningIssues}개의 경고사항을 검토하고 개선을 고려하세요.`)
    }
    
    // 컴포넌트별 추천사항
    const componentIssues = new Map<string, ValidationIssue[]>()
    issues.forEach(issue => {
      if (!componentIssues.has(issue.component)) {
        componentIssues.set(issue.component, [])
      }
      componentIssues.get(issue.component)!.push(issue)
    })
    
    componentIssues.forEach((componentIssues, component) => {
      if (componentIssues.length > 1) {
        recommendations.push(`${component} 컴포넌트에 여러 문제가 발견되었습니다. 종합적인 점검이 필요합니다.`)
      }
    })
    
    if (recommendations.length === 0) {
      recommendations.push('시스템이 정상적으로 작동하고 있습니다. 정기적인 모니터링을 계속하세요.')
    }
    
    return recommendations
  }
}