/**
 * Database Configuration for DART Batch Processing System
 * Production-ready database connection with SSL, pooling, and error handling
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

// Database connection configuration
const DB_CONFIG = {
  // Connection pool settings
  pool: {
    min: parseInt(process.env.DB_CONNECTION_POOL_MIN) || 5,
    max: parseInt(process.env.DB_CONNECTION_POOL_MAX) || 20,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
    queryTimeoutMillis: parseInt(process.env.DB_QUERY_TIMEOUT) || 60000,
    idleTimeoutMillis: 300000, // 5 minutes
    acquireTimeoutMillis: 60000, // 1 minute
  },

  // SSL configuration for production
  ssl: {
    enabled: process.env.NODE_ENV === 'production',
    rejectUnauthorized: true,
    ca: process.env.DB_SSL_CA_PATH ? fs.readFileSync(process.env.DB_SSL_CA_PATH) : undefined,
    cert: process.env.DB_SSL_CERT_PATH ? fs.readFileSync(process.env.DB_SSL_CERT_PATH) : undefined,
    key: process.env.DB_SSL_KEY_PATH ? fs.readFileSync(process.env.DB_SSL_KEY_PATH) : undefined,
  },

  // Retry configuration
  retry: {
    attempts: 3,
    backoffMultiplier: 2,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
  },

  // Health check configuration
  healthCheck: {
    enabled: true,
    intervalMs: 30000, // 30 seconds
    timeoutMs: 5000,   // 5 seconds
  }
}

/**
 * Enhanced Database Connection Manager
 */
class DatabaseManager {
  constructor() {
    this.client = null
    this.isConnected = false
    this.connectionAttempts = 0
    this.lastError = null
    this.healthCheckInterval = null
    this.connectionPool = {
      active: 0,
      idle: 0,
      waiting: 0
    }
  }

  /**
   * Initialize Prisma client with production configuration
   */
  async initialize() {
    try {
      // Validate database URL
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is required')
      }

      // Parse and validate database URL
      const dbUrl = new URL(process.env.DATABASE_URL)
      
      // Create Prisma client with enhanced configuration
      this.client = new PrismaClient({
        datasources: {
          db: {
            url: this.buildConnectionString(dbUrl)
          }
        },
        log: this.getLogLevel(),
        errorFormat: 'pretty',
      })

      // Set up connection event handlers
      this.setupEventHandlers()

      // Test initial connection
      await this.testConnection()

      // Start health check monitoring
      if (DB_CONFIG.healthCheck.enabled) {
        this.startHealthCheck()
      }

      console.log('✅ Database connection initialized successfully')
      return this.client

    } catch (error) {
      this.lastError = error
      console.error('❌ Database initialization failed:', error.message)
      throw error
    }
  }

  /**
   * Build enhanced connection string with SSL and pooling parameters
   */
  buildConnectionString(dbUrl) {
    const params = new URLSearchParams(dbUrl.search)

    // Add MySQL-specific authentication parameters
    if (dbUrl.protocol === 'mysql:') {
      // Use mysql_native_password to avoid sha256_password issues
      params.set('authPlugins', 'mysql_native_password')
      // Add charset and timezone for MySQL
      params.set('charset', 'utf8mb4')
      params.set('timezone', 'Asia/Seoul')
    }

    // Add SSL parameters for production
    if (DB_CONFIG.ssl.enabled) {
      if (dbUrl.protocol === 'mysql:') {
        params.set('ssl', 'true')
        params.set('sslmode', 'require')
      } else {
        params.set('ssl', 'true')
        params.set('sslmode', 'require')
      }
      
      if (process.env.DB_SSL_CA_PATH) {
        params.set('sslcert', process.env.DB_SSL_CERT_PATH)
        params.set('sslkey', process.env.DB_SSL_KEY_PATH)
        params.set('sslrootcert', process.env.DB_SSL_CA_PATH)
      }
    }

    // Add connection pool parameters
    params.set('connection_limit', DB_CONFIG.pool.max.toString())
    params.set('pool_timeout', Math.floor(DB_CONFIG.pool.connectionTimeoutMillis / 1000).toString())

    // Rebuild URL
    dbUrl.search = params.toString()
    return dbUrl.toString()
  }

  /**
   * Get appropriate log level based on environment
   */
  getLogLevel() {
    const logLevel = process.env.LOG_LEVEL || 'info'
    
    switch (logLevel) {
      case 'debug':
      case 'verbose':
        return ['query', 'info', 'warn', 'error']
      case 'info':
        return ['info', 'warn', 'error']
      case 'warn':
        return ['warn', 'error']
      case 'error':
        return ['error']
      default:
        return ['warn', 'error']
    }
  }

  /**
   * Set up database connection event handlers
   */
  setupEventHandlers() {
    // Handle process termination
    process.on('SIGTERM', () => this.gracefulShutdown())
    process.on('SIGINT', () => this.gracefulShutdown())
    process.on('beforeExit', () => this.gracefulShutdown())

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('Uncaught database exception:', error)
      this.gracefulShutdown()
    })
  }

  /**
   * Test database connection with retry logic
   */
  async testConnection() {
    const maxRetries = DB_CONFIG.retry.attempts
    let delay = DB_CONFIG.retry.initialDelayMs

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.connectionAttempts = attempt
        
        // Test connection with timeout
        const connectionTest = this.client.$queryRaw`SELECT 1 as test`
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), DB_CONFIG.pool.connectionTimeoutMillis)
        })

        await Promise.race([connectionTest, timeoutPromise])
        
        this.isConnected = true
        this.lastError = null
        console.log(`✅ Database connection test passed (attempt ${attempt}/${maxRetries})`)
        return true

      } catch (error) {
        this.lastError = error
        console.warn(`⚠️ Connection attempt ${attempt}/${maxRetries} failed:`, error.message)

        if (attempt === maxRetries) {
          throw new Error(`Database connection failed after ${maxRetries} attempts: ${error.message}`)
        }

        // Exponential backoff delay
        await new Promise(resolve => setTimeout(resolve, delay))
        delay = Math.min(delay * DB_CONFIG.retry.backoffMultiplier, DB_CONFIG.retry.maxDelayMs)
      }
    }
  }

  /**
   * Start periodic health check
   */
  startHealthCheck() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck()
      } catch (error) {
        console.error('Database health check failed:', error.message)
        this.isConnected = false
        this.lastError = error
      }
    }, DB_CONFIG.healthCheck.intervalMs)

    console.log('🔍 Database health check monitoring started')
  }

  /**
   * Perform database health check
   */
  async performHealthCheck() {
    const startTime = Date.now()
    
    try {
      // Simple connectivity test
      await this.client.$queryRaw`SELECT 1 as health_check`
      
      // Get connection pool status (if available)
      const metrics = await this.getConnectionMetrics()
      this.connectionPool = metrics

      const responseTime = Date.now() - startTime
      
      if (responseTime > DB_CONFIG.healthCheck.timeoutMs) {
        throw new Error(`Health check timeout: ${responseTime}ms > ${DB_CONFIG.healthCheck.timeoutMs}ms`)
      }

      this.isConnected = true
      this.lastError = null

    } catch (error) {
      this.isConnected = false
      this.lastError = error
      throw error
    }
  }

  /**
   * Get connection pool metrics
   */
  async getConnectionMetrics() {
    try {
      // For MySQL, query information_schema for connection info
      const result = await this.client.$queryRaw`
        SELECT 
          COUNT(*) as total_connections,
          SUM(CASE WHEN COMMAND != 'Sleep' THEN 1 ELSE 0 END) as active_connections,
          SUM(CASE WHEN COMMAND = 'Sleep' THEN 1 ELSE 0 END) as idle_connections
        FROM information_schema.PROCESSLIST 
        WHERE USER = SUBSTRING_INDEX(USER(), '@', 1)
      `

      return {
        active: Number(result[0]?.active_connections) || 0,
        idle: Number(result[0]?.idle_connections) || 0,
        total: Number(result[0]?.total_connections) || 0,
        waiting: 0 // Not easily available in MySQL
      }
    } catch (error) {
      console.warn('Could not fetch connection metrics:', error.message)
      return { active: 0, idle: 0, total: 0, waiting: 0 }
    }
  }

  /**
   * Get database status information
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      connectionAttempts: this.connectionAttempts,
      lastError: this.lastError?.message || null,
      lastErrorTime: this.lastError ? new Date().toISOString() : null,
      connectionPool: this.connectionPool,
      config: {
        poolMin: DB_CONFIG.pool.min,
        poolMax: DB_CONFIG.pool.max,
        sslEnabled: DB_CONFIG.ssl.enabled,
        healthCheckEnabled: DB_CONFIG.healthCheck.enabled
      }
    }
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown() {
    console.log('🔄 Initiating database graceful shutdown...')

    try {
      // Stop health check
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval)
        this.healthCheckInterval = null
      }

      // Close Prisma connection
      if (this.client) {
        await this.client.$disconnect()
        console.log('✅ Database connection closed gracefully')
      }

      this.isConnected = false

    } catch (error) {
      console.error('❌ Error during database shutdown:', error.message)
    }
  }

  /**
   * Create database transaction
   */
  async transaction(fn) {
    if (!this.client) {
      throw new Error('Database not initialized')
    }

    return await this.client.$transaction(fn, {
      timeout: DB_CONFIG.pool.queryTimeoutMillis,
    })
  }

  /**
   * Execute raw query with timeout
   */
  async queryRaw(query, ...args) {
    if (!this.client) {
      throw new Error('Database not initialized')
    }

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), DB_CONFIG.pool.queryTimeoutMillis)
    })

    const queryPromise = this.client.$queryRaw(query, ...args)
    
    return await Promise.race([queryPromise, timeoutPromise])
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager()

// Export configured client and manager
module.exports = {
  DatabaseManager,
  databaseManager,
  DB_CONFIG,
  
  // Helper function to get initialized client
  async getClient() {
    if (!databaseManager.client) {
      await databaseManager.initialize()
    }
    return databaseManager.client
  },

  // Helper function to get database status
  getStatus() {
    return databaseManager.getStatus()
  },

  // Helper function for graceful shutdown
  async shutdown() {
    await databaseManager.gracefulShutdown()
  }
}