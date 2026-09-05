const axios = require('axios');

/**
 * Membuat gambar TTP (Text To Picture/Sticker) berdasarkan teks
 * Source: https://api.azbry.com/api/maker/ttp?text=
 * @param {string} text
 */
async function makeTTP(text) {
  const apiUrl = "https://api.azbry.com/api/maker/ttp?text=" + encodeURIComponent(text);

  try {
    const response = await axios.get(apiUrl, {
      responseType: 'arraybuffer', // Mengambil data gambar dalam bentuk Buffer
      timeout: 25000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
      },
      validateStatus: () => true
    });

    if (response.status !== 200) {
      throw new Error('Server merespon dengan status ' + response.status);
    }

    return response.data;
  } catch (err) {
    throw new Error('Gagal membuat gambar TTP: ' + err.message);
  }
}

module.exports = [
  {
    name: "TTP Generator",
    desc: "Generate gambar/stiker teks TTP (Text To Picture) berdasarkan teks",
    category: "Maker",
    path: "/maker/ttp?apikey=&text=",
    async run(req, res) {
      const { apikey, text } = req.query;

      if (!apikey || !Array.isArray(global.apikey) || !global.apikey.includes(apikey)) {
        return res.status(403).json({
          status: false,
          error: "Apikey invalid"
        });
      }

      if (!text || !text.trim()) {
        return res.status(400).json({
          status: false,
          error: "Text parameter is required"
        });
      }

      try {
        const imageBuffer = await makeTTP(text.trim());
        
        // Mengirimkan hasil langsung sebagai media gambar
        res.setHeader('Content-Type', 'image/png');
        return res.send(imageBuffer);
      } catch (error) {
        return res.status(500).json({
          status: false,
          error: error.message || "Terjadi kesalahan pada server"
        });
      }
    }
  }
];