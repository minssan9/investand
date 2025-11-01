import express from 'express'
import { MessagingService } from '@/services/messaging/MessagingService'
import { SubscriptionService } from '@/services/messaging/SubscriptionService'
import { NotificationScheduler } from '@/services/messaging/NotificationScheduler'
import { logger } from '@/utils/common/logger'

const router = express.Router()

// ================================
// MESSAGING ENDPOINTS
// ================================

/**
 * POST /api/messaging/send
 * Send message to specific chat
 */
router.post('/send', async (req, res) => {
  try {
    const { chatId, message, options = {} } = req.body

    if (!chatId || !message) {
      return res.status(400).json({
        success: false,
        error: 'chatId and message are required'
      })
    }

    const messagingService = MessagingService.getInstance()
    const result = await messagingService.sendMessage(chatId, message, options)

    return res.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error sending message:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to send message'
    })
  }
})

/**
 * POST /api/messaging/send-photo
 * Send photo to specific chat
 */
router.post('/send-photo', async (req, res) => {
  try {
    const { chatId, photoPath, caption = '' } = req.body

    if (!chatId || !photoPath) {
      return res.status(400).json({
        success: false,
        error: 'chatId and photoPath are required'
      })
    }

    const messagingService = MessagingService.getInstance()
    const result = await messagingService.sendPhoto(chatId, photoPath, caption)

    return res.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error sending photo:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to send photo'
    })
  }
})

/**
 * POST /api/messaging/send-fear-greed
 * Send Fear & Greed Index update to subscribers
 */
router.post('/send-fear-greed', async (req, res) => {
  try {
    const { chatIds, customMessage } = req.body

    if (!chatIds || !Array.isArray(chatIds)) {
      return res.status(400).json({
        success: false,
        error: 'chatIds array is required'
      })
    }

    const messagingService = MessagingService.getInstance()
    await messagingService.sendFearGreedUpdate(chatIds, customMessage)

    return res.json({
      success: true,
      message: `Fear & Greed update sent to ${chatIds.length} subscribers`
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error sending Fear & Greed update:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to send Fear & Greed update'
    })
  }
})

/**
 * POST /api/messaging/send-daily-summary
 * Send daily market summary
 */
router.post('/send-daily-summary', async (req, res) => {
  try {
    const { chatIds } = req.body

    if (!chatIds || !Array.isArray(chatIds)) {
      return res.status(400).json({
        success: false,
        error: 'chatIds array is required'
      })
    }

    const messagingService = MessagingService.getInstance()
    await messagingService.sendDailySummary(chatIds)

    return res.json({
      success: true,
      message: `Daily summary sent to ${chatIds.length} subscribers`
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error sending daily summary:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to send daily summary'
    })
  }
})

// ================================
// SUBSCRIPTION ENDPOINTS
// ================================

/**
 * POST /api/messaging/subscribe
 * Subscribe user to notifications
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { chatId, userId, subscriptionType, preferences = {} } = req.body

    if (!chatId || !userId || !subscriptionType) {
      return res.status(400).json({
        success: false,
        error: 'chatId, userId, and subscriptionType are required'
      })
    }

    const subscriptionService = SubscriptionService.getInstance()
    const result = await subscriptionService.subscribe(
      chatId,
      userId,
      subscriptionType,
      preferences
    )

    return res.json({
      success: result.success,
      subscription: result.subscription,
      error: result.error
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error creating subscription:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create subscription'
    })
  }
})

/**
 * POST /api/messaging/unsubscribe
 * Unsubscribe user from notifications
 */
router.post('/unsubscribe', async (req, res) => {
  try {
    const { chatId } = req.body

    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: 'chatId is required'
      })
    }

    const subscriptionService = SubscriptionService.getInstance()
    const result = await subscriptionService.unsubscribe(chatId)

    return res.json({
      success: result.success,
      error: result.error
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error unsubscribing:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to unsubscribe'
    })
  }
})

/**
 * GET /api/messaging/subscribers
 * Get all subscribers
 */
router.get('/subscribers', async (req, res) => {
  try {
    const { type } = req.query
    const subscriptionService = SubscriptionService.getInstance()
    
    let subscribers: number[] = []
    
    switch (type) {
      case 'daily':
        subscribers = await subscriptionService.getDailySubscribers()
        break
      case 'weekly':
        subscribers = await subscriptionService.getWeeklySubscribers()
        break
      case 'alerts':
        subscribers = await subscriptionService.getAlertSubscribers()
        break
      case 'analysis':
        subscribers = await subscriptionService.getAnalysisSubscribers()
        break
      default:
        // Get all subscribers
        const daily = await subscriptionService.getDailySubscribers()
        const weekly = await subscriptionService.getWeeklySubscribers()
        const alerts = await subscriptionService.getAlertSubscribers()
        const analysis = await subscriptionService.getAnalysisSubscribers()
        subscribers = [...new Set([...daily, ...weekly, ...alerts, ...analysis])]
    }

    return res.json({
      success: true,
      subscribers,
      count: subscribers.length,
      type: type || 'all'
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error getting subscribers:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to get subscribers'
    })
  }
})

// ================================
// NOTIFICATION SCHEDULER ENDPOINTS
// ================================

/**
 * POST /api/messaging/scheduler/start
 * Start notification scheduler
 */
router.post('/scheduler/start', async (req, res) => {
  try {
    const scheduler = NotificationScheduler.getInstance()
    scheduler.start()

    return res.json({
      success: true,
      message: 'Notification scheduler started'
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error starting scheduler:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to start scheduler'
    })
  }
})

/**
 * POST /api/messaging/scheduler/stop
 * Stop notification scheduler
 */
router.post('/scheduler/stop', async (req, res) => {
  try {
    const scheduler = NotificationScheduler.getInstance()
    scheduler.stop()

    return res.json({
      success: true,
      message: 'Notification scheduler stopped'
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error stopping scheduler:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to stop scheduler'
    })
  }
})

/**
 * GET /api/messaging/scheduler/status
 * Get scheduler status
 */
router.get('/scheduler/status', async (req, res) => {
  try {
    const scheduler = NotificationScheduler.getInstance()
    const status = scheduler.getStatus()

    return res.json({
      success: true,
      status
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error getting scheduler status:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to get scheduler status'
    })
  }
})

/**
 * POST /api/messaging/scheduler/send-immediate
 * Send immediate update to subscribers
 */
router.post('/scheduler/send-immediate', async (req, res) => {
  try {
    const { chatIds } = req.body

    if (!chatIds || !Array.isArray(chatIds)) {
      return res.status(400).json({
        success: false,
        error: 'chatIds array is required'
      })
    }

    const scheduler = NotificationScheduler.getInstance()
    await scheduler.sendImmediateUpdate(chatIds)

    return res.json({
      success: true,
      message: `Immediate update sent to ${chatIds.length} subscribers`
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error sending immediate update:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to send immediate update'
    })
  }
})

/**
 * POST /api/messaging/scheduler/send-analysis
 * Send market analysis to subscribers
 */
router.post('/scheduler/send-analysis', async (req, res) => {
  try {
    const { chatIds } = req.body

    if (!chatIds || !Array.isArray(chatIds)) {
      return res.status(400).json({
        success: false,
        error: 'chatIds array is required'
      })
    }

    const scheduler = NotificationScheduler.getInstance()
    await scheduler.sendMarketAnalysis(chatIds)

    return res.json({
      success: true,
      message: `Market analysis sent to ${chatIds.length} subscribers`
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error sending market analysis:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to send market analysis'
    })
  }
})

// ================================
// BOT MANAGEMENT ENDPOINTS
// ================================

/**
 * GET /api/messaging/bot/info
 * Get bot information
 */
router.get('/bot/info', async (req, res) => {
  try {
    const messagingService = MessagingService.getInstance()
    const result = await messagingService.getBotInfo()

    return res.json({
      success: result.success,
      botInfo: result.botInfo,
      error: result.error
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error getting bot info:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to get bot info'
    })
  }
})

/**
 * POST /api/messaging/bot/webhook
 * Set webhook for the bot
 */
router.post('/bot/webhook', async (req, res) => {
  try {
    const { webhookUrl } = req.body

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'webhookUrl is required'
      })
    }

    const messagingService = MessagingService.getInstance()
    const result = await messagingService.setWebhook(webhookUrl)

    return res.json({
      success: result.success,
      result: result.result,
      error: result.error
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error setting webhook:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to set webhook'
    })
  }
})

/**
 * DELETE /api/messaging/bot/webhook
 * Delete webhook
 */
router.delete('/bot/webhook', async (req, res) => {
  try {
    const messagingService = MessagingService.getInstance()
    const result = await messagingService.deleteWebhook()

    return res.json({
      success: result.success,
      result: result.result,
      error: result.error
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error deleting webhook:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete webhook'
    })
  }
})

export default router
