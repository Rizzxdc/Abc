const axios = require('axios');

/**
 * Mengambil gambar cosplay secara acak
 * Source: https://api.kaelstore.xyz/api/random/cosplay
 */
async function getRandomCosplay() {
  const apiKey = 'KAEL_5791597';
  const apiUrl = "https://api.kaelstore.xyz/api/random/cosplay?apikey=" + apiKey;

  let response;
  try {
    response = await axios.get(apiUrl, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'application/json'
      },
      validateStatus: () => true
    });
  } catch (err) {
    throw new Error('Gagal menghubungi server Random Cosplay: ' + err.message);
  }

  const data = response.data;

  if (!data || typeof data !== 'object') {
    throw new Error('Respon dari server tidak valid (bukan JSON). Server mungkin sedang down.');
  }

  if (response.status !== 200 || data.status === false) {
    throw new Error(data.message || data.error || 'Terjadi kesalahan pada server asal Random Cosplay');
  }

  const r = data.result;
  if (!r || !r.url) {
    throw new Error('Data URL gambar tidak ditemukan pada respon server');
  }

  return {
    url: r.url
  };
}

module.exports = [
  {
    name: "Random Cosplay",
    desc: "Mendapatkan gambar cosplay wanita secara acak",
    category: "Fun",
    path: "/fun/cosplay?apikey=",
    async run(req, res) {
      const { apikey } = req.query;

      if (!apikey || !Array.isArray(global.apikey) || !global.apikey.includes(apikey)) {
        return res.status(403).json({
          status: false,
          error: "Apikey invalid"
        });
      }

      try {
        const result = await getRandomCosplay();
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