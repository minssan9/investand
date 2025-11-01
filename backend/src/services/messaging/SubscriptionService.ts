import { logger } from '@/utils/common/logger'
import { DatabaseService } from '@/services/core/databaseService'

export interface Subscription {
  id: number
  chatId: number
  userId: number
  subscriptionType: 'daily' | 'weekly' | 'alerts' | 'analysis'
  isActive: boolean
  preferences: {
    fearGreedThreshold?: number
    marketAlerts?: boolean
    analysisReports?: boolean
  }
  createdAt: Date
  updatedAt: Date
}

/**
 * Subscription Service
 * Manages user subscriptions for Fear & Greed Index notifications
 */
export class SubscriptionService {
  private static instance: SubscriptionService

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService()
    }
    return SubscriptionService.instance
  }

  /**
   * Subscribe user to notifications
   * @param chatId - Telegram chat ID
   * @param userId - User ID
   * @param subscriptionType - Type of subscription
   * @param preferences - User preferences
   */
  async subscribe(
    chatId: number,
    userId: number,
    subscriptionType: 'daily' | 'weekly' | 'alerts' | 'analysis',
    preferences: any = {}
  ): Promise<{
    success: boolean
    subscription?: Subscription
    error?: string
  }> {
    try {
      // Check if subscription already exists
      const existingSubscription = await this.getSubscriptionByChatId(chatId)
      
      if (existingSubscription) {
        // Update existing subscription
        const updatedSubscription = await this.updateSubscription(
          existingSubscription.id,
          {
            subscriptionType,
            isActive: true,
            preferences: { ...existingSubscription.preferences, ...preferences }
          }
        )
        
        return {
          success: true,
          subscription: updatedSubscription || existingSubscription
        }
      }

      // Create new subscription
      const subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'> = {
        chatId,
        userId,
        subscriptionType,
        isActive: true,
        preferences
      }

      // In a real implementation, this would save to database
      const newSubscription: Subscription = {
        id: Date.now(), // Temporary ID
        ...subscription,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      logger.info(`[SubscriptionService] New subscription created: ${subscriptionType} for chat ${chatId}`)
      
      return {
        success: true,
        subscription: newSubscription
      }
    } catch (error) {
      logger.error('[SubscriptionService] Error creating subscription:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Unsubscribe user from notifications
   * @param chatId - Telegram chat ID
   */
  async unsubscribe(chatId: number): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const subscription = await this.getSubscriptionByChatId(chatId)
      
      if (!subscription) {
        return {
          success: false,
          error: 'Subscription not found'
        }
      }

      await this.updateSubscription(subscription.id, { isActive: false })
      
      logger.info(`[SubscriptionService] Subscription deactivated for chat ${chatId}`)
      
      return { success: true }
    } catch (error) {
      logger.error('[SubscriptionService] Error unsubscribing:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Get subscription by chat ID
   * @param chatId - Telegram chat ID
   */
  async getSubscriptionByChatId(chatId: number): Promise<Subscription | null> {
    try {
      // In a real implementation, this would query the database
      // For now, return null (no existing subscription)
      return null
    } catch (error) {
      logger.error('[SubscriptionService] Error getting subscription:', error)
      return null
    }
  }

  /**
   * Update subscription
   * @param subscriptionId - Subscription ID
   * @param updates - Updates to apply
   */
  async updateSubscription(
    subscriptionId: number,
    updates: Partial<Subscription>
  ): Promise<Subscription | null> {
    try {
      // In a real implementation, this would update the database
      logger.info(`[SubscriptionService] Subscription ${subscriptionId} updated`)
      return null
    } catch (error) {
      logger.error('[SubscriptionService] Error updating subscription:', error)
      return null
    }
  }

  /**
   * Get all active subscriptions
   * @param subscriptionType - Optional filter by subscription type
   */
  async getActiveSubscriptions(subscriptionType?: string): Promise<Subscription[]> {
    try {
      // In a real implementation, this would query the database
      // For now, return empty array
      return []
    } catch (error) {
      logger.error('[SubscriptionService] Error getting active subscriptions:', error)
      return []
    }
  }

  /**
   * Get all bot subscribers (from environment variable for now)
   * In the future, this will be replaced with database queries
   */
  async getAllSubscribers(): Promise<number[]> {
    try {
      // Get chat IDs from environment variable
      // Format: TELEGRAM_CHAT_IDS=123456789,987654321
      const chatIdsEnv = process.env.TELEGRAM_CHAT_IDS || ''

      if (!chatIdsEnv) {
        logger.warn('[SubscriptionService] No TELEGRAM_CHAT_IDS environment variable set')
        return []
      }

      const chatIds = chatIdsEnv
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id))

      logger.info(`[SubscriptionService] Found ${chatIds.length} subscribers from environment`)
      return chatIds
    } catch (error) {
      logger.error('[SubscriptionService] Error getting all subscribers:', error)
      return []
    }
  }

  /**
   * Get subscribers for daily summary
   */
  async getDailySubscribers(): Promise<number[]> {
    try {
      // For now, return all subscribers
      // In the future, this will filter by subscription type
      return await this.getAllSubscribers()
    } catch (error) {
      logger.error('[SubscriptionService] Error getting daily subscribers:', error)
      return []
    }
  }

  /**
   * Get subscribers for weekly analysis
   */
  async getWeeklySubscribers(): Promise<number[]> {
    try {
      // For now, return all subscribers
      // In the future, this will filter by subscription type
      return await this.getAllSubscribers()
    } catch (error) {
      logger.error('[SubscriptionService] Error getting weekly subscribers:', error)
      return []
    }
  }

  /**
   * Get subscribers for alerts
   */
  async getAlertSubscribers(): Promise<number[]> {
    try {
      // For now, return all subscribers
      // In the future, this will filter by subscription type
      return await this.getAllSubscribers()
    } catch (error) {
      logger.error('[SubscriptionService] Error getting alert subscribers:', error)
      return []
    }
  }

  /**
   * Get subscribers for analysis reports
   */
  async getAnalysisSubscribers(): Promise<number[]> {
    try {
      // For now, return all subscribers
      // In the future, this will filter by subscription type
      return await this.getAllSubscribers()
    } catch (error) {
      logger.error('[SubscriptionService] Error getting analysis subscribers:', error)
      return []
    }
  }

  /**
   * Check if user should receive alert based on Fear & Greed threshold
   * @param chatId - Telegram chat ID
   * @param fearGreedValue - Current Fear & Greed value
   */
  async shouldSendAlert(chatId: number, fearGreedValue: number): Promise<boolean> {
    try {
      const subscription = await this.getSubscriptionByChatId(chatId)
      
      if (!subscription || !subscription.isActive) {
        return false
      }

      const threshold = subscription.preferences.fearGreedThreshold || 20
      
      // Send alert if Fear & Greed is below threshold (extreme fear) or above 80 (extreme greed)
      return fearGreedValue <= threshold || fearGreedValue >= 80
    } catch (error) {
      logger.error('[SubscriptionService] Error checking alert threshold:', error)
      return false
    }
  }
}
