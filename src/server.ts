import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application, json, urlencoded } from 'express';
import helmet from 'helmet';
import { authRoutes } from '@modules/auth';
import { authorizationRoutes } from '@modules/authorization';
import { catalogRoutes } from '@modules/catalog';
import { healthRoutes } from '@modules/health/health.routes';
import { userRoutes } from '@modules/user/user.routes';
import { errorHandler } from '@shared/errors/error-handler';
import { metricsMiddleware } from '@shared/middleware/metrics';
import { requestIdMiddleware } from '@shared/middleware/request-id';
import { requestLoggerMiddleware } from '@shared/middleware/request-logger';

/**
 * Creates and configures the Express application.
 * Factory pattern: the app is not bound to a port here,
 * allowing supertest to use it directly in tests.
 */
export function createApp(): Application {
  const app = express();

  // -------- Security headers --------
  app.use(helmet());

  // -------- CORS --------
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Ecommerce-Id'],
      exposedHeaders: ['X-Request-Id'],
      maxAge: 86400,
    }),
  );

  // -------- Compression --------
  app.use(compression());

  // -------- Body & Cookie parsing --------
  app.use(cookieParser());
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // -------- Observability --------
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);
  app.use(metricsMiddleware);

  // -------- Health routes (no auth required) --------
  app.use('/api/v1/health', healthRoutes);

  // -------- Auth routes --------
  app.use('/api/v1/auth', authRoutes);

  // -------- User routes --------
  app.use('/api/v1/users', userRoutes);

  // -------- Authorization admin routes --------
  app.use('/api/v1/authorization', authorizationRoutes);

  // -------- Catalog routes --------
  app.use('/api/v1/catalog', catalogRoutes);

  // -------- 404 --------
  app.use((_req, res) => {
    res.status(404).json({
      status: 'error',
      message: 'Route not found',
    });
  });

  // -------- Global error handler (must be last) --------
  app.use(errorHandler);

  return app;
}
