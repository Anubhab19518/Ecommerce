import { logger } from '@infrastructure/logging/logger';
import { createUmzug } from './umzug';

/**
 * Retries an async operation with exponential backoff.
 */
// fallow-ignore-next-line complexity
async function withRetry<T>(
  fn: () => Promise<T>,
  operation: string,
  maxAttempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxAttempts) break;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      logger.warn(
        `Migration ${operation} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms`,
        { error: lastError.message },
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Runs all pending migrations.
 * Each migration is transaction-wrapped by Umzug.
 * The entire run is retried up to 3 times with exponential backoff.
 */
export async function migrateUp(): Promise<void> {
  const umzug = createUmzug();

  logger.info('Checking for pending migrations...');
  const pending = await umzug.pending();

  if (pending.length === 0) {
    logger.info('No pending migrations — database is up to date');
    return;
  }

  logger.info(
    `Found ${pending.length} pending migration(s): ${pending.map((m) => m.name).join(', ')}`,
  );

  await withRetry(
    async () => {
      const migrations = await umzug.up();
      logger.info(
        `Successfully ran ${migrations.length} migration(s): ${migrations.map((m) => m.name).join(', ')}`,
      );
    },
    'up',
    3,
    2000,
  );
}

/**
 * Rolls back the most recent migration.
 */
export async function migrateDown(): Promise<void> {
  const umzug = createUmzug();
  await withRetry(
    async () => {
      const migrations = await umzug.down();
      if (migrations.length === 0) {
        logger.info('No migrations to roll back');
      } else {
        logger.info(`Rolled back migration(s): ${migrations.map((m) => m.name).join(', ')}`);
      }
    },
    'down',
    3,
    2000,
  );
}

/**
 * Prints migration status (pending vs applied).
 */
export async function migrationStatus(): Promise<void> {
  const umzug = createUmzug();
  const executed = await umzug.executed();
  const pending = await umzug.pending();

  /* eslint-disable no-console */
  console.log('\n=== Migration Status ===');
  console.log(`Applied (${executed.length}):`);
  executed.forEach((m) => console.log(`  ✓ ${m.name}`));
  console.log(`Pending (${pending.length}):`);
  pending.forEach((m) => console.log(`  ○ ${m.name}`));
  console.log('');
  /* eslint-enable no-console */
}

/**
 * Dry-run: shows which migrations WOULD be applied without running them.
 * Useful for CI validation.
 */
export async function migrateDryRun(): Promise<void> {
  const umzug = createUmzug();
  const pending = await umzug.pending();

  /* eslint-disable no-console */
  console.log('\n=== Migration Dry Run ===');
  if (pending.length === 0) {
    console.log('No pending migrations.');
  } else {
    console.log(`Would apply ${pending.length} migration(s):`);
    pending.forEach((m) => console.log(`  → ${m.name}`));
  }
  console.log('');
  /* eslint-enable no-console */
}

async function runCliCommand(command?: string): Promise<void> {
  const handlers: Record<string, () => Promise<void>> = {
    up: migrateUp,
    down: migrateDown,
    status: migrationStatus,
    'dry-run': migrateDryRun,
  };

  const handler = command ? handlers[command] : undefined;
  if (!handler) {
    // eslint-disable-next-line no-console
    console.error(`Usage: ts-node migrator.ts [up|down|status|dry-run]`);
    process.exit(1);
  }

  await handler();
}

// ---- CLI entry ----
if (require.main === module) {
  const command = process.argv[2];
  runCliCommand(command)
    .then(() => process.exit(0))
    .catch((error) => {
      const msg = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.error(`Migration ${command} failed:`, msg);
      process.exit(1);
    });
}
