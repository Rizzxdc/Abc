/**
 * apikeyGate.js
 * ------------------------------------------------------------------
 * Validasi apikey + enforce limit per-user, sumber data dari GitHub DB
 * (users.json). Didesain supaya TIDAK perlu mengubah satupun file di
 * /api/*.js yang sudah ada (yang masing-masing masih cek
 * `global.apikey.includes(apikey)`).
 *
 * Caranya: setelah apikey (milik user) dinyatakan valid & limitnya
 * belum habis di sini, key tersebut langsung didaftarkan juga ke
 * `global.apikey` (array lama), jadi pengecekan lawas di tiap file
 * tetap lolos seperti biasa.
 *
 * PENTING (perlu diketahui): karena "database"-nya adalah GitHub, tiap
 * request yang pakai apikey per-user akan baca+tulis ke GitHub API buat
 * update angka pemakaian. Ini JAUH lebih lambat dibanding database
 * biasa (nambah ~0.3-1 detik per request) dan bisa kena rate limit
 * GitHub kalau trafiknya tinggi. Untuk apikey statis/master (yang ada
 * di env/settings dari awal), tidak ada overhead ini sama sekali.
 * ------------------------------------------------------------------
 */

const { readDb, writeDb } = require('./githubDb');

function isStaticMasterKey(apikey) {
  return Array.isArray(global.staticApikeys) && global.staticApikeys.includes(apikey);
}

function registerKeyLocally(apikey) {
  // Supaya pengecekan lama (`global.apikey.includes(apikey)`) di tiap file
  // /api/*.js tetap lolos untuk apikey milik user yang baru saja divalidasi.
  if (apikey && Array.isArray(global.apikey) && !global.apikey.includes(apikey)) {
    global.apikey.push(apikey);
  }
}

/**
 * @param {string} apikey
 * @returns {Promise<{ok: boolean, status?: number, error?: string, remaining?: number|null, warning?: string}>}
 */
async function checkAndConsumeApikey(apikey) {
  if (!apikey) {
    return { ok: false, status: 403, error: 'Apikey invalid' };
  }

  if (isStaticMasterKey(apikey)) {
    return { ok: true, remaining: null };
  }

  // Retry sekali kalau kena race condition (409 conflict) saat 2 request
  // datang bersamaan dan berebut nulis file yang sama di GitHub.
  for (let attempt = 0; attempt < 2; attempt++) {
    let users, sha;
    try {
      ({ users, sha } = await readDb());
    } catch (err) {
      return { ok: false, status: 503, error: 'Gagal memeriksa apikey (database sedang bermasalah): ' + err.message };
    }

    const idx = users.findIndex(u => u.apikey === apikey);
    if (idx === -1) {
      return { ok: false, status: 403, error: 'Apikey invalid' };
    }

    const user = users[idx];
    const limit = (user.apiLimit === null || user.apiLimit === undefined) ? null : Number(user.apiLimit);
    const used = Number(user.apiUsed || 0);

    if (limit !== null && used >= limit) {
      return {
        ok: false,
        status: 429,
        error: `Limit API sudah habis (${used}/${limit}). Hubungi admin untuk menambah limit, atau tunggu limit direset.`
      };
    }

    users[idx] = { ...user, apiUsed: used + 1 };

    try {
      await writeDb(users, sha, `chore(usage): +1 request (${user.username})`);
      registerKeyLocally(apikey);
      return { ok: true, remaining: limit === null ? null : (limit - users[idx].apiUsed) };
    } catch (err) {
      if (String(err.message).startsWith('CONFLICT') && attempt === 0) {
        continue; // coba lagi sekali dengan data ter-refresh
      }
      // Gagal simpan usage count (bukan karena limit habis) -> tetap izinkan
      // request supaya user tidak dirugikan gara-gara GitHub API bermasalah.
      registerKeyLocally(apikey);
      return { ok: true, remaining: null, warning: 'Pemakaian tidak tercatat karena gagal update database: ' + err.message };
    }
  }

  return { ok: false, status: 503, error: 'Gagal memproses apikey setelah beberapa percobaan, coba lagi' };
}

module.exports = { checkAndConsumeApikey };
