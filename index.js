const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Mengimpor seluruh endpoint API
const routes = [
  ...require('./api/ai-gemini.js'),
  ...require('./api/ai-gpt.js'),
  ...require('./api/ai-groq.js'),
  ...require('./api/ai-image.js'),
  ...require('./api/ai-nolimit.js'),
  ...require('./api/bokep.js'),
  ...require('./api/brat.js'),
  ...require('./api/bratvid.js'),
  ...require('./api/bstation.js'),
  ...require('./api/bstationDl.js'),
  ...require('./api/cekewallet.js'),
  ...require('./api/emojimix.js'),
  ...require('./api/emojitogif.js'),
  ...require('./api/facebook.js'),
  ...require('./api/gimage.js'),
  ...require('./api/gitclone.js'),
  ...require('./api/heroml.js'),
  ...require('./api/instagram.js'),
  ...require('./api/mediafire.js'),
  ...require('./api/nekopoi.js'),
  ...require('./api/orderkuota.js'),
  ...require('./api/otakudesu.js'),
  ...require('./api/pin2.js'),
  ...require('./api/pindl.js'),
  ...require('./api/pinterest.js'),
  ...require('./api/random-nsfw.js'),
  ...require('./api/random-waifu.js'),
  ...require('./api/reactch.js'),
  ...require('./api/removebg.js'),
  ...require('./api/sfiledl.js'),
  ...require('./api/sfilesearch.js'),
  ...require('./api/SoundCloud.js'),
  ...require('./api/Spotify.js'),
  ...require('./api/spotify2.js'),
  ...require('./api/tiktok-search.js'),
  ...require('./api/tiktok.js'),
  ...require('./api/toanime.js'),
  ...require('./api/tobugil.js'),
  ...require('./api/toghibli.js'),
  ...require('./api/tohitam.js'),
  ...require('./api/tozombie.js'),
  ...require('./api/twitter.js'),
  ...require('./api/upscale.js'),
  ...require('./api/xnxxdl.js'),
  ...require('./api/youtube.js'),
  ...require('./api/ytdl.js'),
  ...require('./api/github.js') // <-- BERKAS STALK GITHUB DIDAFTARKAN DI SINI
];

// Register routes
routes.forEach(route => {
  app.get(route.path, route.run);
});

// Serve frontend docs & home
app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'docs.html'));
});

app.get('/api/endpoints', (req, res) => {
  res.json(routes);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'home.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;