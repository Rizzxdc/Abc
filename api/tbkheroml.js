const axios = require('axios');

/**
 * Mengambil soal tebak hero Mobile Legends
 * Source: https://api.azbry.com/api/fun/tebakheroml
 */
async function getTebakHeroML() {
  const apiUrl = "https://api.azbry.com/api/fun/tebakheroml";

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
    throw new Error('Gagal menghubungi server Tebak Hero ML: ' + err.message);
  }

  const data = response.data;

  if (!data || typeof data !== 'object') {
    throw new Error('Respon dari server tidak valid (bukan JSON). Server mungkin sedang down.');
  }

  if (response.status !== 200 || (data.status && data.status !== 200)) {
    throw new Error(data.message || data.error || 'Terjadi kesalahan pada server asal Tebak Hero ML');
  }

  return {
    question: data.question || "",
    answer: data.answer || "",
    image: data.image || "",
    quiz: {
      quote: data.quiz?.quote || "",
      audioUrl: data.quiz?.audio_url || ""
    },
    hint: {
      underline: data.hint?.underline || "",
      audio: data.hint?.audio || "",
      message: data.hint?.message || ""
    }
  };
}

module.exports = [
  {
    name: "Tebak Hero ML",
    desc: "Game tebak nama hero Mobile Legends berdasarkan quote, audio, dan gambar",
    category: "Fun",
    path: "/fun/tebakheroml?apikey=",
    async run(req, res) {
      const { apikey } = req.query;

      if (!apikey || !Array.isArray(global.apikey) || !global.apikey.includes(apikey)) {
        return res.status(403).json({
          status: false,
          error: "Apikey invalid"
        });
      }

      try {
        const result = await getTebakHeroML();
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