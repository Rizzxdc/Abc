const axios = require('axios');

/**
 * Membuat gambar gaya Brat berdasarkan teks
 * Source: https://api.kaelstore.xyz/api/imagecreator/brat?text=&apikey=
 * @param {string} text
 */
async function makeBrat(text) {
  const apiKey = 'KAEL_5791597';
  const apiUrl = `https://api.kaelstore.xyz/api/imagecreator/brat?text=${encodeURIComponent(text)}&apikey=${apiKey}`;

  try {
    const response = await axios.get(apiUrl, {
      responseType: 'arraybuffer', // Mengambil data gambar dalam bentuk Buffer
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
      },
      validateStatus: () => true
    });

    if (response.status !== 200) {
      throw new Error(`Server merespon dengan status ${response.status}`);
    }

    return response.data; // Mengembalikan buffer gambar
  } catch (err) {
    throw new Error(`Gagal membuat gambar Brat: ${err.message}`);
  }
}

module.exports = [
  {
    name: "Brat Generator",
    desc: "Generate gambar gaya Brat dari teks",
    category: "Image Creator",
    path: "/imagecreator/brat?apikey=&text=",
    async run(req, res) {
      const { apikey, text } = req.query;

      if (!apikey || !global.apikey.includes(apikey)) {
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
        const imageBuffer = await makeBrat(text.trim());
        
        // Mengirimkan hasil langsung sebagai gambar JPEG/PNG
        res.setHeader('Content-Type', 'image/jpeg');
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