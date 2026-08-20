import fs from 'fs';
import path from 'path';
import { logger } from '@infrastructure/logging/logger';
import { createUmzug } from '../umzug';

jest.mock('fs');
jest.mock('umzug', () => {
  return {
    Umzug: jest.fn().mockImplementation((options: unknown) => options as Record<string, unknown>),
    SequelizeStorage: jest.fn().mockImplementation(() => ({})),
  };
});
jest.mock('@infrastructure/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock('../connection', () => ({
  getSequelize: jest.fn().mockReturnValue({
    getQueryInterface: jest.fn().mockReturnValue({}),
  }),
}));

describe('Umzug Migrator (createUmzug)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should warn and return empty migrations if directory does not exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const umzugOptions = createUmzug() as any;

    expect(umzugOptions.migrations).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Migrations directory not found'),
    );
  });

  it('should resolve and filter migration files correctly, and execute up/down functions', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue([
      '20260101000000-init.js',
      'invalid-file.txt',
      '20260101000001-test.d.ts',
      '20260101000002-add-table.ts',
    ]);

    const mockUp = jest.fn().mockResolvedValue(undefined);
    const mockDown = jest.fn().mockResolvedValue(undefined);

    const migrationsDir = path.resolve(__dirname, '../migrations');
    const mockMigrationPathJs = path.join(migrationsDir, '20260101000000-init.js');
    const mockMigrationPathTs = path.join(migrationsDir, '20260101000002-add-table.ts');

    jest.doMock(
      mockMigrationPathJs,
      () => ({
        up: mockUp,
        down: mockDown,
      }),
      { virtual: true },
    );

    jest.doMock(
      mockMigrationPathTs,
      () => ({
        up: undefined,
        down: undefined,
      }),
      { virtual: true },
    );

    const umzugOptions = createUmzug() as any;
    expect(umzugOptions.migrations.length).toBe(2);
    expect(umzugOptions.migrations[0].name).toBe('20260101000000-init');
    expect(umzugOptions.migrations[1].name).toBe('20260101000002-add-table');

    // Execute up & down for 20260101000000-init
    await umzugOptions.migrations[0].up();
    expect(mockUp).toHaveBeenCalled();

    await umzugOptions.migrations[0].down();
    expect(mockDown).toHaveBeenCalled();

    // Execute up & down for 20260101000002-add-table (where up/down are undefined)
    await expect(umzugOptions.migrations[1].up()).resolves.toBeUndefined();
    await expect(umzugOptions.migrations[1].down()).resolves.toBeUndefined();
  });

  it('should test logger methods passed to Umzug option', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const umzugOptions = createUmzug() as any;

    if (umzugOptions.logger) {
      umzugOptions.logger.info({ message: 'Info message' });
      expect(logger.info).toHaveBeenCalledWith('Info message');

      umzugOptions.logger.info('Plain info');
      expect(logger.info).toHaveBeenCalledWith('Plain info');

      umzugOptions.logger.warn({ message: 'Warn message' });
      expect(logger.warn).toHaveBeenCalledWith('Warn message');

      umzugOptions.logger.warn('Plain warn');
      expect(logger.warn).toHaveBeenCalledWith('Plain warn');

      umzugOptions.logger.error({ message: 'Error message' });
      expect(logger.error).toHaveBeenCalledWith('Error message');

      umzugOptions.logger.error('Plain error');
      expect(logger.error).toHaveBeenCalledWith('Plain error');

      umzugOptions.logger.debug({ message: 'Debug message' });
      expect(logger.debug).toHaveBeenCalledWith('Debug message');

      umzugOptions.logger.debug('Plain debug');
      expect(logger.debug).toHaveBeenCalledWith('Plain debug');
    }
  });
});
