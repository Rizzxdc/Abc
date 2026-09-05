const axios = require('axios');

/**
 * Membuat gambar kartu musik (Spotify/Music Card) berdasarkan URL Gambar dan Nama
 * Source: https://api.azbry.com/api/maker/music?img=&name=
 * @param {string} img
 * @param {string} name
 */
async function makeMusicCard(img, name) {
  const apiUrl = "https://api.azbry.com/api/maker/music?img=" + encodeURIComponent(img) + "&name=" + encodeURIComponent(name);

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
    throw new Error('Gagal membuat gambar Music Card: ' + err.message);
  }
}

module.exports = [
  {
    name: "Music Card Generator",
    desc: "Generate gambar kartu musik dari URL Gambar dan Nama lagu/artis",
    category: "Maker",
    path: "/maker/music?apikey=&img=&name=",
    async run(req, res) {
      const { apikey, img, name } = req.query;

      if (!apikey || !Array.isArray(global.apikey) || !global.apikey.includes(apikey)) {
        return res.status(403).json({
          status: false,
          error: "Apikey invalid"
        });
      }

      if (!img || !img.trim()) {
        return res.status(400).json({
          status: false,
          error: "Image URL (img) parameter is required"
        });
      }

      if (!name || !name.trim()) {
        return res.status(400).json({
          status: false,
          error: "Name parameter is required"
        });
      }

      try {
        const imageBuffer = await makeMusicCard(img.trim(), name.trim());
        
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