/**
 * All known event types in the system.
 * Add new events here as modules are added.
 */
export enum EventType {
  // User events
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',

  // Authorization events
  ROLE_ASSIGNED = 'authorization.role_assigned',
  ROLE_REVOKED = 'authorization.role_revoked',
  PERMISSIONS_UPDATED = 'authorization.permissions_updated',

  // Health events
  HEALTH_CHECK_FAILED = 'health.check_failed',

  // System events
  APP_STARTED = 'app.started',
  APP_SHUTTING_DOWN = 'app.shutting_down',
}

/**
 * Base event payload — all events extend this.
 */
export interface BaseEvent<T extends EventType = EventType, P = unknown> {
  type: T;
  payload: P;
  timestamp: Date;
  correlationId?: string;
}

/**
 * Type-safe event map — maps EventType to its payload type.
 */
export interface EventPayloadMap {
  [EventType.USER_CREATED]: { userId: string; email: string };
  [EventType.USER_UPDATED]: { userId: string; changes: Record<string, unknown> };
  [EventType.USER_DELETED]: { userId: string };
  [EventType.ROLE_ASSIGNED]: {
    userId: string;
    roleId: string;
    roleName: string;
    scope: string | null;
  };
  [EventType.ROLE_REVOKED]: { userId: string; roleId: string };
  [EventType.PERMISSIONS_UPDATED]: Record<string, unknown>;
  [EventType.HEALTH_CHECK_FAILED]: { component: string; error: string };
  [EventType.APP_STARTED]: { port: number; environment: string };
  [EventType.APP_SHUTTING_DOWN]: { signal: string };
}

/**
 * Typed event handler function.
 */
export type EventHandler<T extends EventType> = (
  event: BaseEvent<T, EventPayloadMap[T]>,
) => void | Promise<void>;
