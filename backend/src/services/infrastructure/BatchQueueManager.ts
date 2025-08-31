import { logger } from '@/utils/common/logger'

export interface BatchJob {
  id: string
  source: string
  type: string
  priority: 'high' | 'medium' | 'low'
  payload: any
  attempts: number
  maxAttempts: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  scheduledAt?: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
}

interface PriorityQueue<T> {
  isEmpty(): boolean
  enqueue(item: T): void
  dequeue(): T | undefined
}

class SimplePriorityQueue<T extends BatchJob> implements PriorityQueue<T> {
  private items: T[] = []

  isEmpty(): boolean {
    return this.items.length === 0
  }

  enqueue(item: T): void {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    let inserted = false

    for (let i = 0; i < this.items.length; i++) {
      if (priorityOrder[item.priority] > priorityOrder[this.items[i].priority]) {
        this.items.splice(i, 0, item)
        inserted = true
        break
      }
    }

    if (!inserted) {
      this.items.push(item)
    }
  }

  dequeue(): T | undefined {
    return this.items.shift()
  }

  size(): number {
    return this.items.length
  }
}

interface RateLimiter {
  canProceed(): boolean
  waitForNext(): Promise<void>
}

class SimpleRateLimiter implements RateLimiter {
  private lastRequest = 0
  private readonly interval: number

  constructor(requestsPerSecond: number) {
    this.interval = 1000 / requestsPerSecond
  }

  canProceed(): boolean {
    const now = Date.now()
    return (now - this.lastRequest) >= this.interval
  }

  async waitForNext(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequest
    
    if (timeSinceLastRequest < this.interval) {
      const waitTime = this.interval - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastRequest = Date.now()
  }
}

export class BatchQueueManager {
  private static queues: Map<string, PriorityQueue<BatchJob>> = new Map()
  private static processing: Map<string, boolean> = new Map()
  private static rateLimiters: Map<string, RateLimiter> = new Map()
  private static isInitialized = false

  static initialize(): void {
    if (this.isInitialized) {
      return
    }

    // 기본 큐들 생성
    const defaultQueues = ['dart', 'krx', 'bok', 'external', 'fear-greed']
    
    defaultQueues.forEach(queueName => {
      this.queues.set(queueName, new SimplePriorityQueue<BatchJob>())
      this.processing.set(queueName, false)
      this.rateLimiters.set(queueName, new SimpleRateLimiter(10)) // 초당 10개 요청
    })

    // 주기적인 큐 처리 시작
    this.startQueueProcessors()
    
    this.isInitialized = true
    logger.info('[BatchQueue] 배치 큐 관리자 초기화 완료')
  }

  private static startQueueProcessors(): void {
    this.queues.forEach((queue, queueName) => {
      setInterval(async () => {
        if (!this.processing.get(queueName) && !queue.isEmpty()) {
          await this.processQueue(queueName).catch(error => {
            logger.error(`[BatchQueue] 큐 처리 오류 (${queueName}):`, error)
          })
        }
      }, 5000) // 5초마다 큐 체크
    })
  }

  static async addJob(queueName: string, job: BatchJob): Promise<void> {
    const queue = this.queues.get(queueName)
    
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`)
    }

    queue.enqueue(job)
    logger.info(`[BatchQueue] 작업 추가: ${queueName}/${job.id}`)
  }

  private static async processQueue(queueName: string): Promise<void> {
    if (this.processing.get(queueName)) return

    this.processing.set(queueName, true)
    const queue = this.queues.get(queueName)
    const rateLimiter = this.rateLimiters.get(queueName)

    try {
      while (!queue?.isEmpty()) {
        if (rateLimiter && !rateLimiter.canProceed()) {
          await rateLimiter.waitForNext()
        }

        const job = queue.dequeue()
        if (job) {
          await this.executeJob(job)
        }
      }
    } finally {
      this.processing.set(queueName, false)
    }
  }

  private static async executeJob(job: BatchJob): Promise<void> {
    logger.info(`[BatchQueue] 작업 실행 시작: ${job.id}`)
    
    job.status = 'processing'
    job.startedAt = new Date()
    job.attempts++

    try {
      // 여기서 실제 작업 실행 로직을 구현
      // 현재는 placeholder로 성공 처리
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      job.status = 'completed'
      job.completedAt = new Date()
      
      logger.info(`[BatchQueue] 작업 완료: ${job.id}`)
      
    } catch (error) {
      job.error = (error as Error).message
      
      if (job.attempts < job.maxAttempts) {
        job.status = 'pending'
        // 재시도를 위해 큐에 다시 추가
        setTimeout(() => {
          const queue = this.queues.get(job.source)
          if (queue) {
            queue.enqueue(job)
          }
        }, 5 * 60 * 1000) // 5분 후 재시도
        
        logger.warn(`[BatchQueue] 작업 재시도 예약: ${job.id} (${job.attempts}/${job.maxAttempts})`)
      } else {
        job.status = 'failed'
        logger.error(`[BatchQueue] 작업 최종 실패: ${job.id}`, error)
      }
    }
  }

  static getQueueStatus(queueName?: string): any {
    if (queueName) {
      const queue = this.queues.get(queueName) as SimplePriorityQueue<BatchJob>
      return {
        name: queueName,
        size: queue?.size() || 0,
        processing: this.processing.get(queueName) || false
      }
    }

    const status: any = {}
    this.queues.forEach((queue, name) => {
      status[name] = {
        size: (queue as SimplePriorityQueue<BatchJob>).size(),
        processing: this.processing.get(name) || false
      }
    })

    return status
  }
}