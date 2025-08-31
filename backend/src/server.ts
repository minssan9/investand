import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';

// 환경변수 로드
dotenv.config();

// 라우터 import
import apiRoutes from '@/routes/api';
import fearGreedRoutes from '@/routes/fearGreed';
import dataRoutes from '@/routes/data';
import adminRoutes from '@/routes/admin';
import dartRoutes from '@/routes/dartRoutes';

// 미들웨어 import
import { errorHandler } from '@/middleware/errorHandler';
import { rateLimiter } from '@/middleware/rateLimiter';
import { requestLogger } from '@/middleware/logger';

// 유틸리티 import
import { logger } from '@/utils/common/logger';
import { startDataCollectionScheduler } from '@/services/infrastructure/scheduler';

const app = express();
const PORT = process.env.PORT || 3000;

// 보안 미들웨어
if (process.env.HELMET_ENABLED === 'true') {
  app.use(helmet());
}

// CORS 설정
if (process.env.CORS_ENABLED === 'true') {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8082'];
  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
}

// 기본 미들웨어
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 로깅 미들웨어
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => console.log(message.trim())
    }
  }));
}
app.use(requestLogger);

// Rate limiting
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// API 라우트
app.use('/api', apiRoutes);
app.use('/api/fear-greed', fearGreedRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dart', dartRoutes);

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: 'KOSPI Fear & Greed Index API Server',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      fearGreedIndex: '/api/fear-greed',
      marketData: '/api/data',
      dart: '/api/dart',
      admin: '/api/admin',
      health: '/health'
    }
  });
});

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// 에러 핸들러
app.use(errorHandler);

// 서버 시작
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📊 환경: ${process.env.NODE_ENV}`);
  console.log(`🌐 CORS 허용 도메인: ${process.env.ALLOWED_ORIGINS}`);
  
  // 데이터 수집 스케줄러 시작
  if (process.env.NODE_ENV === 'production') {
    startDataCollectionScheduler();
    console.log('📅 데이터 수집 스케줄러가 시작되었습니다.');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM 신호를 받았습니다. 서버를 종료합니다...');
  server.close(() => {
    console.log('서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT 신호를 받았습니다. 서버를 종료합니다...');
  server.close(() => {
    console.log('서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});

export default app; 