/**
 * token.js
 * ------------------------------------------------------------------
 * Token sesi sederhana ala-JWT (payload + signature HMAC-SHA256),
 * dipakai untuk menandai "sudah login terkonfirmasi" tanpa perlu
 * dependency jsonwebtoken. Set SESSION_SECRET di environment
 * variable untuk production (kalau tidak diisi, pakai default -
 * TIDAK aman untuk production).
 * ------------------------------------------------------------------
 */

const crypto = require('crypto');

const SECRET = process.env.SESSION_SECRET || 'CHANGE_THIS_SESSION_SECRET_IN_ENV';
const DEFAULT_EXPIRES_IN = 60 * 60 * 24 * 7; // 7 hari

function toBase64Url(str) {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString('utf-8');
}

/**
 * @param {object} payload - data yang mau disimpan di token (JANGAN taruh password di sini)
 * @param {number} [expiresInSeconds]
 * @returns {string} token
 */
function createToken(payload, expiresInSeconds = DEFAULT_EXPIRES_IN) {
  const data = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds
  };

  const payloadStr = toBase64Url(JSON.stringify(data));
  const signature = crypto.createHmac('sha256', SECRET).update(payloadStr).digest('hex');

  return `${payloadStr}.${signature}`;
}

/**
 * @param {string} token
 * @returns {object|null} payload kalau valid, null kalau invalid/expired
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;

  const idx = token.lastIndexOf('.');
  const payloadStr = token.slice(0, idx);
  const signature = token.slice(idx + 1);

  const expectedSignature = crypto.createHmac('sha256', SECRET).update(payloadStr).digest('hex');

  const sigBuf = Buffer.from(signature || '', 'hex');
  const expBuf = Buffer.from(expectedSignature, 'hex');

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  let data;
  try {
    data = JSON.parse(fromBase64Url(payloadStr));
  } catch (e) {
    return null;
  }

  if (!data.exp || Math.floor(Date.now() / 1000) > data.exp) {
    return null; // expired
  }

  return data;
}

module.exports = { createToken, verifyToken };
