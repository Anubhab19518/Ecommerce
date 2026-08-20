import type { Request, Response, NextFunction } from 'express';

/** Standard API response envelope */
export interface ApiResponse<T = unknown> {
  status: 'ok' | 'error';
  data?: T;
  message?: string;
  requestId?: string;
}

/** Health check component status */
export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  latencyMs?: number;
  error?: string;
}

/** Health check response */
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  uptime: number;
  checks: Record<string, HealthCheck>;
}

/** Typed Express request handler */
export type TypedRequestHandler<TParams = unknown, TBody = unknown, TQuery = unknown> = (
  req: Request<TParams, unknown, TBody, TQuery>,
  res: Response,
  next: NextFunction,
) => Promise<void> | void;

/** Middleware function */
export type MiddlewareFn = (req: Request, res: Response, next: NextFunction) => void;
