const axios = require('axios');

/**
 * Mengambil data downloader TikTok
 * Source: https://api.kaelstore.xyz/api/download/tiktok?url=
 * @param {string} targetUrl
 */
async function downloadTikTok(targetUrl) {
  const apiKey = 'KAEL_5791597';
  const apiUrl = "https://api.kaelstore.xyz/api/download/tiktok?url=" + encodeURIComponent(targetUrl) + "&apikey=" + apiKey;

  let response;
  try {
    response = await axios.get(apiUrl, {
      timeout: 25000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'application/json'
      },
      validateStatus: () => true
    });
  } catch (err) {
    throw new Error('Gagal menghubungi server TikTok Downloader: ' + err.message);
  }

  const data = response.data;

  if (!data || typeof data !== 'object') {
    throw new Error('Respon dari server tidak valid (bukan JSON). Server mungkin sedang down.');
  }

  if (response.status !== 200 || data.status === false) {
    throw new Error(data.message || data.error || 'URL TikTok tidak valid atau terjadi kesalahan pada server');
  }

  const r = data.result;
  if (!r) {
    throw new Error('Data hasil downloader tidak ditemukan pada respon server');
  }

  return {
    author: r.author || "",
    username: r.username || "",
    caption: r.caption || "",
    cover: r.cover || "",
    video: {
      noWatermark: r.video?.noWatermark || "",
      hd: r.video?.hd || "",
      watermark: r.video?.watermark || ""
    },
    audio: {
      url: r.audio?.url || ""
    },
    images: Array.isArray(r.images) ? r.images : []
  };
}

module.exports = [
  {
    name: "TikTok Downloader",
    desc: "Download video atau audio TikTok tanpa watermark berdasarkan URL",
    category: "Downloader",
    path: "/download/tiktok?apikey=&url=",
    async run(req, res) {
      const { apikey, url } = req.query;

      if (!apikey || !Array.isArray(global.apikey) || !global.apikey.includes(apikey)) {
        return res.status(403).json({
          status: false,
          error: "Apikey invalid"
        });
      }

      if (!url || !url.trim()) {
        return res.status(400).json({
          status: false,
          error: "URL parameter is required"
        });
      }

      try {
        const result = await downloadTikTok(url.trim());
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