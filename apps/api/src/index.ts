/**
 * Main application entry point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './shared/middleware/errorHandler';
import { apiLimiter } from './shared/middleware/rateLimiter';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';
import customerRoutes from './routes/customer.routes';
import dealRoutes from './routes/deal.routes';
import pipelineRoutes from './routes/pipeline.routes';
import taskRoutes from './routes/task.routes';
import contactHistoryRoutes from './routes/contactHistory.routes';

// Create Express app
const app = express();

// Trust proxy for correct IP detection (important when behind Docker/reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Rate limiting
app.use('/api/', apiLimiter);

// Health check (no rate limit)
app.use('/health', healthRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/pipelines', pipelineRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/contact-history', contactHistoryRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = parseInt(env.PORT, 10);

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${env.NODE_ENV}`);
  logger.info(`🌐 CORS origin: ${env.CORS_ORIGIN}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

