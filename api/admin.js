const { readDb, writeDb } = require('../lib/githubDb');
const { verifyToken } = require('../lib/token');

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

function getAdminIdentifiers() {
  return (process.env.ADMIN_USERNAMES || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminUser(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;

  const admins = getAdminIdentifiers();
  const uname = String(user.username || '').toLowerCase();
  const mail = String(user.email || '').toLowerCase();
  return admins.includes(uname) || admins.includes(mail);
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
    name: "List Users (Admin)",
    desc: "Lihat semua user beserta apikey, limit, dan pemakaiannya. Khusus admin.",
    category: "Admin",
    method: "POST",
    path: "/admin/users",
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

        if (!isAdminUser(found.user)) {
          return res.status(403).json({ status: false, error: "Endpoint ini khusus admin" });
        }

        return res.status(200).json({
          status: true,
          result: found.users.map(withUsageInfo)
        });
      } catch (error) {
        return res.status(500).json({ status: false, error: error.message || "Terjadi kesalahan pada server" });
      }
    }
  },

  {
    name: "Set User Limit (Admin)",
    desc: "Ubah limit apikey milik user tertentu. Isi limit dengan angka, atau \"null\" untuk unlimited. Khusus admin.",
    category: "Admin",
    method: "POST",
    path: "/admin/set-limit",
    body: { token: "text", username: "text", limit: "text", resetUsage: "text" },
    async run(req, res) {
      try {
        const { token, username, limit, resetUsage } = req.body || {};

        if (!token || !username || limit === undefined || limit === null || limit === '') {
          return res.status(400).json({
            status: false,
            error: 'token, username, dan limit wajib diisi (limit boleh angka atau teks "null" untuk unlimited)'
          });
        }

        const found = await getUserFromToken(token);
        if (!found) {
          return res.status(401).json({ status: false, error: "Token tidak valid atau sudah kadaluarsa" });
        }

        if (!isAdminUser(found.user)) {
          return res.status(403).json({ status: false, error: "Endpoint ini khusus admin" });
        }

        const { users, sha } = found;
        const targetLower = String(username).trim().toLowerCase();
        const targetIdx = users.findIndex(
          u => (u.username && u.username.toLowerCase() === targetLower) ||
               (u.email && u.email.toLowerCase() === targetLower)
        );

        if (targetIdx === -1) {
          return res.status(404).json({ status: false, error: `User "${username}" tidak ditemukan` });
        }

        let newLimit = null;
        const limitStr = String(limit).trim().toLowerCase();
        if (limitStr !== 'null' && limitStr !== 'unlimited' && limitStr !== '-1') {
          const n = Number(limit);
          if (!Number.isFinite(n) || n < 0) {
            return res.status(400).json({
              status: false,
              error: 'limit harus angka >= 0, atau "null"/"unlimited" untuk tanpa batas'
            });
          }
          newLimit = n;
        }

        users[targetIdx] = { ...users[targetIdx], apiLimit: newLimit };
        if (resetUsage === true || resetUsage === 'true') {
          users[targetIdx].apiUsed = 0;
        }

        try {
          await writeDb(
            users,
            sha,
            `feat(admin): set limit ${users[targetIdx].username} -> ${newLimit === null ? 'unlimited' : newLimit}`
          );
        } catch (err) {
          if (String(err.message).startsWith('CONFLICT')) {
            return res.status(409).json({ status: false, error: "Database sedang diproses di tempat lain, silakan coba lagi" });
          }
          throw err;
        }

        return res.status(200).json({ status: true, result: withUsageInfo(users[targetIdx]) });
      } catch (error) {
        return res.status(500).json({ status: false, error: error.message || "Terjadi kesalahan pada server" });
      }
    }
  }
];
