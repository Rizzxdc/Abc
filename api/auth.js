const { readDb, writeDb } = require('../lib/githubDb');
const { hashPassword, verifyPassword } = require('../lib/password');
const { createToken, verifyToken } = require('../lib/token');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,20}$/;

function publicUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

module.exports = [
  // ================= REGISTER =================
  {
    name: "Register",
    desc: "Daftar akun baru (username, email/gmail, password). Data disimpan sebagai database JSON di repository GitHub.",
    category: "Auth",
    method: "POST",
    path: "/auth/register",
    body: { username: "text", email: "text", password: "text" },
    async run(req, res) {
      try {
        const { username, email, password } = req.body || {};

        if (!username || !email || !password) {
          return res.status(400).json({
            status: false,
            error: "Username, email, dan password wajib diisi"
          });
        }

        if (!USERNAME_REGEX.test(String(username).trim())) {
          return res.status(400).json({
            status: false,
            error: "Username harus 3-20 karakter, hanya boleh huruf, angka, titik, dan underscore"
          });
        }

        if (!EMAIL_REGEX.test(String(email).trim())) {
          return res.status(400).json({
            status: false,
            error: "Format email tidak valid"
          });
        }

        if (String(password).length < 6) {
          return res.status(400).json({
            status: false,
            error: "Password minimal 6 karakter"
          });
        }

        const { users, sha } = await readDb();

        const usernameLower = String(username).trim().toLowerCase();
        const emailLower = String(email).trim().toLowerCase();

        const alreadyExists = users.some(
          u =>
            (u.username && u.username.toLowerCase() === usernameLower) ||
            (u.email && u.email.toLowerCase() === emailLower)
        );

        if (alreadyExists) {
          return res.status(409).json({
            status: false,
            error: "Username atau email sudah terdaftar"
          });
        }

        const newUser = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
          username: String(username).trim(),
          email: String(email).trim(),
          password: hashPassword(String(password)),
          createdAt: new Date().toISOString()
        };

        users.push(newUser);

        try {
          await writeDb(users, sha, `feat(auth): register user ${newUser.username}`);
        } catch (err) {
          if (String(err.message).startsWith('CONFLICT')) {
            return res.status(409).json({
              status: false,
              error: "Database sedang diproses di tempat lain, silakan coba lagi sebentar"
            });
          }
          throw err;
        }

        return res.status(201).json({
          status: true,
          result: publicUser(newUser)
        });
      } catch (error) {
        return res.status(500).json({
          status: false,
          error: error.message || "Terjadi kesalahan pada server"
        });
      }
    }
  },

  // ================= LOGIN (step 1: identifier, step 2: password -> confirm) =================
  {
    name: "Login",
    desc: "Login menggunakan username ATAU email/gmail, lalu password. Mengembalikan token sesi setelah dikonfirmasi valid.",
    category: "Auth",
    method: "POST",
    path: "/auth/login",
    body: { identifier: "text", password: "text" },
    async run(req, res) {
      try {
        const { identifier, password } = req.body || {};

        if (!identifier || !password) {
          return res.status(400).json({
            status: false,
            error: "Username/email dan password wajib diisi"
          });
        }

        const { users } = await readDb();
        const idLower = String(identifier).trim().toLowerCase();

        const user = users.find(
          u =>
            (u.username && u.username.toLowerCase() === idLower) ||
            (u.email && u.email.toLowerCase() === idLower)
        );

        // Pesan sengaja disamakan (user tidak ada / password salah) supaya
        // tidak bocor info akun mana yang terdaftar
        if (!user || !verifyPassword(String(password), user.password)) {
          return res.status(401).json({
            status: false,
            error: "Username/email atau password salah"
          });
        }

        const token = createToken({ id: user.id, username: user.username, email: user.email });

        return res.status(200).json({
          status: true,
          result: {
            confirmed: true,
            user: publicUser(user),
            token
          }
        });
      } catch (error) {
        return res.status(500).json({
          status: false,
          error: error.message || "Terjadi kesalahan pada server"
        });
      }
    }
  },

  // ================= VERIFY SESSION =================
  {
    name: "Verify Session",
    desc: "Cek apakah token login masih valid (dipakai untuk cek status 'sudah login' di halaman lain).",
    category: "Auth",
    method: "POST",
    path: "/auth/verify",
    body: { token: "text" },
    async run(req, res) {
      try {
        const { token } = req.body || {};

        if (!token) {
          return res.status(400).json({ status: false, error: "Token wajib diisi" });
        }

        const data = verifyToken(token);

        if (!data) {
          return res.status(401).json({ status: false, error: "Token tidak valid atau sudah kadaluarsa" });
        }

        return res.status(200).json({ status: true, result: data });
      } catch (error) {
        return res.status(500).json({
          status: false,
          error: error.message || "Terjadi kesalahan pada server"
        });
      }
    }
  }
];
