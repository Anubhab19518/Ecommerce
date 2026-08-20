import { getRequestId } from '@shared/middleware/request-id';
import { logger } from '../logger';

jest.mock('@shared/middleware/request-id', () => ({
  getRequestId: jest.fn(),
}));

describe('Winston Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be created and exported as a Winston Logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should log messages without crashing', () => {
    (getRequestId as jest.Mock).mockReturnValue('req-123');
    expect(() => logger.info('Test log message', { key: 'value' })).not.toThrow();
  });

  it('should log messages when request ID is undefined', () => {
    (getRequestId as jest.Mock).mockReturnValue(undefined);
    expect(() => logger.info('Test log message without request ID')).not.toThrow();
  });
});
