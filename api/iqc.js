const axios = require('axios');

/**
 * Membuat gambar IQC (iPhone Quote Center / Chat) berdasarkan teks
 * Source: https://api.azbry.com/api/maker/iqc?text=
 * @param {string} text
 */
async function makeIQC(text) {
  const apiUrl = "https://api.azbry.com/api/maker/iqc?text=" + encodeURIComponent(text);

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
    throw new Error('Gagal membuat gambar IQC: ' + err.message);
  }
}

module.exports = [
  {
    name: "IQC Generator",
    desc: "Generate gambar IQC (iPhone Quote Center) berdasarkan teks",
    category: "Maker",
    path: "/maker/iqc?apikey=&text=",
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
        const imageBuffer = await makeIQC(text.trim());
        
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