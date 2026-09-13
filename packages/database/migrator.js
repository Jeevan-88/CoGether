/**
 * Database Migration Engine
 * Discovers and applies versioned SQL migrations in strict sequence.
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

async function runMigrations() {
  const files = await getMigrationFiles();
  logger.info(`Discovered ${files.length} migration file(s) in ${MIGRATIONS_DIR}`);

  const applied = [];

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    logger.info(`Validating / applying migration: ${file}`);
    try {
      await db.query(sql);
      applied.push({ file, success: true });
    } catch (err) {
      logger.error(`Migration failed on file ${file}:`, { error: err });
      throw err;
    }
  }

  logger.info(`Migration cycle complete. Applied ${applied.length} migration(s).`);
  return applied;
}

module.exports = {
  runMigrations,
  getMigrationFiles
};
