const crypto = require('crypto');

/**
 * Generate apikey unik, format: SKZ_1234567 (7 digit angka acak).
 * @param {string[]} existingKeys - daftar apikey yang sudah dipakai, buat cek tabrakan
 */
function generateApiKey(existingKeys = []) {
  const existing = new Set((existingKeys || []).filter(Boolean));
  let key;
  let attempts = 0;

  do {
    const num = crypto.randomInt(1000000, 9999999); // 7 digit
    key = `SKZ_${num}`;
    attempts++;
  } while (existing.has(key) && attempts < 30);

  return key;
}

module.exports = { generateApiKey };
