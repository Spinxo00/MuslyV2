const express = require('express');
const router = express.Router();
const axios = require('axios');

// Deezer public API (no auth required for search)
router.get('/search', async (req, res) => {
    try {
        const { q, limit = 25 } = req.query;
        
        const response = await axios.get('https://api.deezer.com/search', {
            params: {
                q: q,
                limit: limit
            }
        });
        
        const tracks = response.data.data.map(track => ({
            id: track.id,
            title: track.title,
            artist: track.artist.name,
            album: track.album.title,
            thumbnail: track.album.cover_xl || track.album.cover_big,
            preview: track.preview, // 30 second preview
            duration: track.duration,
            source: 'deezer',
            explicit: track.explicit_lyrics
        }));
        
        res.json({ success: true, tracks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get top charts
router.get('/charts', async (req, res) => {
    try {
        const response = await axios.get('https://api.deezer.com/chart');
        
        const tracks = response.data.tracks.data.map(track => ({
            id: track.id,
            title: track.title,
            artist: track.artist.name,
            thumbnail: track.album.cover_xl,
            preview: track.preview,
            duration: track.duration,
            source: 'deezer'
        }));
        
        res.json({ success: true, tracks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
