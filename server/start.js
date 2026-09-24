const { loadStagingSecrets } = require('./secrets-loader');

(async () => {
  try {
    await loadStagingSecrets();
    require('./server');
  } catch (err) {
    console.error('Failed to load application secrets:', err.message);
    process.exit(1);
  }
})();
