require('dotenv').config();
const express = require('express');
const chalk = require('chalk');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 8000;

const upload = multer();

app.enable("trust proxy");
app.set("json spaces", 2);

app.use(express.static(path.join(__dirname, 'src')));
app.use(express.json());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(cors());

global.getBuffer = async (url, options = {}) => {
  try {
    const res = await axios({ method: 'get', url, headers: { 'DNT': 1, 'Upgrade-Insecure-Request': 1 }, ...options, responseType: 'arraybuffer' });
    return res.data;
  } catch (err) { return err; }
};

global.fetchJson = async (url, options = {}) => {
  try {
    const res = await axios({ method: 'GET', url, headers: { 'User-Agent': 'Mozilla/5.0' }, ...options });
    return res.data;
  } catch (err) { return err; }
};

const settings = {
  name: "Skyzopedia Api's",
  description: "Skyzopedia Api is a simple and lightweight REST API built with Express.js",
  apiSettings: { creator: "Skyzopedia", apikey: ["key1", "key2", "123"] },
  linkWhatsapp: "https://whatsapp.com/channel/0029Vb7HGkP7j6g5lLi0JY0f",
  linkYoutube: "https://www.youtube.com/@skyzopedia-0xf"
};

global.apikey = [...settings.apiSettings.apikey];
global.staticApikeys = [...settings.apiSettings.apikey]; // salinan tetap, dipakai apikeyGate.js buat bedain master key vs apikey per-user

app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (data) {
    if (data && typeof data === 'object') {
      const responseData = { status: data.status, creator: settings.apiSettings.creator || "Created Using Skyzopedia", ...data };
      return originalJson.call(this, responseData);
    }
    return originalJson.call(this, data);
  };
  next();
});

let totalRoutes = 0;
let rawEndpoints = {};

const apiFolder = path.join(__dirname, './api');

const SENSITIVE_LOG_FIELDS = ['password', 'pass', 'apikey', 'token', 'secret'];
const redactBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  const clone = { ...body };
  for (const key of Object.keys(clone)) {
    if (SENSITIVE_LOG_FIELDS.includes(key.toLowerCase())) clone[key] = '***redacted***';
  }
  return clone;
};

// Kategori endpoint yang TIDAK pakai sistem apikey+limit (dia pakai token login sendiri)
const NO_APIKEY_LIMIT_CATEGORIES = ['Auth', 'Account', 'Admin'];
const { checkAndConsumeApikey } = require('./lib/apikeyGate');

const register = (ep, file) => {
  if (ep && ep.name && ep.desc && ep.category && ep.path && typeof ep.run === "function") {
    const cleanPath = ep.path.split("?")[0];
    const method = ep.method ? ep.method.toLowerCase() : 'get';
    const needsApikeyGate = !NO_APIKEY_LIMIT_CATEGORIES.includes(ep.category);

    if (method === 'post') {
      app.post(cleanPath, upload.any(), async (req, res, next) => {
        console.log(`POST ${cleanPath} - Body:`, redactBody(req.body));
        console.log(`POST ${cleanPath} - Files:`, req.files);

        if (needsApikeyGate) {
          const suppliedKey = (req.body && req.body.apikey) || req.query.apikey;
          const gate = await checkAndConsumeApikey(suppliedKey);
          if (!gate.ok) {
            return res.status(gate.status || 403).json({ status: false, error: gate.error });
          }
        }

        ep.run(req, res, next);
      });
    } else {
      app.get(cleanPath, async (req, res, next) => {
        console.log(`GET ${cleanPath} - Query:`, req.query);

        if (needsApikeyGate) {
          const suppliedKey = req.query.apikey;
          const gate = await checkAndConsumeApikey(suppliedKey);
          if (!gate.ok) {
            return res.status(gate.status || 403).json({ status: false, error: gate.error });
          }
        }

        ep.run(req, res, next);
      });
    }

    if (!rawEndpoints[ep.category]) rawEndpoints[ep.category] = [];
    
    const endpointData = {
      name: ep.name,
      desc: ep.desc,
      path: ep.path,
      method: ep.method || 'GET',
      ...(ep.innerDesc ? { innerDesc: ep.innerDesc } : {}),
      ...(ep.body ? { body: ep.body } : {})
    };
    
    rawEndpoints[ep.category].push(endpointData);
    totalRoutes++;
    console.log(chalk.bgHex('#FFFF99').hex('#333').bold(` Loaded Route: ${file} → ${ep.name} (${method.toUpperCase()}) `));
  }
};

fs.readdirSync(apiFolder).forEach((file) => {
  const filePath = path.join(apiFolder, file);
  if (path.extname(file) === '.js') {
    try {
      delete require.cache[require.resolve(filePath)];
      const routeModule = require(filePath);
      if (Array.isArray(routeModule)) {
        routeModule.forEach(ep => register(ep, file));
      } else if (routeModule.endpoint) {
        register(routeModule.endpoint, file);
      } else if (typeof routeModule === "function") {
        routeModule(app);
      } else {
        register(routeModule, file);
      }
    } catch (err) {
      console.error(chalk.red(`Error loading ${file}:`), err.message);
    }
  }
});

console.log(chalk.bgHex('#90EE90').hex('#333').bold(' Load Complete! ✓ '));
console.log(chalk.bgHex('#90EE90').hex('#333').bold(` Total Routes Loaded: ${totalRoutes} `));

app.get('/settings', (req, res) => {
  const endpoints = {
    categories: Object.keys(rawEndpoints)
      .sort((a, b) => a.localeCompare(b))
      .map(category => ({
        name: category,
        items: rawEndpoints[category].sort((a, b) => a.name.localeCompare(b.name))
      }))
  };
  settings.categories = endpoints.categories;
  res.json(settings);
});

app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/docs.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/register.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/home.html'));
});

app.listen(PORT, () => {
  console.log(chalk.bgHex('#90EE90').hex('#333').bold(` Server is running on port ${PORT} `));
});

module.exports = app;
