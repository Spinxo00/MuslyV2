const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const youtubeRoutes = require('./routes/youtube');
const spotifyRoutes = require('./routes/spotify');
const soundcloudRoutes = require('./routes/soundcloud');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.use('/api/youtube', youtubeRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/soundcloud', soundcloudRoutes);

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
