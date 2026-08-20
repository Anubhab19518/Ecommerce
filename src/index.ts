import type { Server } from 'http';
import { config } from '@config/index';
import { getSequelize, closeDatabase } from '@infrastructure/database/connection';
import { migrateUp } from '@infrastructure/database/migrator';
import { logger } from '@infrastructure/logging/logger';
import { getRedis, closeRedis } from '@infrastructure/redis/connection';
import { notificationService, EventType } from '@modules/notification';
import { createApp } from './server';

let server: Server | null = null;

async function performShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — shutting down gracefully`);
  notificationService.publish(EventType.APP_SHUTTING_DOWN, { signal });

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((err) => (err ? reject(err) : resolve()));
    });
    logger.info('HTTP server closed');
  }

  await closeDatabase();
  await closeRedis();
  notificationService.removeAllListeners();

  logger.info('Graceful shutdown complete');
  process.exit(0);
}

function registerShutdownHandlers(): void {
  process.on('SIGTERM', () => void performShutdown('SIGTERM'));
  process.on('SIGINT', () => void performShutdown('SIGINT'));
}

/**
 * Bootstrap the application:
 * 1. Verify database connectivity
 * 2. Run pending migrations
 * 3. Verify Redis connectivity
 * 4. Start the HTTP server
 * 5. Publish APP_STARTED event
 */
async function bootstrap(): Promise<void> {
  logger.info('Connecting to PostgreSQL...');
  await getSequelize().authenticate();
  logger.info('PostgreSQL connection established');

  logger.info('Running database migrations...');
  await migrateUp();
  logger.info('Migrations complete');

  logger.info('Connecting to Redis...');
  await getRedis().ping();
  logger.info('Redis connection established');

  const app = createApp();

  server = app.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port}`, {
      environment: config.nodeEnv,
      port: config.port,
    });

    notificationService.publish(EventType.APP_STARTED, {
      port: config.port,
      environment: config.nodeEnv,
    });
  });

  registerShutdownHandlers();
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
