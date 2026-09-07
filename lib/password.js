/**
 * password.js
 * ------------------------------------------------------------------
 * Hashing & verifikasi password pakai modul built-in Node.js `crypto`
 * (scrypt), jadi tidak perlu install dependency tambahan (bcrypt dll).
 * Password ASLI tidak pernah disimpan atau di-return / di-log.
 * ------------------------------------------------------------------
 */

const crypto = require('crypto');

const KEY_LENGTH = 64;

/**
 * @param {string} password - password asli (plain text)
 * @returns {string} format "salt:hash" (keduanya hex)
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * @param {string} password - password yang diinput user saat login
 * @param {string} stored - hasil hashPassword() yang tersimpan di database
 * @returns {boolean}
 */
function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string' || !stored.includes(':')) return false;

  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;

  try {
    const hashBuffer = Buffer.from(hash, 'hex');
    const testBuffer = crypto.scryptSync(String(password), salt, KEY_LENGTH);

    if (hashBuffer.length !== testBuffer.length) return false;
    return crypto.timingSafeEqual(hashBuffer, testBuffer);
  } catch (e) {
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };
