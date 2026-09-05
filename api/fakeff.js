const axios = require('axios');

/**
 * Membuat gambar Fake Free Fire berdasarkan nama
 * Source: https://api.azbry.com/api/maker/fakeff?name=
 * @param {string} name
 */
async function makeFakeFF(name) {
  const apiUrl = "https://api.azbry.com/api/maker/fakeff?name=" + encodeURIComponent(name);

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
    throw new Error('Gagal membuat gambar Fake FF: ' + err.message);
  }
}

module.exports = [
  {
    name: "Fake Free Fire Generator",
    desc: "Generate bukti/gambar Fake Free Fire berdasarkan nama",
    category: "Maker",
    path: "/maker/fakeff?apikey=&name=",
    async run(req, res) {
      const { apikey, name } = req.query;

      if (!apikey || !Array.isArray(global.apikey) || !global.apikey.includes(apikey)) {
        return res.status(403).json({
          status: false,
          error: "Apikey invalid"
        });
      }

      if (!name || !name.trim()) {
        return res.status(400).json({
          status: false,
          error: "Name parameter is required"
        });
      }

      try {
        const imageBuffer = await makeFakeFF(name.trim());
        
        // Mengirimkan hasil langsung sebagai media gambar PNG/JPEG
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