const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const NodeCache = require('node-cache');
require('dotenv').config();

const youtubeRoutes = require('./routes/youtube');
const spotifyRoutes = require('./routes/spotify');
const soundcloudRoutes = require('./routes/soundcloud');
const freeRoutes = require('./routes/freemusic');
const deezerRoutes = require('./routes/deezer');

const app = express();
const PORT = process.env.PORT || 3000;

// Cache setup
global.cache = new NodeCache({ stdTTL: 600 });

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.use('/api/youtube', youtubeRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/soundcloud', soundcloudRoutes);
app.use('/api/free', freeRoutes);
app.use('/api/deezer', deezerRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'active', 
        timestamp: new Date().toISOString(),
        services: ['youtube', 'spotify', 'soundcloud', 'deezer', 'itunes']
    });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✨ Harmony server running on port ${PORT}`);
});
