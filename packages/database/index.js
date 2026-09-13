const { db, DatabaseClient } = require('./client');
const { runMigrations, getMigrationFiles } = require('./migrator');

module.exports = {
  db,
  DatabaseClient,
  runMigrations,
  getMigrationFiles
};
