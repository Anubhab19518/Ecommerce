import { createLogger, format, transports } from 'winston';
import type { Logform } from 'winston';
import { config } from '@config/index';
import { getRequestId } from '@shared/middleware/request-id';

/**
 * Custom format that injects the current request ID (from CLS) into every log entry.
 */
const requestIdFormat = format((info) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  (info as Logform.TransformableInfo & { requestId?: string }).requestId = getRequestId();
  return info;
});

const devFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.colorize(),
  requestIdFormat(),
  // fallow-ignore-next-line complexity
  format.printf((info) => {
    const { timestamp, level, message, requestId, ...meta } = info as {
      timestamp?: string;
      level?: string;
      message?: string;
      requestId?: string;
      [key: string]: unknown;
    };
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp ?? ''} [${requestId ?? 'system'}] ${level ?? ''}: ${message ?? ''}${metaStr}`;
  }),
);

const prodFormat = format.combine(format.timestamp(), requestIdFormat(), format.json());

/**
 * Winston logger instance.
 * - Development: human-readable colored output
 * - Production: structured JSON for Loki/Promtail ingestion
 */
export const logger = createLogger({
  level: config.logging.level,
  transports: [
    new transports.Console({
      format: config.isDevelopment ? devFormat : prodFormat,
      handleExceptions: true,
    }),
  ],
  exitOnError: false,
});
