import { Request, Response, NextFunction } from 'express'
import { performance } from 'perf_hooks'
import { MonitoringService } from '../services/infrastructure/monitoringService'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface PerformanceMetrics {
  endpoint: string
  method: string
  statusCode: number
  responseTime: number
  timestamp: Date
  userAgent?: string
  ip: string
  contentLength?: number
  memoryUsage: NodeJS.MemoryUsage
  isError: boolean
}

export interface EndpointStats {
  endpoint: string
  totalRequests: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  errorCount: number
  errorRate: number
  p95ResponseTime: number
  p99ResponseTime: number
  requestsPerSecond: number
  lastRequestTime: Date
}

// ============================================================================
// PERFORMANCE MONITORING MIDDLEWARE
// ============================================================================

export class PerformanceMonitoringMiddleware {
  private static instance: PerformanceMonitoringMiddleware
  private metrics: PerformanceMetrics[] = []
  private endpointStats = new Map<string, EndpointStats>()
  private responseTimes = new Map<string, number[]>()
  private monitoringService: MonitoringService

  constructor() {
    this.monitoringService = new MonitoringService()
  }

  static getInstance(): PerformanceMonitoringMiddleware {
    if (!PerformanceMonitoringMiddleware.instance) {
      PerformanceMonitoringMiddleware.instance = new PerformanceMonitoringMiddleware()
    }
    return PerformanceMonitoringMiddleware.instance
  }

  // ============================================================================
  // MIDDLEWARE FUNCTION
  // ============================================================================

  trackPerformance() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now()
      const startMemory = process.memoryUsage()
      
      // Capture original methods
      const originalSend = res.send
      const originalJson = res.json
      const originalEnd = res.end

      // Track when response is sent
      const trackResponse = (body?: any) => {
        const endTime = performance.now()
        const responseTime = Math.round(endTime - startTime)
        const endMemory = process.memoryUsage()
        
        // Create endpoint identifier
        const endpoint = this.normalizeEndpoint(req.route?.path || req.path, req.method)
        const isError = res.statusCode >= 400
        
        // Create performance metrics
        const userAgent = req.get('User-Agent')
        const contentLength = body ? Buffer.byteLength(JSON.stringify(body)) : undefined
        
        const metrics: PerformanceMetrics = {
          endpoint,
          method: req.method,
          statusCode: res.statusCode,
          responseTime,
          timestamp: new Date(),
          userAgent: userAgent,
          ip: req.ip || req.connection.remoteAddress || 'unknown',
          contentLength: contentLength,
          memoryUsage: {
            rss: endMemory.rss - startMemory.rss,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal,
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            external: endMemory.external - startMemory.external,
            arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
          },
          isError
        }
        
        // Store metrics
        this.addMetrics(metrics)
        
        // Update monitoring service
        this.monitoringService.trackApiRequest(endpoint, responseTime, isError)
        
        // Update endpoint statistics
        this.updateEndpointStats(endpoint, responseTime, isError)
      }

      // Override response methods
      res.send = function(body: any) {
        trackResponse(body)
        return originalSend.call(this, body)
      }

      res.json = function(body: any) {
        trackResponse(body)
        return originalJson.call(this, body)
      }

      res.end = function(chunk?: any, encoding?: any) {
        if (!res.headersSent) {
          trackResponse(chunk)
        }
        return originalEnd.call(this, chunk, encoding)
      }

      next()
    }
  }

  // ============================================================================
  // METRICS COLLECTION AND ANALYSIS
  // ============================================================================

  private normalizeEndpoint(path: string, method: string): string {
    // Normalize dynamic parameters in paths
    const normalizedPath = path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}/gi, '/:uuid')
      .replace(/\/\d{4}-\d{2}-\d{2}/g, '/:date')
    
    return `${method} ${normalizedPath}`
  }

  private addMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics)
    
    // Keep only last 10000 metrics to prevent memory issues
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-5000) // Keep last 5000
    }
  }

  private updateEndpointStats(endpoint: string, responseTime: number, isError: boolean): void {
    if (!this.endpointStats.has(endpoint)) {
      this.endpointStats.set(endpoint, {
        endpoint,
        totalRequests: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        errorCount: 0,
        errorRate: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestsPerSecond: 0,
        lastRequestTime: new Date()
      })
    }

    const stats = this.endpointStats.get(endpoint)!
    stats.totalRequests++
    stats.lastRequestTime = new Date()
    
    // Update response time statistics
    stats.minResponseTime = Math.min(stats.minResponseTime, responseTime)
    stats.maxResponseTime = Math.max(stats.maxResponseTime, responseTime)
    stats.averageResponseTime = ((stats.averageResponseTime * (stats.totalRequests - 1)) + responseTime) / stats.totalRequests
    
    // Update error statistics
    if (isError) {
      stats.errorCount++
    }
    stats.errorRate = (stats.errorCount / stats.totalRequests) * 100
    
    // Store response times for percentile calculations
    if (!this.responseTimes.has(endpoint)) {
      this.responseTimes.set(endpoint, [])
    }
    const times = this.responseTimes.get(endpoint)!
    times.push(responseTime)
    
    // Keep only last 1000 response times per endpoint
    if (times.length > 1000) {
      times.splice(0, times.length - 1000)
    }
    
    // Calculate percentiles
    const sortedTimes = [...times].sort((a, b) => a - b)
    stats.p95ResponseTime = this.calculatePercentile(sortedTimes, 95)
    stats.p99ResponseTime = this.calculatePercentile(sortedTimes, 99)
    
    // Calculate requests per second (based on last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    const recentMetrics = this.metrics.filter(m => 
      m.endpoint === endpoint && m.timestamp.getTime() > oneHourAgo
    )
    stats.requestsPerSecond = recentMetrics.length / 3600 // requests per second over last hour
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1
    const safeIndex = Math.max(0, Math.min(index, sortedArray.length - 1))
    return sortedArray[safeIndex] ?? 0
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  getMetrics(hours: number = 1): PerformanceMetrics[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)
    return this.metrics.filter(m => m.timestamp.getTime() > cutoff)
  }

  getEndpointStats(): EndpointStats[] {
    return Array.from(this.endpointStats.values())
      .sort((a, b) => b.totalRequests - a.totalRequests)
  }

  getSlowestEndpoints(limit: number = 10): EndpointStats[] {
    return Array.from(this.endpointStats.values())
      .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
      .slice(0, limit)
  }

  getErrorProneEndpoints(limit: number = 10): EndpointStats[] {
    return Array.from(this.endpointStats.values())
      .filter(stats => stats.errorRate > 0)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, limit)
  }

  getMostUsedEndpoints(limit: number = 10): EndpointStats[] {
    return Array.from(this.endpointStats.values())
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, limit)
  }

  getSystemPerformanceSummary(hours: number = 1): {
    totalRequests: number
    averageResponseTime: number
    errorRate: number
    requestsPerSecond: number
    slowestEndpoint: string | null
    errorProneEndpoint: string | null
    peakHour: string | null
    memoryTrend: 'INCREASING' | 'STABLE' | 'DECREASING'
  } {
    const recentMetrics = this.getMetrics(hours)
    
    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        requestsPerSecond: 0,
        slowestEndpoint: null,
        errorProneEndpoint: null,
        peakHour: null,
        memoryTrend: 'STABLE'
      }
    }
    
    const totalRequests = recentMetrics.length
    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests
    const errorCount = recentMetrics.filter(m => m.isError).length
    const errorRate = (errorCount / totalRequests) * 100
    const requestsPerSecond = totalRequests / (hours * 3600)
    
    // Find slowest endpoint
    const endpointStats = this.getEndpointStats()
    const slowestEndpoint = endpointStats.length > 0 ? endpointStats[0]?.endpoint ?? null : null
    
    // Find error-prone endpoint
    const errorProneEndpoints = this.getErrorProneEndpoints(1)
    const errorProneEndpoint = errorProneEndpoints.length > 0 ? errorProneEndpoints[0]?.endpoint ?? null : null
    
    // Find peak hour
    const hourlyStats = new Map<string, number>()
    recentMetrics.forEach(m => {
      const hour = new Date(m.timestamp).getHours().toString().padStart(2, '0') + ':00'
      hourlyStats.set(hour, (hourlyStats.get(hour) || 0) + 1)
    })
    const peakHour = Array.from(hourlyStats.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null
    
    // Analyze memory trend
    const memoryUsages = recentMetrics.map(m => m.memoryUsage.heapUsed)
    const firstHalf = memoryUsages.slice(0, Math.floor(memoryUsages.length / 2))
    const secondHalf = memoryUsages.slice(Math.floor(memoryUsages.length / 2))
    
    const firstHalfAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
    const secondHalfAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length
    
    let memoryTrend: 'INCREASING' | 'STABLE' | 'DECREASING' = 'STABLE'
    const trendThreshold = firstHalfAvg * 0.1 // 10% threshold
    
    if (secondHalfAvg > firstHalfAvg + trendThreshold) {
      memoryTrend = 'INCREASING'
    } else if (secondHalfAvg < firstHalfAvg - trendThreshold) {
      memoryTrend = 'DECREASING'
    }
    
    return {
      totalRequests: Math.round(totalRequests),
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      slowestEndpoint,
      errorProneEndpoint,
      peakHour,
      memoryTrend
    }
  }

  // ============================================================================
  // ANOMALY DETECTION
  // ============================================================================

  detectAnomalies(hours: number = 1): Array<{
    type: 'RESPONSE_TIME' | 'ERROR_RATE' | 'MEMORY_USAGE' | 'REQUEST_VOLUME'
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
    endpoint?: string
    description: string
    value: number
    threshold: number
    timestamp: Date
  }> {
    const anomalies = []
    const recentMetrics = this.getMetrics(hours)
    const endpointStats = this.getEndpointStats()
    
    // Response time anomalies
    for (const stats of endpointStats) {
      if (stats.p95ResponseTime > 5000) { // > 5 seconds
        anomalies.push({
          type: 'RESPONSE_TIME' as const,
          severity: 'HIGH' as const,
          endpoint: stats.endpoint,
          description: `${stats.endpoint} has high P95 response time`,
          value: stats.p95ResponseTime,
          threshold: 5000,
          timestamp: new Date()
        })
      } else if (stats.averageResponseTime > 2000) { // > 2 seconds
        anomalies.push({
          type: 'RESPONSE_TIME' as const,
          severity: 'MEDIUM' as const,
          endpoint: stats.endpoint,
          description: `${stats.endpoint} has elevated average response time`,
          value: stats.averageResponseTime,
          threshold: 2000,
          timestamp: new Date()
        })
      }
    }
    
    // Error rate anomalies
    for (const stats of endpointStats) {
      if (stats.errorRate > 10) { // > 10% error rate
        anomalies.push({
          type: 'ERROR_RATE' as const,
          severity: 'HIGH' as const,
          endpoint: stats.endpoint,
          description: `${stats.endpoint} has high error rate`,
          value: stats.errorRate,
          threshold: 10,
          timestamp: new Date()
        })
      } else if (stats.errorRate > 5) { // > 5% error rate
        anomalies.push({
          type: 'ERROR_RATE' as const,
          severity: 'MEDIUM' as const,
          endpoint: stats.endpoint,
          description: `${stats.endpoint} has elevated error rate`,
          value: stats.errorRate,
          threshold: 5,
          timestamp: new Date()
        })
      }
    }
    
    // Memory usage anomalies
    if (recentMetrics.length > 10) {
      const memoryUsages = recentMetrics.map(m => m.memoryUsage.heapUsed)
      const averageMemory = memoryUsages.reduce((sum, val) => sum + val, 0) / memoryUsages.length
      const maxMemory = Math.max(...memoryUsages)
      
      if (maxMemory > averageMemory * 2) { // Memory spike > 200% of average
        anomalies.push({
          type: 'MEMORY_USAGE' as const,
          severity: 'HIGH' as const,
          description: 'Memory usage spike detected',
          value: maxMemory,
          threshold: averageMemory * 2,
          timestamp: new Date()
        })
      }
    }
    
    // Request volume anomalies
    const summary = this.getSystemPerformanceSummary(hours)
    if (summary.requestsPerSecond > 50) { // > 50 requests per second
      anomalies.push({
        type: 'REQUEST_VOLUME' as const,
        severity: 'MEDIUM' as const,
        description: 'High request volume detected',
        value: summary.requestsPerSecond,
        threshold: 50,
        timestamp: new Date()
      })
    }
    
    return anomalies.sort((a, b) => {
      const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
  }

  // ============================================================================
  // CLEANUP AND MAINTENANCE
  // ============================================================================

  cleanup(): void {
    // Remove old metrics (keep last 24 hours)
    const cutoff = Date.now() - (24 * 60 * 60 * 1000)
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoff)
    
    // Reset endpoint stats that haven't been used in the last hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    for (const [endpoint, stats] of Array.from(this.endpointStats.entries())) {
      if (stats.lastRequestTime.getTime() < oneHourAgo) {
        this.endpointStats.delete(endpoint)
        this.responseTimes.delete(endpoint)
      }
    }
    
    console.log(`[Performance] Cleanup completed. ${this.metrics.length} metrics retained, ${this.endpointStats.size} endpoints tracked`)
  }
}

// Export singleton instance
export default PerformanceMonitoringMiddleware.getInstance()