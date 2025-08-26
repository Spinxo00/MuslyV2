const express = require('express');
const router = express.Router();
const axios = require('axios');

const SC_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;

// Search SoundCloud
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        const response = await axios.get('https://api-v2.soundcloud.com/search/tracks', {
            params: {
                q: q,
                client_id: SC_CLIENT_ID,
                limit: 20
            }
        });
        
        const tracks = response.data.collection.map(track => ({
            id: track.id,
            title: track.title,
            artist: track.user.username,
            thumbnail: track.artwork_url || track.user.avatar_url,
            duration: Math.floor(track.duration / 1000),
            stream_url: `${track.media.transcodings[0].url}?client_id=${SC_CLIENT_ID}`,
            source: 'soundcloud'
        }));
        
        res.json({ success: true, tracks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
