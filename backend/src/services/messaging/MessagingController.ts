import { logger } from '@/utils/common/logger'
import { MessagingService } from './MessagingService'
import { SubscriptionService } from './SubscriptionService'
import { NotificationScheduler } from './NotificationScheduler'
import { TelegramBotHandler } from './TelegramBotHandler'

/**
 * Messaging Controller
 * Main controller for all messaging operations
 */
export class MessagingController {
  private static instance: MessagingController
  private messagingService: MessagingService
  private subscriptionService: SubscriptionService
  private scheduler: NotificationScheduler
  private botHandler: TelegramBotHandler
  private isInitialized = false

  private constructor() {
    this.messagingService = MessagingService.getInstance()
    this.subscriptionService = SubscriptionService.getInstance()
    this.scheduler = NotificationScheduler.getInstance()
    this.botHandler = new TelegramBotHandler()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MessagingController {
    if (!MessagingController.instance) {
      MessagingController.instance = new MessagingController()
    }
    return MessagingController.instance
  }

  /**
   * Initialize the messaging system
   * @param bot - Telegram bot instance
   */
  async initialize(bot: any): Promise<void> {
    try {
      // Initialize messaging service
      this.messagingService.initialize(bot)
      
      // Start notification scheduler
      this.scheduler.start()
      
      this.isInitialized = true
      logger.info('[MessagingController] Messaging system initialized successfully')
    } catch (error) {
      logger.error('[MessagingController] Error initializing messaging system:', error)
      throw error
    }
  }

  /**
   * Handle incoming webhook from Telegram
   * @param update - Telegram update object
   */
  async handleWebhook(update: any): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('Messaging system not initialized')
      }

      if (update.message) {
        await this.botHandler.handleMessage(update.message)
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query)
      }
    } catch (error) {
      logger.error('[MessagingController] Error handling webhook:', error)
    }
  }

  /**
   * Handle callback queries from inline keyboards
   * @param callbackQuery - Telegram callback query object
   */
  private async handleCallbackQuery(callbackQuery: any): Promise<void> {
    try {
      const chatId = callbackQuery.message.chat.id
      const data = callbackQuery.data

      // Handle different callback data
      switch (data) {
        case 'subscribe_daily':
          await this.subscriptionService.subscribe(chatId, callbackQuery.from.id, 'daily')
          await this.messagingService.sendMessage(chatId, '✅ 일일 요약 구독이 완료되었습니다!')
          break
        case 'subscribe_weekly':
          await this.subscriptionService.subscribe(chatId, callbackQuery.from.id, 'weekly')
          await this.messagingService.sendMessage(chatId, '✅ 주간 분석 구독이 완료되었습니다!')
          break
        case 'subscribe_alerts':
          await this.subscriptionService.subscribe(chatId, callbackQuery.from.id, 'alerts')
          await this.messagingService.sendMessage(chatId, '✅ 시장 알림 구독이 완료되었습니다!')
          break
        default:
          await this.messagingService.sendMessage(chatId, '❓ 알 수 없는 요청입니다.')
      }
    } catch (error) {
      logger.error('[MessagingController] Error handling callback query:', error)
    }
  }

  /**
   * Send Fear & Greed update to all daily subscribers
   */
  async sendDailyUpdate(): Promise<void> {
    try {
      const subscribers = await this.subscriptionService.getDailySubscribers()
      if (subscribers.length > 0) {
        await this.messagingService.sendFearGreedUpdate(subscribers)
        logger.info(`[MessagingController] Daily update sent to ${subscribers.length} subscribers`)
      }
    } catch (error) {
      logger.error('[MessagingController] Error sending daily update:', error)
    }
  }

  /**
   * Send weekly analysis to all weekly subscribers
   */
  async sendWeeklyAnalysis(): Promise<void> {
    try {
      const subscribers = await this.subscriptionService.getWeeklySubscribers()
      if (subscribers.length > 0) {
        await this.scheduler.sendMarketAnalysis(subscribers)
        logger.info(`[MessagingController] Weekly analysis sent to ${subscribers.length} subscribers`)
      }
    } catch (error) {
      logger.error('[MessagingController] Error sending weekly analysis:', error)
    }
  }

  /**
   * Send alert to subscribers based on Fear & Greed threshold
   * @param fearGreedValue - Current Fear & Greed value
   */
  async sendAlertIfNeeded(fearGreedValue: number): Promise<void> {
    try {
      const alertSubscribers = await this.subscriptionService.getAlertSubscribers()
      
      for (const chatId of alertSubscribers) {
        const shouldAlert = await this.subscriptionService.shouldSendAlert(chatId, fearGreedValue)
        
        if (shouldAlert) {
          await this.messagingService.sendFearGreedUpdate([chatId])
        }
      }
    } catch (error) {
      logger.error('[MessagingController] Error sending alerts:', error)
    }
  }

  /**
   * Get messaging system status
   */
  getStatus(): {
    isInitialized: boolean
    schedulerStatus: any
    subscriberCounts: {
      daily: number
      weekly: number
      alerts: number
      analysis: number
    }
  } {
    return {
      isInitialized: this.isInitialized,
      schedulerStatus: this.scheduler.getStatus(),
      subscriberCounts: {
        daily: 0, // Would be populated from database in real implementation
        weekly: 0,
        alerts: 0,
        analysis: 0
      }
    }
  }

  /**
   * Shutdown the messaging system
   */
  async shutdown(): Promise<void> {
    try {
      this.scheduler.stop()
      this.isInitialized = false
      logger.info('[MessagingController] Messaging system shutdown complete')
    } catch (error) {
      logger.error('[MessagingController] Error during shutdown:', error)
    }
  }
}
