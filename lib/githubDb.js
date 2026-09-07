const axios = require('axios');

function getConfig() {
  const {
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO,
    GITHUB_BRANCH = 'main',
    GITHUB_DB_PATH = 'database/users.json'
  } = process.env;

  return { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, GITHUB_DB_PATH };
}

function assertConfigured() {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = getConfig();
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    throw new Error(
      'GitHub database belum dikonfigurasi. Set env GITHUB_TOKEN, GITHUB_OWNER, dan GITHUB_REPO terlebih dahulu.'
    );
  }
}

function apiUrl() {
  const { GITHUB_OWNER, GITHUB_REPO, GITHUB_DB_PATH } = getConfig();
  return `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_DB_PATH}`;
}

function authHeaders() {
  const { GITHUB_TOKEN } = getConfig();
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'skyzopedia-auth-system',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

/**
 * Ambil seluruh isi database.
 * @returns {Promise<{ users: Array, sha: string|null }>}
 */
async function readDb() {
  assertConfigured();
  const { GITHUB_BRANCH } = getConfig();

  let res;
  try {
    res = await axios.get(`${apiUrl()}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, {
      headers: authHeaders(),
      timeout: 15000,
      validateStatus: () => true
    });
  } catch (err) {
    throw new Error(`Gagal menghubungi GitHub API: ${err.message}`);
  }

  // File belum pernah dibuat -> anggap database masih kosong
  if (res.status === 404) {
    return { users: [], sha: null };
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error('GitHub token tidak valid atau tidak punya akses ke repository ini');
  }

  if (res.status !== 200) {
    throw new Error(`GitHub API error (${res.status}): ${res.data && res.data.message ? res.data.message : 'Unknown error'}`);
  }

  let users = [];
  try {
    const raw = Buffer.from(res.data.content || '', res.data.encoding || 'base64').toString('utf-8');
    users = raw.trim() ? JSON.parse(raw) : [];
  } catch (e) {
    throw new Error('File database di GitHub rusak / isinya bukan JSON yang valid');
  }

  if (!Array.isArray(users)) users = [];

  return { users, sha: res.data.sha || null };
}

/**
 * Simpan (commit) array users ke GitHub.
 * @param {Array} users
 * @param {string|null} sha - sha file sebelumnya (null kalau file baru)
 * @param {string} [message] - pesan commit
 */
async function writeDb(users, sha, message) {
  assertConfigured();
  const { GITHUB_BRANCH } = getConfig();

  const content = Buffer.from(JSON.stringify(users, null, 2), 'utf-8').toString('base64');

  const payload = {
    message: message || `chore: update database (${new Date().toISOString()})`,
    content,
    branch: GITHUB_BRANCH,
    ...(sha ? { sha } : {})
  };

  let res;
  try {
    res = await axios.put(apiUrl(), payload, {
      headers: authHeaders(),
      timeout: 15000,
      validateStatus: () => true
    });
  } catch (err) {
    throw new Error(`Gagal menghubungi GitHub API: ${err.message}`);
  }

  if (res.status === 200 || res.status === 201) {
    return res.data;
  }

  if (res.status === 409) {
    throw new Error('CONFLICT: Database berubah di tempat lain saat proses simpan, silakan coba lagi.');
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error('GitHub token tidak valid atau tidak punya izin menulis ke repository ini');
  }

  if (res.status === 404) {
    const { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = getConfig();
    throw new Error(
      `Gagal menyimpan ke GitHub (404): Not Found. Repo "${GITHUB_OWNER}/${GITHUB_REPO}" (branch "${GITHUB_BRANCH}") ` +
      `tidak ditemukan atau token tidak punya akses ke situ. Cek: (1) GITHUB_OWNER & GITHUB_REPO ejaannya benar, ` +
      `(2) repo tersebut memang ada di GitHub, (3) repo tidak kosong / sudah ada minimal 1 commit di branch tersebut, ` +
      `(4) GITHUB_TOKEN scope-nya mencakup akses ke repo ini.`
    );
  }

  throw new Error(`Gagal menyimpan ke GitHub (${res.status}): ${res.data && res.data.message ? res.data.message : 'Unknown error'}`);
}

module.exports = { readDb, writeDb };
