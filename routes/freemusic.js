const express = require('express');
const router = express.Router();
const axios = require('axios');

// iTunes Search API (completely free, no key needed)
router.get('/search/itunes', async (req, res) => {
    try {
        const { q, limit = 25 } = req.query;
        
        const response = await axios.get('https://itunes.apple.com/search', {
            params: {
                term: q,
                media: 'music',
                entity: 'song',
                limit: limit
            }
        });
        
        const tracks = response.data.results.map(track => ({
            id: track.trackId,
            title: track.trackName,
            artist: track.artistName,
            album: track.collectionName,
            thumbnail: track.artworkUrl100?.replace('100x100', '500x500') || '',
            preview: track.previewUrl,
            duration: Math.floor(track.trackTimeMillis / 1000),
            source: 'itunes',
            genre: track.primaryGenreName,
            releaseDate: track.releaseDate
        }));
        
        res.json({ success: true, tracks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Free Music Archive API
router.get('/search/fma', async (req, res) => {
    try {
        const { q } = req.query;
        
        // Free Music Archive has a public API
        const response = await axios.get('https://freemusicarchive.org/api/get/tracks.json', {
            params: {
                api_key: 'demo', // Demo key for testing
                limit: 20,
                q: q
            }
        });
        
        const tracks = response.data.dataset.map(track => ({
            id: track.track_id,
            title: track.track_title,
            artist: track.artist_name,
            thumbnail: track.track_image_file,
            preview: track.track_file,
            duration: track.track_duration,
            source: 'fma'
        }));
        
        res.json({ success: true, tracks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Jamendo API (free music)
router.get('/search/jamendo', async (req, res) => {
    try {
        const { q } = req.query;
        const CLIENT_ID = '00000000'; // Get free client ID from Jamendo
        
        const response = await axios.get('https://api.jamendo.com/v3.0/tracks', {
            params: {
                client_id: CLIENT_ID,
                format: 'json',
                limit: 20,
                search: q
            }
        });
        
        const tracks = response.data.results.map(track => ({
            id: track.id,
            title: track.name,
            artist: track.artist_name,
            thumbnail: track.image,
            preview: track.audio,
            duration: track.duration,
            source: 'jamendo'
        }));
        
        res.json({ success: true, tracks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
