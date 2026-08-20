import { EventEmitter } from 'events';
import { logger } from '@infrastructure/logging/logger';
import type { EventType, BaseEvent, EventPayloadMap, EventHandler } from './notification.types';

/**
 * Internal event bus that mimics Kafka/RabbitMQ patterns.
 * Modules publish events; other modules subscribe.
 * In production, swap the underlying transport for actual Kafka/RabbitMQ.
 *
 * Key design decisions:
 * - In-process EventEmitter (zero network latency for intra-monolith communication)
 * - Typed events via EventPayloadMap
 * - Async handler support with error isolation (one handler's error doesn't break others)
 * - Logging of all published events at debug level
 */
class NotificationService {
  private readonly emitter = new EventEmitter();
  private readonly maxListeners = 50;

  constructor() {
    this.emitter.setMaxListeners(this.maxListeners);
  }

  /**
   * Publish an event to all subscribers.
   */
  publish<T extends EventType>(type: T, payload: EventPayloadMap[T], correlationId?: string): void {
    const event: BaseEvent<T, EventPayloadMap[T]> = {
      type,
      payload,
      timestamp: new Date(),
      correlationId,
    };

    logger.debug(`Event published: ${type}`, { eventType: type, correlationId });

    // Emit both the specific event type AND a wildcard '*' for catch-all handlers
    this.emitter.emit(type, event);
    this.emitter.emit('*', event);
  }

  /**
   * Subscribe to a specific event type.
   * Returns an unsubscribe function.
   */
  subscribe<T extends EventType>(type: T, handler: EventHandler<T>): () => void {
    const wrappedHandler = (event: BaseEvent<T, EventPayloadMap[T]>): void => {
      Promise.resolve()
        .then(() => handler(event))
        .catch((error) => {
          logger.error(`Error in event handler for "${type}"`, {
            eventType: type,
            error: error instanceof Error ? error.message : String(error),
          });
        });
    };

    this.emitter.on(type, wrappedHandler);

    return () => {
      this.emitter.off(type, wrappedHandler);
    };
  }

  /**
   * Subscribe to ALL events (useful for logging, auditing, dead-letter).
   */
  subscribeToAll(handler: (event: BaseEvent<EventType>) => void | Promise<void>): () => void {
    const wrappedHandler = (event: BaseEvent<EventType>): void => {
      Promise.resolve()
        .then(() => handler(event))
        .catch((error) => {
          logger.error('Error in catch-all event handler', {
            error: error instanceof Error ? error.message : String(error),
          });
        });
    };

    this.emitter.on('*', wrappedHandler);

    return () => {
      this.emitter.off('*', wrappedHandler);
    };
  }

  /**
   * Remove all listeners. Use during graceful shutdown.
   */
  removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }
}

// Singleton export
export const notificationService = new NotificationService();
