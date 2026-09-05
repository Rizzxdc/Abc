const axios = require('axios');

/**
 * Membuat gambar Fake Dana berdasarkan nominal amount
 * Source: https://api.azbry.com/api/maker/fakedana?amount=
 * @param {string|number} amount
 */
async function makeFakeDana(amount) {
  const apiUrl = 'https://api.azbry.com/api/maker/fakedana?amount=' + encodeURIComponent(amount);

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
    throw new Error('Gagal membuat gambar Fake Dana: ' + err.message);
  }
}

module.exports = [
  {
    name: "Fake Dana Generator",
    desc: "Generate bukti transaksi Fake DANA berdasarkan jumlah nominal",
    category: "Maker",
    path: "/maker/fakedana?apikey=&amount=",
    async run(req, res) {
      const { apikey, amount } = req.query;

      if (!apikey || !Array.isArray(global.apikey) || !global.apikey.includes(apikey)) {
        return res.status(403).json({
          status: false,
          error: "Apikey invalid"
        });
      }

      if (!amount || !amount.trim()) {
        return res.status(400).json({
          status: false,
          error: "Amount parameter is required"
        });
      }

      try {
        const imageBuffer = await makeFakeDana(amount.trim());
        
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