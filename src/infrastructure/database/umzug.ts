import fs from 'fs';
import path from 'path';
import { Sequelize, type QueryInterface } from 'sequelize';
import { Umzug, SequelizeStorage, type RunnableMigration } from 'umzug';
import { logger } from '@infrastructure/logging/logger';
import { getSequelize } from './connection';

/**
 * Resolves migration files from the migrations directory.
 * Matches Sequelize CLI naming: YYYYMMDDHHMMSS-name.js (or .ts)
 */
function resolveMigrations(): Array<RunnableMigration<Sequelize>> {
  const migrationsDir = path.resolve(__dirname, 'migrations');

  // Ensure directory exists
  if (!fs.existsSync(migrationsDir)) {
    logger.warn(`Migrations directory not found: ${migrationsDir}`);
    return [];
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d{14}.*\.(ts|js)$/.test(f) && !f.endsWith('.d.ts'))
    .sort();

  return files.map((file) => {
    const name = file.replace(/\.(ts|js)$/, '');
    return {
      name,
      up: async (): Promise<void> => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
        const migration = require(path.join(migrationsDir, file)) as {
          up?: (qi: QueryInterface, seq: typeof Sequelize) => Promise<void>;
        };
        if (typeof migration.up === 'function') {
          await migration.up(getSequelize().getQueryInterface(), Sequelize);
        }
      },
      down: async (): Promise<void> => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
        const migration = require(path.join(migrationsDir, file)) as {
          down?: (qi: QueryInterface, seq: typeof Sequelize) => Promise<void>;
        };
        if (typeof migration.down === 'function') {
          await migration.down(getSequelize().getQueryInterface(), Sequelize);
        }
      },
    };
  });
}

/**
 * Creates and returns a configured Umzug instance.
 * Uses SequelizeStorage — migration state is persisted in a `SequelizeMeta` table.
 */
export function createUmzug(): Umzug<Sequelize> {
  return new Umzug({
    migrations: resolveMigrations(),
    context: getSequelize(),
    storage: new SequelizeStorage({ sequelize: getSequelize() }),
    logger: {
      info: (msg) => logger.info(msg.message ?? msg),
      warn: (msg) => logger.warn(msg.message ?? msg),
      error: (msg) => logger.error(msg.message ?? msg),
      debug: (msg) => logger.debug(msg.message ?? msg),
    },
  });
}
