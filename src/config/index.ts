import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Required environment variable "${name}" is not set`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) throw new Error(`Environment variable "${name}" must be an integer`);
  return parsed;
}

export const config = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: optionalInt('PORT', 3000),
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',

  database: {
    host: required('DB_HOST'),
    port: optionalInt('DB_PORT', 5432),
    name: required('DB_NAME'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    pool: {
      max: optionalInt('DB_POOL_MAX', 20),
      min: optionalInt('DB_POOL_MIN', 2),
      acquire: optionalInt('DB_POOL_ACQUIRE_MS', 30000),
      idle: optionalInt('DB_POOL_IDLE_MS', 10000),
    },
    logging: optional('DB_LOGGING', 'false') === 'true',
  },

  redis: {
    host: required('REDIS_HOST'),
    port: optionalInt('REDIS_PORT', 6379),
    password: optional('REDIS_PASSWORD', ''),
    db: optionalInt('REDIS_DB', 0),
    maxRetriesPerRequest: optionalInt('REDIS_MAX_RETRIES', 3),
    retryDelayMs: optionalInt('REDIS_RETRY_DELAY_MS', 1000),
  },

  authorization: {
    cacheTtlSeconds: optionalInt('AUTHZ_CACHE_TTL_SECONDS', 300),
  },

  logging: {
    level: optional('LOG_LEVEL', 'info'),
  },
} as const;
