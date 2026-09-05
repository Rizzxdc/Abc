const axios = require('axios');

/**
 * Cek arti nama berdasarkan nama yang dimasukkan
 * Source: https://api.azbry.com/api/fun/cekartinama?nama=
 * @param {string} nama
 */
async function cekArtiNama(nama) {
  const apiUrl = "https://api.azbry.com/api/fun/cekartinama?nama=" + encodeURIComponent(nama);

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
    throw new Error('Gagal menghubungi server Cek Arti Nama: ' + err.message);
  }

  const data = response.data;

  if (!data || typeof data !== 'object') {
    throw new Error('Respon dari server tidak valid (bukan JSON). Server mungkin sedang down.');
  }

  if (response.status !== 200 || data.success === false) {
    throw new Error(data.message || data.error || 'Nama "' + nama + '" tidak ditemukan atau terjadi kesalahan pada server');
  }

  const msg = data.result?.message;
  if (!msg) {
    throw new Error('Data hasil tidak ditemukan pada respon server');
  }

  return {
    nama: msg.nama?.nama || nama,
    arti: msg.arti || "Arti nama tidak ditemukan.",
    catatan: msg.catatan || ""
  };
}

module.exports = [
  {
    name: "Arti Nama",
    desc: "Cek arti dan makna nama berdasarkan berbagai asal bahasa",
    category: "Fun",
    path: "/fun/cekartinama?apikey=&nama=",
    async run(req, res) {
      const { apikey, nama } = req.query;

      if (!apikey || !Array.isArray(global.apikey) || !global.apikey.includes(apikey)) {
        return res.status(403).json({
          status: false,
          error: "Apikey invalid"
        });
      }

      if (!nama || !nama.trim()) {
        return res.status(400).json({
          status: false,
          error: "Nama parameter is required"
        });
      }

      try {
        const result = await cekArtiNama(nama.trim());
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