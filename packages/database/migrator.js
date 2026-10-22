/**
 * Database Migration Engine
 * Discovers and applies versioned SQL migrations in strict sequence with
 * persistent migration tracking and per-migration transactional safety.
 */

const fs = require('fs');
const path = require('path');
const { db } = require('./client');
const { logger } = require('../observability');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function ensureMigrationTrackingTable(client = db) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(client = db) {
  await ensureMigrationTrackingTable(client);
  const res = await client.query('SELECT version FROM public.schema_migrations ORDER BY version ASC');
  return new Set(res.rows.map((r) => r.version));
}

async function runMigrations() {
  const files = await getMigrationFiles();
  logger.info(`Discovered ${files.length} migration file(s) in ${MIGRATIONS_DIR}`);

  await ensureMigrationTrackingTable();
  const appliedSet = await getAppliedMigrations();
  const applied = [];

  for (const file of files) {
    if (appliedSet.has(file)) {
      logger.debug(`Migration already applied, skipping: ${file}`);
      continue;
    }

    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    logger.info(`Applying migration in transaction: ${file}`);
    
    // Execute within a safe, isolated transaction
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO public.schema_migrations (version, applied_at) VALUES ($1, NOW()) ON CONFLICT (version) DO NOTHING',
        [file]
      );
      await client.query('COMMIT');
      applied.push({ file, success: true });
      appliedSet.add(file);
      logger.info(`Successfully committed migration: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      logger.error(`Migration transaction failed and was rolled back for ${file}:`, { error: err.message });
      throw err;
    } finally {
      client.release();
    }
  }

  logger.info(`Migration cycle complete. Applied ${applied.length} new migration(s). Total applied: ${appliedSet.size}`);
  return applied;
}

module.exports = {
  runMigrations,
  getMigrationFiles,
  getAppliedMigrations,
  ensureMigrationTrackingTable
};

if (require.main === module) {
  runMigrations()
    .then((applied) => {
      console.log(`[Migrator] Migrations finished. Applied ${applied.length} new migration(s).`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migrator] Migration run failed:', err);
      process.exit(1);
    });
}

