const express = require('express');
const router = express.Router();
const ytdl = require('ytdl-core');
const youtubeSearchApi = require('youtube-search-api');

// Search YouTube
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        const results = await youtubeSearchApi.GetListByKeyword(q, false, 20);
        
        const tracks = results.items.map(item => ({
            id: item.id,
            title: item.title,
            artist: item.channelTitle,
            thumbnail: item.thumbnail?.thumbnails?.[0]?.url || '',
            duration: item.length?.simpleText || '',
            source: 'youtube'
        }));
        
        res.json({ success: true, tracks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get stream URL
router.get('/stream/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const info = await ytdl.getInfo(videoId);
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        
        if (audioFormats.length > 0) {
            res.json({ 
                success: true, 
                streamUrl: audioFormats[0].url,
                title: info.videoDetails.title,
                thumbnail: info.videoDetails.thumbnails[0].url
            });
        } else {
            res.status(404).json({ success: false, error: 'No audio stream found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
