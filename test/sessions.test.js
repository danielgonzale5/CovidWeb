'use strict';

// CW-02 and CW-09: sessions, login throttling and password hashing.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSessionStore, createLoginThrottle, readCookie } = require('../src/sessions');
const { hashPassword, verifyPassword } = require('../src/passwords');

function fakeRes() {
  const cookies = [];
  return { cookies, append: (name, value) => cookies.push(value) };
}
const reqWith = (cookieHeader) => ({ headers: { cookie: cookieHeader } });

test('a session is found by its cookie and expires when idle', () => {
  let now = 0;
  const store = createSessionStore({ idleMs: 1000, maxAgeMs: 10_000, now: () => now });
  const res = fakeRes();
  store.create(res, { id: 7, role: 2 });
  const cookie = res.cookies[0].split(';')[0];
  assert.match(cookie, /^cw_session=[\w-]{43}$/);
  assert.deepEqual({ ...store.get(reqWith(cookie)), created: 0, lastSeen: 0 }, { userId: 7, role: 2, created: 0, lastSeen: 0 });
  now = 900;
  assert.ok(store.get(reqWith(cookie)));
  now = 1901;
  assert.equal(store.get(reqWith(cookie)), null);
});

test('a session ends after its maximum age even when in use', () => {
  let now = 0;
  const store = createSessionStore({ idleMs: 1000, maxAgeMs: 2500, now: () => now });
  const res = fakeRes();
  store.create(res, { id: 7, role: 2 });
  const cookie = res.cookies[0].split(';')[0];
  for (now = 500; now <= 2500; now += 500) assert.ok(store.get(reqWith(cookie)));
  now = 2600;
  assert.equal(store.get(reqWith(cookie)), null);
});

test('an unknown or forged session ID gets nothing', () => {
  const store = createSessionStore();
  assert.equal(store.get(reqWith('cw_session=forged')), null);
  assert.equal(store.get(reqWith('')), null);
});

test('reads the right cookie among several', () => {
  assert.equal(readCookie(reqWith('a=1; cw_session=abc; b=2'), 'cw_session'), 'abc');
  assert.equal(readCookie(reqWith('xcw_session=abc'), 'cw_session'), null);
});

test('the throttle locks an address after repeated failures and forgets it later', () => {
  let now = 0;
  const throttle = createLoginThrottle({ maxFailures: 3, lockoutMs: 1000, now: () => now });
  for (let i = 0; i < 3; i += 1) throttle.fail('192.0.2.1');
  assert.equal(throttle.isLocked('192.0.2.1'), true);
  assert.equal(throttle.isLocked('192.0.2.2'), false);
  now = 1001;
  assert.equal(throttle.isLocked('192.0.2.1'), false);
});

test('passwords are stored as salted scrypt hashes', () => {
  const hash = hashPassword('correct horse battery');
  assert.match(hash, /^scrypt:16384:8:1:[\w-]+:[\w-]+$/);
  assert.notEqual(hashPassword('correct horse battery'), hash);
  assert.equal(verifyPassword('correct horse battery', hash), true);
  assert.equal(verifyPassword('correct horse batterx', hash), false);
  assert.equal(verifyPassword('anything', 'plain text'), false);
});
