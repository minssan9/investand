import { DatabaseService } from '@/services/core/databaseService'
import { logger } from '@/utils/common/logger'
import crypto from 'crypto'

/**
 * Configuration Service
 * 
 * Provides dynamic configuration management with versioning, rollback capabilities,
 * and environment-specific configuration support.
 */

export interface SystemConfiguration {
  id?: string
  version: number
  environment: string
  name: string
  description?: string
  config: ConfigurationData
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
  createdBy?: string
  tags?: string[]
}

export interface ConfigurationData {
  fearGreedCalculator: {
    componentWeights: {
      priceMomentum: number
      investorSentiment: number
      putCallRatio: number
      volatilityIndex: number
      safeHavenDemand: number
    }
    confidenceThreshold: number
    dataRequiredDays: number
    enabledComponents: string[]
    customRules?: any[]
  }
  dataCollection: {
    scheduleEnabled: boolean
    collectionTime: string
    retryAttempts: number
    timeoutMs: number
    enabledSources: string[]
    parallelCollection: boolean
    maxConcurrency: number
    backoffStrategy: 'linear' | 'exponential'
  }
  api: {
    rateLimitEnabled: boolean
    maxRequestsPerMinute: number
    maxRequestsPerHour: number
    cacheEnabled: boolean
    cacheTtlSeconds: number
    compressionEnabled: boolean
    corsEnabled: boolean
    helmetEnabled: boolean
  }
  notifications: {
    emailEnabled: boolean
    slackEnabled: boolean
    smsEnabled: boolean
    webhookUrl?: string
    alertThresholds: {
      errorRate: number
      responseTime: number
      memoryUsage: number
      cpuUsage: number
    }
  }
  system: {
    logLevel: 'debug' | 'info' | 'warn' | 'error'
    enableMetrics: boolean
    metricsRetentionDays: number
    backupEnabled: boolean
    backupRetentionDays: number
    maintenanceMode: boolean
    healthCheckInterval: number
  }
  security: {
    jwtExpirationHours: number
    passwordMinLength: number
    passwordRequireSpecialChars: boolean
    maxLoginAttempts: number
    lockoutDurationMinutes: number
    sessionTimeoutMinutes: number
  }
}

export interface ConfigurationHistory {
  id: string
  configurationId: string
  version: number
  changeType: 'CREATE' | 'UPDATE' | 'ROLLBACK' | 'DELETE'
  changes: any
  changedBy: string
  changeReason?: string
  createdAt: Date
}

class ConfigurationServiceClass {
  private configCache = new Map<string, SystemConfiguration>()
  private defaultConfig: ConfigurationData

  constructor() {
    this.defaultConfig = this.getDefaultConfiguration()
    this.initializeCache()
  }

  /**
   * Get default system configuration
   */
  private getDefaultConfiguration(): ConfigurationData {
    return {
      fearGreedCalculator: {
        componentWeights: {
          priceMomentum: 25,
          investorSentiment: 25,
          putCallRatio: 15,
          volatilityIndex: 20,
          safeHavenDemand: 15
        },
        confidenceThreshold: 70,
        dataRequiredDays: 30,
        enabledComponents: ['priceMomentum', 'investorSentiment', 'putCallRatio', 'volatilityIndex', 'safeHavenDemand'],
        customRules: []
      },
      dataCollection: {
        scheduleEnabled: true,
        collectionTime: '09:00',
        retryAttempts: 3,
        timeoutMs: 30000,
        enabledSources: ['KRX', 'BOK', 'UPBIT'],
        parallelCollection: true,
        maxConcurrency: 3,
        backoffStrategy: 'exponential'
      },
      api: {
        rateLimitEnabled: true,
        maxRequestsPerMinute: 100,
        maxRequestsPerHour: 1000,
        cacheEnabled: true,
        cacheTtlSeconds: 300,
        compressionEnabled: true,
        corsEnabled: process.env.CORS_ENABLED === 'true',
        helmetEnabled: process.env.HELMET_ENABLED === 'true'
      },
      notifications: {
        emailEnabled: false,
        slackEnabled: false,
        smsEnabled: false,
        webhookUrl: process.env.WEBHOOK_URL,
        alertThresholds: {
          errorRate: 5.0,
          responseTime: 1000,
          memoryUsage: 80,
          cpuUsage: 80
        }
      },
      system: {
        logLevel: (process.env.LOG_LEVEL as any) || 'info',
        enableMetrics: true,
        metricsRetentionDays: 30,
        backupEnabled: true,
        backupRetentionDays: 30,
        maintenanceMode: false,
        healthCheckInterval: 30000
      },
      security: {
        jwtExpirationHours: 24,
        passwordMinLength: 8,
        passwordRequireSpecialChars: true,
        maxLoginAttempts: 5,
        lockoutDurationMinutes: 30,
        sessionTimeoutMinutes: 120
      }
    }
  }

  /**
   * Initialize configuration cache
   */
  private async initializeCache(): Promise<void> {
    try {
      const activeConfigs = await this.getActiveConfigurations()
      for (const config of activeConfigs) {
        this.configCache.set(`${config.environment}_${config.name}`, config)
      }
      logger.info(`Configuration cache initialized with ${activeConfigs.length} configurations`)
    } catch (error) {
      logger.error('Failed to initialize configuration cache:', error)
    }
  }

  /**
   * Get current configuration for environment
   */
  async getCurrentConfiguration(environment: string = process.env.NODE_ENV || 'development'): Promise<ConfigurationData> {
    try {
      const cacheKey = `${environment}_system`
      let config = this.configCache.get(cacheKey)

      if (!config) {
        // Try to load from database
        config = await this.loadActiveConfiguration(environment, 'system')
        if (config) {
          this.configCache.set(cacheKey, config)
        }
      }

      return config?.config || this.defaultConfig
    } catch (error) {
      logger.error('Failed to get current configuration:', error)
      return this.defaultConfig
    }
  }

  /**
   * Update configuration with versioning
   */
  async updateConfiguration(
    configData: Partial<ConfigurationData>,
    updatedBy: string,
    changeReason?: string,
    environment: string = process.env.NODE_ENV || 'development'
  ): Promise<SystemConfiguration> {
    try {
      // Get current configuration
      const currentConfig = await this.loadActiveConfiguration(environment, 'system')
      const newVersion = currentConfig ? currentConfig.version + 1 : 1

      // Merge with current configuration
      const mergedConfig = this.mergeConfigurations(
        currentConfig?.config || this.defaultConfig,
        configData
      )

      // Validate configuration
      const validationResult = this.validateConfiguration(mergedConfig)
      if (!validationResult.isValid) {
        throw new Error(`Configuration validation failed: ${validationResult.errors.join(', ')}`)
      }

      // Create new configuration record
      const newConfig: SystemConfiguration = {
        id: this.generateConfigId(),
        version: newVersion,
        environment,
        name: 'system',
        description: changeReason || `Configuration update v${newVersion}`,
        config: mergedConfig,
        isActive: true,
        createdBy: updatedBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['system', 'auto-generated']
      }

      // Deactivate current configuration
      if (currentConfig) {
        await this.deactivateConfiguration(currentConfig.id!)
      }

      // Save new configuration
      await this.saveConfiguration(newConfig)

      // Record configuration change
      await this.recordConfigurationChange({
        id: this.generateHistoryId(),
        configurationId: newConfig.id!,
        version: newVersion,
        changeType: 'UPDATE',
        changes: this.calculateChanges(currentConfig?.config, mergedConfig),
        changedBy: updatedBy,
        changeReason,
        createdAt: new Date()
      })

      // Update cache
      this.configCache.set(`${environment}_system`, newConfig)

      logger.info(`Configuration updated to version ${newVersion} by ${updatedBy}`)
      return newConfig

    } catch (error) {
      logger.error('Failed to update configuration:', error)
      throw error
    }
  }

  /**
   * Rollback to previous configuration version
   */
  async rollbackConfiguration(
    targetVersion: number,
    rolledBackBy: string,
    reason?: string,
    environment: string = process.env.NODE_ENV || 'development'
  ): Promise<SystemConfiguration> {
    try {
      // Find target configuration version
      const targetConfig = await this.getConfigurationByVersion(environment, 'system', targetVersion)
      if (!targetConfig) {
        throw new Error(`Configuration version ${targetVersion} not found`)
      }

      // Get current configuration for change tracking
      const currentConfig = await this.loadActiveConfiguration(environment, 'system')
      
      // Create rollback configuration
      const rollbackConfig: SystemConfiguration = {
        id: this.generateConfigId(),
        version: (currentConfig?.version || 0) + 1,
        environment,
        name: 'system',
        description: `Rollback to version ${targetVersion}: ${reason || 'No reason provided'}`,
        config: targetConfig.config,
        isActive: true,
        createdBy: rolledBackBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['system', 'rollback', `rollback-to-v${targetVersion}`]
      }

      // Deactivate current configuration
      if (currentConfig) {
        await this.deactivateConfiguration(currentConfig.id!)
      }

      // Save rollback configuration
      await this.saveConfiguration(rollbackConfig)

      // Record rollback change
      await this.recordConfigurationChange({
        id: this.generateHistoryId(),
        configurationId: rollbackConfig.id!,
        version: rollbackConfig.version,
        changeType: 'ROLLBACK',
        changes: {
          rolledBackToVersion: targetVersion,
          reason: reason || 'Manual rollback'
        },
        changedBy: rolledBackBy,
        changeReason: reason,
        createdAt: new Date()
      })

      // Update cache
      this.configCache.set(`${environment}_system`, rollbackConfig)

      logger.info(`Configuration rolled back to version ${targetVersion} by ${rolledBackBy}`)
      return rollbackConfig

    } catch (error) {
      logger.error('Failed to rollback configuration:', error)
      throw error
    }
  }

  /**
   * Get configuration history
   */
  async getConfigurationHistory(
    environment: string = process.env.NODE_ENV || 'development',
    limit: number = 50
  ): Promise<ConfigurationHistory[]> {
    try {
      // In a real implementation, this would query the database
      // For now, return mock data structure
      return []
    } catch (error) {
      logger.error('Failed to get configuration history:', error)
      throw error
    }
  }

  /**
   * Get all configuration versions
   */
  async getConfigurationVersions(
    environment: string = process.env.NODE_ENV || 'development',
    name: string = 'system'
  ): Promise<SystemConfiguration[]> {
    try {
      // In a real implementation, this would query the database
      // For now, return cached configuration if available
      const cacheKey = `${environment}_${name}`
      const cachedConfig = this.configCache.get(cacheKey)
      return cachedConfig ? [cachedConfig] : []
    } catch (error) {
      logger.error('Failed to get configuration versions:', error)
      throw error
    }
  }

  /**
   * Export configuration
   */
  async exportConfiguration(
    environment: string = process.env.NODE_ENV || 'development',
    format: 'json' | 'yaml' = 'json'
  ): Promise<string> {
    try {
      const config = await this.getCurrentConfiguration(environment)
      
      if (format === 'json') {
        return JSON.stringify(config, null, 2)
      } else {
        // For YAML, you'd need to install a YAML library
        throw new Error('YAML export not implemented yet')
      }
    } catch (error) {
      logger.error('Failed to export configuration:', error)
      throw error
    }
  }

  /**
   * Import configuration
   */
  async importConfiguration(
    configData: string,
    importedBy: string,
    format: 'json' | 'yaml' = 'json',
    environment: string = process.env.NODE_ENV || 'development'
  ): Promise<SystemConfiguration> {
    try {
      let parsedConfig: ConfigurationData

      if (format === 'json') {
        parsedConfig = JSON.parse(configData)
      } else {
        throw new Error('YAML import not implemented yet')
      }

      return await this.updateConfiguration(
        parsedConfig,
        importedBy,
        'Configuration imported',
        environment
      )
    } catch (error) {
      logger.error('Failed to import configuration:', error)
      throw error
    }
  }

  /**
   * Validate configuration data
   */
  private validateConfiguration(config: ConfigurationData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate Fear & Greed weights
    if (config.fearGreedCalculator?.componentWeights) {
      const weights = config.fearGreedCalculator.componentWeights
      const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0)
      
      if (Math.abs(totalWeight - 100) > 0.1) {
        errors.push(`Fear & Greed component weights must sum to 100%, got ${totalWeight}%`)
      }
    }

    // Validate data collection settings
    if (config.dataCollection) {
      if (config.dataCollection.retryAttempts < 0 || config.dataCollection.retryAttempts > 10) {
        errors.push('Data collection retry attempts must be between 0 and 10')
      }
      
      if (config.dataCollection.timeoutMs < 1000 || config.dataCollection.timeoutMs > 120000) {
        errors.push('Data collection timeout must be between 1 and 120 seconds')
      }
    }

    // Validate API settings
    if (config.api) {
      if (config.api.maxRequestsPerMinute < 1 || config.api.maxRequestsPerMinute > 10000) {
        errors.push('API rate limit per minute must be between 1 and 10000')
      }
    }

    // Validate security settings
    if (config.security) {
      if (config.security.passwordMinLength < 6 || config.security.passwordMinLength > 32) {
        errors.push('Password minimum length must be between 6 and 32 characters')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Merge configurations (deep merge)
   */
  private mergeConfigurations(base: ConfigurationData, updates: Partial<ConfigurationData>): ConfigurationData {
    return this.deepMerge(base, updates) as ConfigurationData
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target }
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key])
      } else {
        result[key] = source[key]
      }
    }
    
    return result
  }

  /**
   * Calculate changes between configurations
   */
  private calculateChanges(oldConfig: ConfigurationData | undefined, newConfig: ConfigurationData): any {
    if (!oldConfig) {
      return { type: 'initial', config: newConfig }
    }

    const changes: any = {}
    this.findChanges(oldConfig, newConfig, changes, '')

    return changes
  }

  private findChanges(oldObj: any, newObj: any, changes: any, path: string): void {
    for (const key in newObj) {
      const currentPath = path ? `${path}.${key}` : key
      
      if (!(key in oldObj)) {
        changes[currentPath] = { type: 'added', value: newObj[key] }
      } else if (typeof newObj[key] === 'object' && newObj[key] !== null && !Array.isArray(newObj[key])) {
        this.findChanges(oldObj[key], newObj[key], changes, currentPath)
      } else if (oldObj[key] !== newObj[key]) {
        changes[currentPath] = { type: 'changed', oldValue: oldObj[key], newValue: newObj[key] }
      }
    }

    for (const key in oldObj) {
      const currentPath = path ? `${path}.${key}` : key
      if (!(key in newObj)) {
        changes[currentPath] = { type: 'removed', value: oldObj[key] }
      }
    }
  }

  // Helper methods for database operations (would be implemented with actual database calls)
  private async loadActiveConfiguration(environment: string, name: string): Promise<SystemConfiguration | null> {
    // Mock implementation - would query database
    return this.configCache.get(`${environment}_${name}`) || null
  }

  private async getActiveConfigurations(): Promise<SystemConfiguration[]> {
    // Mock implementation - would query database
    return Array.from(this.configCache.values())
  }

  private async getConfigurationByVersion(environment: string, name: string, version: number): Promise<SystemConfiguration | null> {
    // Mock implementation - would query database
    const config = this.configCache.get(`${environment}_${name}`)
    return config?.version === version ? config : null
  }

  private async saveConfiguration(config: SystemConfiguration): Promise<void> {
    // Mock implementation - would save to database
    logger.info(`Saving configuration ${config.id} version ${config.version}`)
  }

  private async deactivateConfiguration(configId: string): Promise<void> {
    // Mock implementation - would update database
    logger.info(`Deactivating configuration ${configId}`)
  }

  private async recordConfigurationChange(change: ConfigurationHistory): Promise<void> {
    // Mock implementation - would save to database
    logger.info(`Recording configuration change ${change.id}`)
  }

  // Utility methods
  private generateConfigId(): string {
    return `config_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
  }

  private generateHistoryId(): string {
    return `history_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
  }
}

export const ConfigurationService = new ConfigurationServiceClass()