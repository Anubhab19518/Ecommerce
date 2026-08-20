import { notificationService } from '../notification.service';
import { EventType } from '../notification.types';

jest.mock('@infrastructure/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('NotificationService - publish & subscribe', () => {
  afterEach(() => {
    notificationService.removeAllListeners();
  });

  it('should deliver events to subscribers', (done) => {
    notificationService.subscribe(EventType.USER_CREATED, (event) => {
      expect(event.type).toBe(EventType.USER_CREATED);
      expect(event.payload.userId).toBe('123');
      expect(event.payload.email).toBe('test@test.com');
      expect(event.timestamp).toBeInstanceOf(Date);
      done();
    });

    notificationService.publish(EventType.USER_CREATED, {
      userId: '123',
      email: 'test@test.com',
    });
  });

  it('should pass correlationId when provided', (done) => {
    notificationService.subscribe(EventType.USER_DELETED, (event) => {
      expect(event.correlationId).toBe('req-456');
      done();
    });

    notificationService.publish(EventType.USER_DELETED, { userId: '1' }, 'req-456');
  });
});

describe('NotificationService - subscribeToAll & management', () => {
  afterEach(() => {
    notificationService.removeAllListeners();
  });

  it('should receive all event types', (done) => {
    const received: string[] = [];

    notificationService.subscribeToAll((event) => {
      received.push(event.type);
      if (received.length === 2) {
        expect(received).toContain(EventType.USER_CREATED);
        expect(received).toContain(EventType.APP_STARTED);
        done();
      }
    });

    notificationService.publish(EventType.USER_CREATED, {
      userId: '1',
      email: 'a@b.com',
    });
    notificationService.publish(EventType.APP_STARTED, {
      port: 3000,
      environment: 'test',
    });
  });

  it('should stop receiving events after unsubscribe', () => {
    const handler = jest.fn();
    const unsubscribe = notificationService.subscribe(EventType.USER_DELETED, handler);

    unsubscribe();

    notificationService.publish(EventType.USER_DELETED, { userId: '1' });

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(handler).not.toHaveBeenCalled();
        resolve();
      }, 50);
    });
  });

  it('should not crash when a handler throws', () => {
    notificationService.subscribe(EventType.USER_CREATED, () => {
      throw new Error('Handler error');
    });

    expect(() => {
      notificationService.publish(EventType.USER_CREATED, {
        userId: '1',
        email: 'a@b.com',
      });
    }).not.toThrow();
  });
});
