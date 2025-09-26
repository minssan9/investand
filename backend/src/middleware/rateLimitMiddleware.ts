import { Request, Response, NextFunction } from 'express';

// 간단한 in-memory rate limiter 구현
interface RateLimitData {
  count: number;
  resetTime: number;
}

const clients = new Map<string, RateLimitData>();

export const rateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const windowMs = parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '900000'); // 15분
  const maxRequests = parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || '100');
  const now = Date.now();
  
  const clientData = clients.get(clientIp);
  
  if (!clientData || now > clientData.resetTime) {
    // 새로운 클라이언트이거나 시간 윈도우가 리셋된 경우
    clients.set(clientIp, {
      count: 1,
      resetTime: now + windowMs
    });
    next();
    return;
  }
  
  if (clientData.count >= maxRequests) {
    // 요청 한도 초과
    res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000 / 60} minutes.`,
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
    });
    return;
  }
  
  // 요청 카운트 증가
  clientData.count++;
  clients.set(clientIp, clientData);
  
  // 응답 헤더에 rate limit 정보 추가
  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', maxRequests - clientData.count);
  res.setHeader('X-RateLimit-Reset', Math.ceil(clientData.resetTime / 1000));
  
  next();
};

// 메모리 정리를 위한 주기적인 cleanup
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of clients.entries()) {
    if (now > data.resetTime) {
      clients.delete(ip);
    }
  }
}, 60000); // 1분마다 정리 