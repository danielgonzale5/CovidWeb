'use strict';

const http = require('http');
const { loadConfig } = require('./src/config');
const { createDb } = require('./src/db');
const { createSessionStore, createLoginThrottle } = require('./src/sessions');
const { createGitDeployer } = require('./src/webhook');
const { createApp } = require('./src/app');
const { log } = require('./src/log');

async function main() {
  const config = loadConfig();
  const db = createDb(config.db);
  const sessions = createSessionStore({ secure: config.cookieSecure });
  const throttle = createLoginThrottle();

  let deploy = null;
  if (config.webhook.secret) {
    if (!config.webhook.deployDir) throw new Error('GITHUB_WEBHOOK_SECRET is set but DEPLOY_DIR is not');
    deploy = createGitDeployer({ dir: config.webhook.deployDir, branch: config.webhook.branch, log });
  }

  await db.dashboard(); // fail fast if the database is unreachable or the schema is missing

  const server = http.createServer(createApp({ config, db, sessions, throttle, deploy, log }));
  await new Promise((resolve) => server.listen(config.httpPort, resolve));
  log.info(`http: listening on port ${config.httpPort}`);
  log.info(`webhook: ${deploy ? `enabled for ${config.webhook.branch}` : 'disabled (no GITHUB_WEBHOOK_SECRET)'}`);
  if (!config.cookieSecure) log.warn('session cookies are not marked Secure (COOKIE_SECURE=0)');

  const shutdown = async (signal) => {
    log.info(`${signal} received, shutting down`);
    server.close();
    await db.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  log.error(`startup failed: ${err.message}`);
  process.exit(1);
});
