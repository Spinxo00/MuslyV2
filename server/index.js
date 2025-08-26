import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Simple in-memory cache with TTL
class SimpleCache {
  constructor(ttlMs = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.ttl = ttlMs;
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

const cache = new SimpleCache();

// Security headers with CSP for embedded content
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.youtube.com", "https://w.soundcloud.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "https:", "blob:"],
      frameSrc: ["https://www.youtube.com", "https://w.soundcloud.com"],
      connectSrc: ["'self'", "https://api.audius.co", "https://discoveryprovider.audius.co", "https://discoveryprovider2.audius.co", "https://discoveryprovider3.audius.co", "https://dn1.monophonic.digital", "https://*.audius.co", "https://*.audius.org"],
      workerSrc: ["'self'"]
    }
  }
}));

app.use(compression());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(join(dirname(__dirname), 'public'), {
  maxAge: '1h',
  setHeaders: (res, path) => {
    if (path.endsWith('.webmanifest')) {
      res.setHeader('Content-Type', 'application/manifest+json');
    }
  }
}));

// Audius discovery host resolver
async function getAudiusHost() {
  const cached = cache.get('audius_host');
  if (cached) return cached;
  
  try {
    const response = await fetch('https://api.audius.co');
    const data = await response.json();
    const host = data.data;
    cache.set('audius_host', host);
    return host;
  } catch (error) {
    console.error('Failed to get Audius host:', error);
    // Fallback to known hosts
    return 'https://discoveryprovider.audius.co';
  }
}

// Audius search endpoint
app.get('/api/audius/search', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Query parameter required' });
  }
  
  try {
    const host = await getAudiusHost();
    const url = `${host}/v1/tracks/search?query=${encodeURIComponent(q)}&app_name=demus-pwa`;
    
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Audius search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Audius stream endpoint - returns redirect to official stream URL
app.get('/api/audius/stream/:trackId', async (req, res) => {
  const { trackId } = req.params;
  
  try {
    const host = await getAudiusHost();
    const url = `${host}/v1/tracks/${trackId}/stream?app_name=demus-pwa`;
    
    // Return 302 redirect to the official Audius stream URL
    res.redirect(302, url);
  } catch (error) {
    console.error('Audius stream error:', error);
    res.status(500).json({ error: 'Stream failed' });
  }
});

// YouTube oEmbed proxy
app.get('/api/youtube/oembed', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }
  
  const cacheKey = `yt_${url}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oembedUrl);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Invalid YouTube URL' });
    }
    
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
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }
  
  const cacheKey = `sc_${url}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  
  try {
    const oembedUrl = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Invalid SoundCloud URL' });
    }
    
    const data = await response.json();
    cache.set(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error('SoundCloud oEmbed error:', error);
    res.status(500).json({ error: 'Failed to get track info' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✨ Demus PWA running on port ${PORT}`);
});
