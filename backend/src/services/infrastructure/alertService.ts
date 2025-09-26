import { EventEmitter } from 'events'
import { PrismaClient } from '@prisma/client'
import MonitoringService from './monitoringService'
import DatabaseHealthService from './databaseHealthService'
import { BusinessMetricsService } from '@/services/config/businessMetricsService'

const prisma = new PrismaClient()

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface AlertRule {
  id: string
  name: string
  description: string
  category: 'SYSTEM' | 'DATABASE' | 'BUSINESS' | 'SECURITY' | 'PERFORMANCE'
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  enabled: boolean
  conditions: AlertCondition[]
  actions: AlertAction[]
  cooldown: number // minutes
  schedule?: AlertSchedule
  createdAt: Date
  updatedAt: Date
}

export interface AlertCondition {
  metric: string
  operator: 'GT' | 'LT' | 'EQ' | 'NE' | 'GTE' | 'LTE' | 'CONTAINS' | 'NOT_CONTAINS'
  value: number | string | boolean
  aggregation?: 'AVG' | 'MAX' | 'MIN' | 'SUM' | 'COUNT'
  window?: number // minutes
}

export interface AlertAction {
  type: 'EMAIL' | 'SLACK' | 'WEBHOOK' | 'SMS' | 'DATABASE' | 'CONSOLE'
  target: string
  template?: string
  enabled: boolean
}

export interface AlertSchedule {
  timezone: string
  activeHours: {
    start: string // HH:MM
    end: string // HH:MM
  }
  activeDays: string[] // ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
}

export interface Alert {
  id: string
  ruleId: string
  ruleName: string
  title: string
  message: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  category: string
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SUPPRESSED'
  triggerValue: any
  threshold: any
  triggeredAt: Date
  acknowledgedAt?: Date
  acknowledgedBy?: string
  resolvedAt?: Date
  autoResolved: boolean
  metadata: { [key: string]: any }
}

export interface AlertStats {
  total: number
  active: number
  acknowledged: number
  resolved: number
  byCategory: { [category: string]: number }
  bySeverity: { [severity: string]: number
  }
  mttr: number // mean time to resolution in minutes
  falsePositiveRate: number // percentage
}

// ============================================================================
// ALERT SERVICE
// ============================================================================

export class AlertService extends EventEmitter {
  private static instance: AlertService
  private rules: AlertRule[] = []
  private activeAlerts = new Map<string, Alert>()
  private alertHistory: Alert[] = []
  private suppressedAlerts = new Set<string>()
  private lastTriggerTimes = new Map<string, Date>()
  private evaluationInterval: NodeJS.Timeout | null = null

  constructor() {
    super()
    this.initializeDefaultRules()
  }

  static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService()
    }
    return AlertService.instance
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private initializeDefaultRules(): void {
    this.rules = [
      // System Performance Rules
      {
        id: 'cpu-high',
        name: 'High CPU Usage',
        description: 'CPU usage exceeding threshold',
        category: 'PERFORMANCE',
        severity: 'WARNING',
        enabled: true,
        conditions: [
          { metric: 'cpu.usage', operator: 'GT', value: 80, aggregation: 'AVG', window: 5 }
        ],
        actions: [
          { type: 'CONSOLE', target: 'console', enabled: true },
          { type: 'DATABASE', target: 'alerts', enabled: true }
        ],
        cooldown: 15,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'cpu-critical',
        name: 'Critical CPU Usage',
        description: 'CPU usage critically high',
        category: 'PERFORMANCE',
        severity: 'CRITICAL',
        enabled: true,
        conditions: [
          { metric: 'cpu.usage', operator: 'GT', value: 95, aggregation: 'AVG', window: 3 }
        ],
        actions: [
          { type: 'CONSOLE', target: 'console', enabled: true },
          { type: 'DATABASE', target: 'alerts', enabled: true }
        ],
        cooldown: 10,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // Memory Rules
      {
        id: 'memory-high',
        name: 'High Memory Usage',
        description: 'Memory usage exceeding threshold',
        category: 'PERFORMANCE',
        severity: 'WARNING',
        enabled: true,
        conditions: [
          { metric: 'memory.systemMemory.utilization', operator: 'GT', value: 85, aggregation: 'AVG', window: 5 }
        ],
        actions: [
          { type: 'CONSOLE', target: 'console', enabled: true },
          { type: 'DATABASE', target: 'alerts', enabled: true }
        ],
        cooldown: 15,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // Database Rules
      {
        id: 'db-connection-failed',
        name: 'Database Connection Failed',
        description: 'Database connection is down',
        category: 'DATABASE',
        severity: 'CRITICAL',
        enabled: true,
        conditions: [
          { metric: 'database.health', operator: 'EQ', value: 'CRITICAL' }
        ],
        actions: [
          { type: 'CONSOLE', target: 'console', enabled: true },
          { type: 'DATABASE', target: 'alerts', enabled: true }
        ],
        cooldown: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'db-slow-queries',
        name: 'Slow Database Queries',
        description: 'Database response time is slow',
        category: 'DATABASE',
        severity: 'WARNING',
        enabled: true,
        conditions: [
          { metric: 'database.responseTime', operator: 'GT', value: 5000, aggregation: 'AVG', window: 10 }
        ],
        actions: [
          { type: 'CONSOLE', target: 'console', enabled: true },
          { type: 'DATABASE', target: 'alerts', enabled: true }
        ],
        cooldown: 20,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // Business Rules
      {
        id: 'data-collection-failed',
        name: 'Data Collection Failure',
        description: 'Data collection success rate is low',
        category: 'BUSINESS',
        severity: 'CRITICAL',
        enabled: true,
        conditions: [
          { metric: 'business.dataCollection.successRate', operator: 'LT', value: 80, aggregation: 'AVG', window: 30 }
        ],
        actions: [
          { type: 'CONSOLE', target: 'console', enabled: true },
          { type: 'DATABASE', target: 'alerts', enabled: true }
        ],
        cooldown: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'fear-greed-accuracy-low',
        name: 'Low Fear & Greed Accuracy',
        description: 'Fear & Greed calculation accuracy is low',
        category: 'BUSINESS',
        severity: 'WARNING',
        enabled: true,
        conditions: [
          { metric: 'business.fearGreedCalculation.accuracy.confidenceScore', operator: 'LT', value: 70, aggregation: 'AVG', window: 60 }
        ],
        actions: [
          { type: 'CONSOLE', target: 'console', enabled: true },
          { type: 'DATABASE', target: 'alerts', enabled: true }
        ],
        cooldown: 60,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // API Rules
      {
        id: 'api-error-rate-high',
        name: 'High API Error Rate',
        description: 'API error rate exceeding threshold',
        category: 'SYSTEM',
        severity: 'WARNING',
        enabled: true,
        conditions: [
          { metric: 'api.errorRate', operator: 'GT', value: 5, aggregation: 'AVG', window: 15 }
        ],
        actions: [
          { type: 'CONSOLE', target: 'console', enabled: true },
          { type: 'DATABASE', target: 'alerts', enabled: true }
        ],
        cooldown: 20,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'api-response-slow',
        name: 'Slow API Response',
        description: 'API response time is slow',
        category: 'PERFORMANCE',
        severity: 'WARNING',
        enabled: true,
        conditions: [
          { metric: 'api.averageResponseTime', operator: 'GT', value: 2000, aggregation: 'AVG', window: 10 }
        ],
        actions: [
          { type: 'CONSOLE', target: 'console', enabled: true },
          { type: 'DATABASE', target: 'alerts', enabled: true }
        ],
        cooldown: 15,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // Memory Leak Detection
      {
        id: 'memory-leak-detected',
        name: 'Memory Leak Detected',
        description: 'Potential memory leak detected',
        category: 'SYSTEM',
        severity: 'CRITICAL',
        enabled: true,
        conditions: [
          { metric: 'gc.memoryLeakIndicator', operator: 'EQ', value: true }
        ],
        actions: [
          { type: 'CONSOLE', target: 'console', enabled: true },
          { type: 'DATABASE', target: 'alerts', enabled: true }
        ],
        cooldown: 60,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  }

  // ============================================================================
  // RULE MANAGEMENT
  // ============================================================================

  createRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): AlertRule {
    const newRule: AlertRule = {
      ...rule,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    this.rules.push(newRule)
    this.emit('ruleCreated', newRule)
    
    return newRule
  }

  updateRule(id: string, updates: Partial<AlertRule>): AlertRule | null {
    const ruleIndex = this.rules.findIndex(rule => rule.id === id)
    if (ruleIndex === -1) return null
    
    this.rules[ruleIndex] = {
      ...this.rules[ruleIndex],
      ...updates,
      updatedAt: new Date()
    }
    
    this.emit('ruleUpdated', this.rules[ruleIndex])
    return this.rules[ruleIndex]
  }

  deleteRule(id: string): boolean {
    const ruleIndex = this.rules.findIndex(rule => rule.id === id)
    if (ruleIndex === -1) return false
    
    const deletedRule = this.rules.splice(ruleIndex, 1)[0]
    
    // Resolve any active alerts for this rule
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.ruleId === id) {
        this.resolveAlert(alertId, true, 'Rule deleted')
      }
    }
    
    this.emit('ruleDeleted', deletedRule)
    return true
  }

  getRule(id: string): AlertRule | null {
    return this.rules.find(rule => rule.id === id) || null
  }

  getRules(category?: string, enabled?: boolean): AlertRule[] {
    let filteredRules = this.rules
    
    if (category) {
      filteredRules = filteredRules.filter(rule => rule.category === category)
    }
    
    if (enabled !== undefined) {
      filteredRules = filteredRules.filter(rule => rule.enabled === enabled)
    }
    
    return filteredRules
  }

  // ============================================================================
  // ALERT EVALUATION AND TRIGGERING
  // ============================================================================

  async evaluateRules(): Promise<void> {
    try {
      // Get latest metrics from all services
      const [systemMetrics, dbMetrics, businessMetrics] = await Promise.all([
        MonitoringService.collectSystemMetrics(),
        DatabaseHealthService.collectHealthMetrics(),
        BusinessMetricsService.collectBusinessMetrics()
      ])

      const metricsContext = {
        ...this.flattenObject(systemMetrics, 'system'),
        ...this.flattenObject(dbMetrics, 'db'),
        ...this.flattenObject(businessMetrics, 'business')
      }

      // Evaluate each enabled rule
      for (const rule of this.rules.filter(r => r.enabled)) {
        if (this.isRuleScheduleActive(rule)) {
          await this.evaluateRule(rule, metricsContext)
        }
      }

      // Check for auto-resolution
      await this.checkAutoResolution(metricsContext)

    } catch (error) {
      console.error('[Alert Service] Error evaluating rules:', error)
    }
  }

  private async evaluateRule(rule: AlertRule, metricsContext: any): Promise<void> {
    // Check cooldown period
    const lastTrigger = this.lastTriggerTimes.get(rule.id)
    if (lastTrigger) {
      const cooldownMs = rule.cooldown * 60 * 1000
      if (Date.now() - lastTrigger.getTime() < cooldownMs) {
        return
      }
    }

    // Evaluate all conditions (AND logic)
    const conditionResults = rule.conditions.map(condition => 
      this.evaluateCondition(condition, metricsContext)
    )

    const allConditionsMet = conditionResults.every(result => result.met)

    if (allConditionsMet) {
      // Create alert
      const triggerValue = conditionResults[0].actualValue // Use first condition's value
      const threshold = rule.conditions[0].value

      await this.triggerAlert(rule, triggerValue, threshold, metricsContext)
    }
  }

  private evaluateCondition(condition: AlertCondition, metricsContext: any): {
    met: boolean
    actualValue: any
  } {
    const value = this.getMetricValue(condition.metric, metricsContext)
    
    if (value === undefined || value === null) {
      return { met: false, actualValue: null }
    }

    let actualValue = value
    let met = false

    // Apply aggregation if specified (simplified)
    if (condition.aggregation && Array.isArray(value)) {
      switch (condition.aggregation) {
        case 'AVG':
          actualValue = value.reduce((sum, val) => sum + val, 0) / value.length
          break
        case 'MAX':
          actualValue = Math.max(...value)
          break
        case 'MIN':
          actualValue = Math.min(...value)
          break
        case 'SUM':
          actualValue = value.reduce((sum, val) => sum + val, 0)
          break
        case 'COUNT':
          actualValue = value.length
          break
      }
    }

    // Evaluate condition
    switch (condition.operator) {
      case 'GT':
        met = actualValue > condition.value
        break
      case 'LT':
        met = actualValue < condition.value
        break
      case 'GTE':
        met = actualValue >= condition.value
        break
      case 'LTE':
        met = actualValue <= condition.value
        break
      case 'EQ':
        met = actualValue === condition.value
        break
      case 'NE':
        met = actualValue !== condition.value
        break
      case 'CONTAINS':
        met = String(actualValue).includes(String(condition.value))
        break
      case 'NOT_CONTAINS':
        met = !String(actualValue).includes(String(condition.value))
        break
    }

    return { met, actualValue }
  }

  private getMetricValue(path: string, context: any): any {
    return path.split('.').reduce((obj, key) => obj?.[key], context)
  }

  private async triggerAlert(
    rule: AlertRule,
    triggerValue: any,
    threshold: any,
    metadata: any
  ): Promise<void> {
    // Check if similar alert already exists
    const existingAlert = Array.from(this.activeAlerts.values()).find(alert => 
      alert.ruleId === rule.id && alert.status === 'ACTIVE'
    )

    if (existingAlert) {
      return // Don't create duplicate alerts
    }

    const alert: Alert = {
      id: this.generateId(),
      ruleId: rule.id,
      ruleName: rule.name,
      title: rule.name,
      message: this.generateAlertMessage(rule, triggerValue, threshold),
      severity: rule.severity,
      category: rule.category,
      status: 'ACTIVE',
      triggerValue,
      threshold,
      triggeredAt: new Date(),
      autoResolved: false,
      metadata: {
        rule: rule.name,
        conditions: rule.conditions,
        ...metadata
      }
    }

    // Store alert
    this.activeAlerts.set(alert.id, alert)
    this.alertHistory.push(alert)
    this.lastTriggerTimes.set(rule.id, new Date())

    // Execute actions
    await this.executeActions(rule.actions, alert)

    this.emit('alertTriggered', alert)
    console.log(`[Alert] Triggered: ${alert.title} - ${alert.message}`)
  }

  private generateAlertMessage(rule: AlertRule, triggerValue: any, threshold: any): string {
    const condition = rule.conditions[0] // Use first condition for message
    let comparison = ''
    
    switch (condition.operator) {
      case 'GT': comparison = 'greater than'; break
      case 'LT': comparison = 'less than'; break
      case 'GTE': comparison = 'greater than or equal to'; break
      case 'LTE': comparison = 'less than or equal to'; break
      case 'EQ': comparison = 'equal to'; break
      case 'NE': comparison = 'not equal to'; break
      default: comparison = condition.operator.toLowerCase()
    }

    return `${condition.metric} is ${triggerValue} (${comparison} ${threshold})`
  }

  private async executeActions(actions: AlertAction[], alert: Alert): Promise<void> {
    for (const action of actions.filter(a => a.enabled)) {
      try {
        await this.executeAction(action, alert)
      } catch (error) {
        console.error(`[Alert] Failed to execute action ${action.type}:`, error)
      }
    }
  }

  private async executeAction(action: AlertAction, alert: Alert): Promise<void> {
    switch (action.type) {
      case 'CONSOLE':
        this.executeConsoleAction(alert)
        break
      case 'DATABASE':
        await this.executeDatabaseAction(alert)
        break
      case 'EMAIL':
        await this.executeEmailAction(action, alert)
        break
      case 'SLACK':
        await this.executeSlackAction(action, alert)
        break
      case 'WEBHOOK':
        await this.executeWebhookAction(action, alert)
        break
      case 'SMS':
        await this.executeSmsAction(action, alert)
        break
    }
  }

  private executeConsoleAction(alert: Alert): void {
    const color = alert.severity === 'CRITICAL' ? '\x1b[31m' : 
                  alert.severity === 'WARNING' ? '\x1b[33m' : '\x1b[36m'
    console.log(`${color}[ALERT ${alert.severity}] ${alert.title}: ${alert.message}\x1b[0m`)
  }

  private async executeDatabaseAction(alert: Alert): Promise<void> {
    try {
      // In a real implementation, you would store alerts in a database table
      console.log(`[Alert Database] Stored alert ${alert.id}`)
    } catch (error) {
      console.error('[Alert] Failed to store alert in database:', error)
    }
  }

  private async executeEmailAction(action: AlertAction, alert: Alert): Promise<void> {
    // Mock email action - integrate with actual email service
    console.log(`[Alert Email] Sending email to ${action.target}: ${alert.title}`)
  }

  private async executeSlackAction(action: AlertAction, alert: Alert): Promise<void> {
    // Mock Slack action - integrate with Slack API
    console.log(`[Alert Slack] Sending Slack message to ${action.target}: ${alert.title}`)
  }

  private async executeWebhookAction(action: AlertAction, alert: Alert): Promise<void> {
    try {
      // Mock webhook - would make HTTP request to action.target
      console.log(`[Alert Webhook] Calling webhook ${action.target} for alert ${alert.id}`)
    } catch (error) {
      console.error('[Alert] Webhook call failed:', error)
    }
  }

  private async executeSmsAction(action: AlertAction, alert: Alert): Promise<void> {
    // Mock SMS action - integrate with SMS service
    console.log(`[Alert SMS] Sending SMS to ${action.target}: ${alert.title}`)
  }

  // ============================================================================
  // ALERT MANAGEMENT
  // ============================================================================

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId)
    if (!alert || alert.status !== 'ACTIVE') {
      return false
    }

    alert.status = 'ACKNOWLEDGED'
    alert.acknowledgedAt = new Date()
    alert.acknowledgedBy = acknowledgedBy

    this.emit('alertAcknowledged', alert)
    console.log(`[Alert] Acknowledged: ${alert.title} by ${acknowledgedBy}`)
    
    return true
  }

  async resolveAlert(alertId: string, autoResolved: boolean = false, reason?: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId)
    if (!alert) {
      return false
    }

    alert.status = 'RESOLVED'
    alert.resolvedAt = new Date()
    alert.autoResolved = autoResolved

    if (reason) {
      alert.metadata.resolutionReason = reason
    }

    this.activeAlerts.delete(alertId)
    this.emit('alertResolved', alert)
    
    const resolvedBy = autoResolved ? 'system' : 'manual'
    console.log(`[Alert] Resolved: ${alert.title} (${resolvedBy})`)

    return true
  }

  suppressAlert(alertId: string, durationMinutes: number = 60): boolean {
    const alert = this.activeAlerts.get(alertId)
    if (!alert) {
      return false
    }

    this.suppressedAlerts.add(alertId)
    alert.status = 'SUPPRESSED'

    // Auto-remove suppression after duration
    setTimeout(() => {
      this.suppressedAlerts.delete(alertId)
      if (this.activeAlerts.has(alertId)) {
        this.activeAlerts.get(alertId)!.status = 'ACTIVE'
      }
    }, durationMinutes * 60 * 1000)

    this.emit('alertSuppressed', alert)
    console.log(`[Alert] Suppressed: ${alert.title} for ${durationMinutes} minutes`)

    return true
  }

  private async checkAutoResolution(metricsContext: any): Promise<void> {
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.status !== 'ACTIVE') continue

      const rule = this.getRule(alert.ruleId)
      if (!rule) continue

      // Check if conditions are no longer met
      const conditionResults = rule.conditions.map(condition => 
        this.evaluateCondition(condition, metricsContext)
      )

      const anyConditionMet = conditionResults.some(result => result.met)

      if (!anyConditionMet) {
        await this.resolveAlert(alertId, true, 'Conditions no longer met')
      }
    }
  }

  // ============================================================================
  // STATISTICS AND REPORTING
  // ============================================================================

  getAlertStats(hours: number = 24): AlertStats {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)
    const recentAlerts = this.alertHistory.filter(alert => 
      alert.triggeredAt.getTime() > cutoff
    )

    const total = recentAlerts.length
    const active = Array.from(this.activeAlerts.values()).length
    const acknowledged = recentAlerts.filter(alert => alert.status === 'ACKNOWLEDGED').length
    const resolved = recentAlerts.filter(alert => alert.status === 'RESOLVED').length

    const byCategory: { [category: string]: number } = {}
    const bySeverity: { [severity: string]: number } = {}

    recentAlerts.forEach(alert => {
      byCategory[alert.category] = (byCategory[alert.category] || 0) + 1
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1
    })

    // Calculate MTTR (Mean Time To Resolution)
    const resolvedAlerts = recentAlerts.filter(alert => 
      alert.status === 'RESOLVED' && alert.resolvedAt
    )
    
    const totalResolutionTime = resolvedAlerts.reduce((sum, alert) => {
      const resolutionTime = alert.resolvedAt!.getTime() - alert.triggeredAt.getTime()
      return sum + resolutionTime
    }, 0)

    const mttr = resolvedAlerts.length > 0 ? 
      Math.round(totalResolutionTime / resolvedAlerts.length / 60000) : 0 // in minutes

    // Calculate false positive rate (simplified)
    const autoResolvedCount = resolvedAlerts.filter(alert => alert.autoResolved).length
    const falsePositiveRate = resolvedAlerts.length > 0 ? 
      Math.round((autoResolvedCount / resolvedAlerts.length) * 100) : 0

    return {
      total,
      active,
      acknowledged,
      resolved,
      byCategory,
      bySeverity,
      mttr,
      falsePositiveRate
    }
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
  }

  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory
      .slice(-limit)
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
  }

  getAlert(id: string): Alert | null {
    return this.activeAlerts.get(id) || 
           this.alertHistory.find(alert => alert.id === id) || 
           null
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private flattenObject(obj: any, prefix: string = ''): any {
    const flattened: any = {}
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
          Object.assign(flattened, this.flattenObject(obj[key], newKey))
        } else {
          flattened[newKey] = obj[key]
        }
      }
    }
    
    return flattened
  }

  private isRuleScheduleActive(rule: AlertRule): boolean {
    if (!rule.schedule) return true

    const now = new Date()
    const currentDay = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()]
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    // Check if current day is active
    if (!rule.schedule.activeDays.includes(currentDay)) {
      return false
    }

    // Check if current time is within active hours
    if (rule.schedule.activeHours) {
      const { start, end } = rule.schedule.activeHours
      if (currentTime < start || currentTime > end) {
        return false
      }
    }

    return true
  }

  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // ============================================================================
  // LIFECYCLE MANAGEMENT
  // ============================================================================

  start(intervalMinutes: number = 1): void {
    if (this.evaluationInterval) {
      this.stop()
    }

    this.evaluationInterval = setInterval(async () => {
      await this.evaluateRules()
    }, intervalMinutes * 60 * 1000)

    console.log(`[Alert Service] Started with ${intervalMinutes} minute interval`)
  }

  stop(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval)
      this.evaluationInterval = null
      console.log('[Alert Service] Stopped')
    }
  }

  cleanup(): void {
    // Clean up old alert history (keep last 1000 alerts)
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-500)
    }

    // Clean up old trigger times
    const cutoff = Date.now() - (24 * 60 * 60 * 1000)
    for (const [ruleId, time] of this.lastTriggerTimes.entries()) {
      if (time.getTime() < cutoff) {
        this.lastTriggerTimes.delete(ruleId)
      }
    }

    console.log(`[Alert Service] Cleanup completed. ${this.alertHistory.length} alerts retained`)
  }

  // ============================================================================
  // EXPORT METHODS
  // ============================================================================

  exportConfiguration(): {
    rules: AlertRule[]
    stats: AlertStats
    activeAlerts: Alert[]
  } {
    return {
      rules: this.rules,
      stats: this.getAlertStats(),
      activeAlerts: this.getActiveAlerts()
    }
  }

  importConfiguration(config: { rules: AlertRule[] }): void {
    this.rules = config.rules
    this.emit('configurationImported', config)
    console.log(`[Alert Service] Imported ${config.rules.length} rules`)
  }
}

export default AlertService.getInstance()