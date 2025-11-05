// Simple Proxy Server for Railway (Free Tier)
// Deploy this to Railway to get free proxy for economic calendar

const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
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
    
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.investing.com/'
      },
      timeout: 20000,
      validateStatus: () => true // Accept all status codes
    });

    res.status(response.status);
    res.set('Content-Type', response.headers['content-type'] || 'text/html');
    res.send(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ 
      error: 'Proxy request failed',
      message: error.message 
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

