import { Sequelize, type Options } from 'sequelize';
import { config } from '@config/index';
import { logger } from '@infrastructure/logging/logger';
import { dbConnectionStatus } from '@infrastructure/metrics/metrics';

const sequelizeOptions: Options = {
  host: config.database.host,
  port: config.database.port,
  dialect: 'postgres',
  pool: {
    max: config.database.pool.max,
    min: config.database.pool.min,
    acquire: config.database.pool.acquire,
    idle: config.database.pool.idle,
  },
  logging: config.database.logging
    ? (sql: string, timing?: number): void => {
        logger.debug(sql, { durationMs: timing });
      }
    : false,
  define: {
    underscored: true,
    timestamps: true,
    paranoid: false,
  },
};

/**
 * Singleton Sequelize instance.
 * Created lazily — call getSequelize() to obtain it.
 */
let sequelizeInstance: Sequelize | null = null;

export function getSequelize(): Sequelize {
  if (!sequelizeInstance) {
    sequelizeInstance = new Sequelize(
      config.database.name,
      config.database.user,
      config.database.password,
      sequelizeOptions,
    );
  }
  return sequelizeInstance;
}

/**
 * Tests the database connection and updates the health metric.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const sequelize = getSequelize();
    await sequelize.authenticate();
    dbConnectionStatus.set(1);
    return true;
  } catch (error) {
    logger.error('Database health check failed', { error });
    dbConnectionStatus.set(0);
    return false;
  }
}

/**
 * Gracefully closes the database connection pool.
 */
export async function closeDatabase(): Promise<void> {
  if (sequelizeInstance) {
    await sequelizeInstance.close();
    sequelizeInstance = null;
    logger.info('Database connection pool closed');
  }
}
