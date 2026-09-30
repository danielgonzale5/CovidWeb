'use strict';

const crypto = require('crypto');

// Stored format: scrypt:N:r:p:<salt base64url>:<hash base64url>
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 };
const MIN_LENGTH = 12;
const MAX_LENGTH = 200;

function hashPassword(password, salt = crypto.randomBytes(16)) {
  const { N, r, p, keylen } = SCRYPT;
  const hash = crypto.scryptSync(password, salt, keylen, { N, r, p });
  return ['scrypt', N, r, p, salt.toString('base64url'), hash.toString('base64url')].join(':');
}

function verifyPassword(password, stored) {
  const [scheme, N, r, p, salt, hash] = String(stored).split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = crypto.scryptSync(String(password), Buffer.from(salt, 'base64url'), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  return crypto.timingSafeEqual(actual, expected);
}

// A hash of a random password, verified against when the user name does not
// exist, so both failures take the same time and user names cannot be probed.
const DUMMY_HASH = hashPassword(crypto.randomBytes(16).toString('hex'));

module.exports = { hashPassword, verifyPassword, DUMMY_HASH, MIN_LENGTH, MAX_LENGTH };
