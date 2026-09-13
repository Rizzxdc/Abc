const { readDb, writeDb } = require('../lib/githubDb');
const { verifyToken } = require('../lib/token');
const { generateApiKey } = require('../lib/apikeyGen');

function publicUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

function withUsageInfo(user) {
  const limit = (user.apiLimit === null || user.apiLimit === undefined) ? null : Number(user.apiLimit);
  const used = Number(user.apiUsed || 0);
  return {
    ...publicUser(user),
    apiLimit: limit,
    apiUsed: used,
    apiRemaining: limit === null ? null : Math.max(0, limit - used)
  };
}

async function getUserFromToken(token) {
  const payload = verifyToken(token);
  if (!payload) return null;

  const { users, sha } = await readDb();
  const idx = users.findIndex(u => u.id === payload.id);
  if (idx === -1) return null;

  return { users, sha, idx, user: users[idx] };
}

module.exports = [
  {
    name: "My Account",
    desc: "Lihat profil, apikey, limit, dan sisa pemakaian akun sendiri (butuh token login).",
    category: "Account",
    method: "POST",
    path: "/account/me",
    body: { token: "text" },
    async run(req, res) {
      try {
        const { token } = req.body || {};
        if (!token) {
          return res.status(400).json({ status: false, error: "Token wajib diisi" });
        }

        const found = await getUserFromToken(token);
        if (!found) {
          return res.status(401).json({ status: false, error: "Token tidak valid atau sudah kadaluarsa" });
        }

        return res.status(200).json({ status: true, result: withUsageInfo(found.user) });
      } catch (error) {
        return res.status(500).json({ status: false, error: error.message || "Terjadi kesalahan pada server" });
      }
    }
  },

  {
    name: "Regenerate API Key",
    desc: "Ganti apikey akun sendiri dengan yang baru. Apikey lama langsung tidak berlaku dan pemakaian direset ke 0.",
    category: "Account",
    method: "POST",
    path: "/account/regenerate-key",
    body: { token: "text" },
    async run(req, res) {
      try {
        const { token } = req.body || {};
        if (!token) {
          return res.status(400).json({ status: false, error: "Token wajib diisi" });
        }

        const found = await getUserFromToken(token);
        if (!found) {
          return res.status(401).json({ status: false, error: "Token tidak valid atau sudah kadaluarsa" });
        }

        const { users, sha, idx } = found;
        const newKey = generateApiKey(users.map(u => u.apikey));

        users[idx] = { ...users[idx], apikey: newKey, apiUsed: 0 };

        try {
          await writeDb(users, sha, `feat(account): regenerate apikey untuk ${users[idx].username}`);
        } catch (err) {
          if (String(err.message).startsWith('CONFLICT')) {
            return res.status(409).json({ status: false, error: "Database sedang diproses di tempat lain, silakan coba lagi" });
          }
          throw err;
        }

        return res.status(200).json({ status: true, result: withUsageInfo(users[idx]) });
      } catch (error) {
        return res.status(500).json({ status: false, error: error.message || "Terjadi kesalahan pada server" });
      }
    }
  }
];
