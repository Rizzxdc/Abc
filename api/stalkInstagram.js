const axios = require('axios');

/**
 * Stalk / cek profil akun Instagram berdasarkan username
 * Source: https://api.azbry.com/api/stalk/instagram?username=
 * @param {string} username
 */
async function stalkInstagram(username) {
  const apiUrl = `https://api.azbry.com/api/stalk/instagram?username=${encodeURIComponent(username)}`;

  let response;
  try {
    response = await axios.get(apiUrl, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'application/json'
      },
      validateStatus: () => true // Biar bisa handle status HTTP non-200 secara manual
    });
  } catch (err) {
    // Error jaringan (timeout, DNS, koneksi putus, dll)
    throw new Error(`Gagal menghubungi server Instagram stalker: ${err.message}`);
  }

  const data = response.data;

  // Jika upstream mengembalikan HTML / bukan JSON (tanda down / cloudflare block)
  if (!data || typeof data !== 'object') {
    throw new Error('Respon dari server tidak valid (bukan JSON). Server mungkin sedang down.');
  }

  if (response.status !== 200 || data.status === false) {
    throw new Error(data.error || data.message || `Username "${username}" tidak ditemukan atau terjadi kesalahan pada server`);
  }

  if (!data.result) {
    throw new Error('Data hasil tidak ditemukan pada respon server');
  }

  const r = data.result;

  return {
    username: r.username,
    fullName: r.full_name,
    bio: r.bio,
    profilePic: r.profile_pic,
    isPrivate: r.is_private,
    isVerified: r.is_verified,
    externalUrl: r.external_url ?? null,
    stats: {
      followers: r.stats?.followers ?? 0,
      following: r.stats?.following ?? 0,
      posts: r.stats?.posts ?? 0
    }
  };
}

module.exports = [
  {
    name: "Stalk Instagram",
    desc: "Cek / stalk profil akun Instagram berdasarkan username",
    category: "Stalker",
    path: "/stalk/instagram?apikey=&username=",
    async run(req, res) {
      const { apikey, username } = req.query;

      if (!apikey || !global.apikey.includes(apikey)) {
        return res.status(403).json({
          status: false,
          error: "Apikey invalid"
        });
      }

      if (!username || !username.trim()) {
        return res.status(400).json({
          status: false,
          error: "Username is required"
        });
      }

      try {
        const result = await stalkInstagram(username.trim());
        return res.status(200).json({
          status: true,
          result
        });
      } catch (error) {
        return res.status(500).json({
          status: false,
          error: error.message || "Terjadi kesalahan pada server"
        });
      }
    }
  }
];