// Simple Proxy Server for Railway (Free Tier)
// Deploy this to Railway to get free proxy for economic calendar

const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const BROWSER_BASE = {
  'User-Agent': DEFAULT_UA,
  'Accept-Language': 'en-US,en;q=0.9',
  'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};

function isInvestingUrl(url) {
  return url.includes('investing.com');
}

function isCalendarXhr(url, incoming = {}) {
  return (
    url.includes('getCalendarFilteredData') ||
    url.includes('/economic-calendar/Service/') ||
    incoming['x-requested-with'] === 'XMLHttpRequest'
  );
}

function isCloudflareChallenge(body) {
  return (
    typeof body === 'string' &&
    (body.includes('Just a moment') ||
      body.includes('cf-browser-verification') ||
      body.includes('challenge-platform'))
  );
}

function mergeCookies(existing, setCookieHeader) {
  const jar = new Map();
  for (const part of (existing || '').split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) jar.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
  }
  const setCookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];
  for (const raw of setCookies) {
    const pair = raw.split(';')[0];
    const eq = pair.indexOf('=');
    if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

/** Investing.com calendar XHR (Today tab) needs JSON/XHR headers, not HTML Accept. */
function headersForTarget(targetUrl, incoming = {}, cookie = '') {
  const isXhr = isCalendarXhr(targetUrl, incoming);
  const headers = {
    ...BROWSER_BASE,
    'User-Agent': incoming['user-agent'] || DEFAULT_UA,
    'Accept-Language': incoming['accept-language'] || BROWSER_BASE['Accept-Language'],
    Referer: incoming.referer || (isXhr ? 'https://www.investing.com/economic-calendar/' : 'https://www.investing.com/'),
    Origin: 'https://www.investing.com',
    Connection: 'keep-alive',
  };

  if (isXhr) {
    headers.Accept =
      incoming.accept || 'application/json, text/javascript, */*; q=0.01';
    headers['X-Requested-With'] = incoming['x-requested-with'] || 'XMLHttpRequest';
    headers['sec-fetch-dest'] = 'empty';
    headers['sec-fetch-mode'] = 'cors';
    headers['sec-fetch-site'] = 'same-origin';
    headers['Cache-Control'] = 'no-cache';
    headers.Pragma = 'no-cache';
  } else {
    headers.Accept =
      incoming.accept ||
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
    headers['sec-fetch-dest'] = 'document';
    headers['sec-fetch-mode'] = 'navigate';
    headers['sec-fetch-site'] = 'none';
    headers['sec-fetch-user'] = '?1';
    headers['Upgrade-Insecure-Requests'] = '1';
  }

  if (cookie) {
    headers.Cookie = cookie;
  }

  return headers;
}

async function warmInvestingSession(incoming = {}) {
  const warmupUrl = 'https://www.investing.com/economic-calendar/';
  const response = await axios.get(warmupUrl, {
    headers: headersForTarget(warmupUrl, incoming),
    timeout: 20000,
    validateStatus: () => true,
    maxRedirects: 5,
  });
  const body = typeof response.data === 'string' ? response.data : '';
  const cookie = mergeCookies('', response.headers['set-cookie']);
  return { cookie, cloudflare: isCloudflareChallenge(body), status: response.status };
}

async function fetchTarget(targetUrl, incoming = {}) {
  let cookie = '';
  if (isInvestingUrl(targetUrl)) {
    try {
      const session = await warmInvestingSession(incoming);
      cookie = session.cookie;
      console.log('Session warmup:', {
        status: session.status,
        cloudflare: session.cloudflare,
        hasCookie: cookie.length > 0,
      });
    } catch (err) {
      console.warn('Session warmup failed:', err.message);
    }
  }

  return axios.get(targetUrl, {
    headers: headersForTarget(targetUrl, incoming, cookie),
    timeout: 25000,
    validateStatus: () => true,
    maxRedirects: 5,
  });
}

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, X-Requested-With, Referer, User-Agent, Accept-Language'
  );
  next();
});

// Simple proxy endpoint
app.get('/', async (req, res) => {
  try {
    const targetUrl = req.query.url;

    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    console.log('Proxying request to:', targetUrl);

    const response = await fetchTarget(targetUrl, req.headers);
    const body =
      typeof response.data === 'string' ? response.data : JSON.stringify(response.data ?? '');

    if (isCloudflareChallenge(body)) {
      console.warn('Cloudflare challenge from Investing.com for:', targetUrl);
      // Pass through upstream body/status so Vercel can try other methods; do not 503 (breaks axios fallback).
      res.set('X-Proxy-Cloudflare', '1');
    }

    res.status(response.status);
    res.set('Content-Type', response.headers['content-type'] || 'text/html');
    res.send(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({
      error: 'Proxy request failed',
      message: error.message,
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
