const express = require('express');
const router = express.Router();
const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET
});

// Get access token
async function getAccessToken() {
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body['access_token']);
        return data.body['access_token'];
    } catch (error) {
        console.error('Error getting access token:', error);
        throw error;
    }
}

// Search Spotify
router.get('/search', async (req, res) => {
    try {
        await getAccessToken();
        const { q } = req.query;
        const data = await spotifyApi.searchTracks(q, { limit: 20 });
        
        const tracks = data.body.tracks.items.map(track => ({
            id: track.id,
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            thumbnail: track.album.images[0]?.url || '',
            duration: Math.floor(track.duration_ms / 1000),
            preview_url: track.preview_url,
            source: 'spotify'
        }));
        
        res.json({ success: true, tracks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
