const { loadStagingSecrets } = require('./secrets-loader');

(async () => {
  try {
    await loadStagingSecrets();
    if (process.env.AUTO_MIGRATE !== 'false') {
      const { runMigrations } = require('../packages/database/migrator');
      await runMigrations();
    }
    require('./server');
  } catch (err) {
    console.error('Failed to load application secrets or initialize database:', err.message);
    process.exit(1);
  }
})();
