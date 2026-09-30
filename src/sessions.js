'use strict';

const crypto = require('crypto');

const COOKIE = 'cw_session';

// With TRUST_PROXY=1 the app sits behind exactly one reverse proxy, which appends
// the real client address as the last X-Forwarded-For entry.
function clientIp(req, trustProxy) {
  const forwarded = req.headers['x-forwarded-for'];
  if (trustProxy && forwarded) return forwarded.split(',').pop().trim();
  return req.socket.remoteAddress;
}

function readCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return null;
}

// Server-side sessions kept in memory: the browser only holds a random ID in an
// HttpOnly, SameSite=Strict cookie. A session ends after 30 minutes without use
// or 8 hours in total, whichever comes first.
function createSessionStore({ idleMs = 30 * 60_000, maxAgeMs = 8 * 60 * 60_000, secure = true, now = Date.now } = {}) {
  const sessions = new Map();

  function cookie(value, maxAgeSeconds) {
    const attributes = [`${COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${maxAgeSeconds}`];
    if (secure) attributes.push('Secure');
    return attributes.join('; ');
  }

  function prune() {
    const time = now();
    for (const [id, session] of sessions) {
      if (time - session.lastSeen > idleMs || time - session.created > maxAgeMs) sessions.delete(id);
    }
  }

  return {
    create(res, user) {
      if (sessions.size > 10_000) prune();
      const id = crypto.randomBytes(32).toString('base64url');
      sessions.set(id, { userId: user.id, role: user.role, created: now(), lastSeen: now() });
      res.append('Set-Cookie', cookie(id, Math.floor(maxAgeMs / 1000)));
    },

    get(req) {
      const id = readCookie(req, COOKIE);
      const session = id && sessions.get(id);
      if (!session) return null;
      const time = now();
      if (time - session.lastSeen > idleMs || time - session.created > maxAgeMs) {
        sessions.delete(id);
        return null;
      }
      session.lastSeen = time;
      return session;
    },

    destroy(req, res) {
      const id = readCookie(req, COOKIE);
      if (id) sessions.delete(id);
      res.append('Set-Cookie', cookie('', 0));
    },

    get size() {
      return sessions.size;
    },
  };
}

// Counts failed logins per client address and locks the address out for a while
// once it reaches the limit.
function createLoginThrottle({ maxFailures = 10, lockoutMs = 15 * 60_000, now = Date.now } = {}) {
  const failures = new Map(); // ip -> { count, since }

  return {
    isLocked(ip) {
      const record = failures.get(ip);
      if (!record) return false;
      if (now() - record.since > lockoutMs) {
        failures.delete(ip);
        return false;
      }
      return record.count >= maxFailures;
    },
    fail(ip) {
      if (failures.size > 10_000) failures.clear();
      const record = failures.get(ip) || { count: 0, since: now() };
      failures.set(ip, { count: record.count + 1, since: record.since });
    },
    succeed(ip) {
      failures.delete(ip);
    },
    lockoutSeconds: Math.ceil(lockoutMs / 1000),
  };
}

module.exports = { createSessionStore, createLoginThrottle, clientIp, readCookie, COOKIE };
