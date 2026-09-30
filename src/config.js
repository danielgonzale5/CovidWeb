'use strict';

const REQUIRED = ['DB_HOST', 'DB_USER', 'DB_PASS'];

// Reads configuration from the environment. Values are never logged: errors name
// the variable, not its content.
function loadConfig(env = process.env) {
  const missing = REQUIRED.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  return {
    httpPort: toPort(env.HTTP_PORT, 3000, 'HTTP_PORT'),
    trustProxy: env.TRUST_PROXY === '1',
    // Browsers accept Secure cookies on http://localhost, so only a plain-HTTP
    // deployment on another host needs COOKIE_SECURE=0, and it should not exist.
    cookieSecure: env.COOKIE_SECURE !== '0',
    db: {
      host: env.DB_HOST,
      port: toPort(env.DB_PORT, 3306, 'DB_PORT'),
      user: env.DB_USER,
      password: env.DB_PASS,
      database: env.DB_NAME || 'covidweb',
    },
    maps: {
      mapboxToken: env.MAPBOX_TOKEN || '',
      esriApiKey: env.ESRI_API_KEY || '',
    },
    webhook: {
      secret: env.GITHUB_WEBHOOK_SECRET || '',
      deployDir: env.DEPLOY_DIR || '',
      branch: env.DEPLOY_BRANCH || 'master',
    },
  };
}

function toPort(value, fallback, name) {
  if (value === undefined || value === '') return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a port number`);
  }
  return port;
}

module.exports = { loadConfig };
