import { createNamespace, getNamespace } from 'cls-hooked';
import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const REQUEST_ID_HEADER = 'x-request-id';
const NAMESPACE_NAME = 'request-context';
const REQUEST_ID_KEY = 'requestId';

// Create the continuation-local-storage namespace once
createNamespace(NAMESPACE_NAME);

/**
 * Middleware that attaches a unique request ID to every request.
 * - Uses incoming X-Request-Id header if present, otherwise generates a UUID
 * - Stores the ID in CLS (continuation-local-storage) for log correlation
 * - Echoes the ID back in the X-Request-Id response header
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers[REQUEST_ID_HEADER] as string | undefined) ?? uuidv4();

  // Set on request object for direct access
  (req as Request & { requestId: string }).requestId = requestId;

  // Echo in response header
  res.setHeader(REQUEST_ID_HEADER, requestId);

  // Store in CLS for logger access across async boundaries
  const namespace = getNamespace(NAMESPACE_NAME);
  if (namespace) {
    namespace.run(() => {
      namespace.set(REQUEST_ID_KEY, requestId);
      next();
    });
  } else {
    next();
  }
}

/**
 * Retrieve the current request ID from CLS context.
 * Returns 'unknown' when called outside a request context (e.g., startup).
 */
export function getRequestId(): string {
  const namespace = getNamespace(NAMESPACE_NAME);
  if (!namespace) return 'unknown';
  return (namespace.get(REQUEST_ID_KEY) as string | undefined) ?? 'unknown';
}
