import fetch from 'node-fetch';

/**
 * Menggenerasi video Brat (GIF/MP4) menggunakan KaelStore API
 * @param {string} text - Teks yang akan dijadikan video brat
 * @param {string} [apiKey='KAEL_5791597'] - API Key KaelStore
 * @returns {Promise<Buffer>} Buffer video/GIF hasil generate
 */
export async function createBratVideo(text, apiKey = 'KAEL_5791597') {
  if (!text) {
    throw new Error('Parameter "text" wajib diisi.');
  }

  const url = `https://api.kaelstore.xyz/api/imagecreator/bratvid?text=${encodeURIComponent(text)}&apikey=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Mengambil response dalam bentuk Buffer (media/video)
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error generating Brat Video:', error.message);
    throw error;
  }
}

// Contoh Penggunaan (Uncomment jika ingin mengetes langsung):
/*
(async () => {
  import fs from 'fs';
  try {
    const videoBuffer = await createBratVideo('Hufttt');
    fs.writeFileSync('bratvid.mp4', videoBuffer);
    console.log('Video brat berhasil dibuat dan disimpan sebagai bratvid.mp4');
  } catch (err) {
    console.error('Gagal:', err);
  }
})();
*/