const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Simple in-memory cache with TTL
class Cache {
  constructor(ttl = 300000) { // 5 minutes default
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  set(key, value) {
    this.cache.set(key, {
      value,
      expires: Date.now() + this.ttl
    });
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }
}

const cache = new Cache();

// Middleware
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.youtube.com", "https://w.soundcloud.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "https:", "blob:"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://w.soundcloud.com"],
      connectSrc: ["'self'", "https://api.audius.co", "https://discoveryprovider.audius.co", "https://discoveryprovider2.audius.co", "https://discoveryprovider3.audius.co", "https://*.audius.co"]
    }
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Audius discovery host resolver
async function getAudiusHost() {
  const cached = cache.get('audius_host');
  if (cached) return cached;
  
  try {
    const response = await fetch('https://api.audius.co');
    const data = await response.json();
    const host = data.data[0]; // Get first healthy host
    cache.set('audius_host', host);
    return host;
  } catch (error) {
    console.error('Failed to get Audius host:', error);
    return 'https://discoveryprovider.audius.co'; // Fallback
  }
}

// Audius search proxy
app.get('/api/audius/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query required' });
    }
    
    const host = await getAudiusHost();
    const url = `${host}/v1/tracks/search?query=${encodeURIComponent(q)}&app_name=demus_pwa`;
    
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Audius search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Audius stream proxy (302 redirect to official stream URL)
app.get('/api/audius/stream/:trackId', async (req, res) => {
  try {
    const { trackId } = req.params;
    const host = await getAudiusHost();
    const streamUrl = `${host}/v1/tracks/${trackId}/stream?app_name=demus_pwa`;
    
    // Redirect to official Audius stream URL (respects ToS)
    res.redirect(302, streamUrl);
  } catch (error) {
    console.error('Audius stream error:', error);
    res.status(500).json({ error: 'Stream failed' });
  }
});

// YouTube oEmbed proxy
app.get('/api/youtube/oembed', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }
    
    const cacheKey = `yt_${url}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oembedUrl);
    const data = await response.json();
    
    cache.set(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error('YouTube oEmbed error:', error);
    res.status(500).json({ error: 'Failed to get video info' });
  }
});

// SoundCloud oEmbed proxy
app.get('/api/soundcloud/oembed', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }
    
    const cacheKey = `sc_${url}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    const oembedUrl = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}&auto_play=false`;
    const response = await fetch(oembedUrl);
    const data = await response.json();
    
    cache.set(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error('SoundCloud oEmbed error:', error);
    res.status(500).json({ error: 'Failed to get track info' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
