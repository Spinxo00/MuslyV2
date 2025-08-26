const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

app.use(express.json());
app.use(express.static('frontend'));

// YouTube API setup
const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY
});

// Cache for stream URLs (simple in-memory cache)
const streamCache = new Map();

// Search endpoint
app.get('/api/search', async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }
        
        const response = await youtube.search.list({
            part: 'snippet',
            q: q,
            type: 'video',
            videoCategoryId: '10', // Music category
            maxResults: 25,
            safeSearch: 'none'
        });
        
        const videoIds = response.data.items.map(item => item.id.videoId).join(',');
        
        // Get video details for duration
        const detailsResponse = await youtube.videos.list({
            part: 'contentDetails',
            id: videoIds
        });
        
        const tracks = response.data.items.map((item, index) => {
            const duration = detailsResponse.data.items[index]?.contentDetails?.duration;
            return {
                videoId: item.id.videoId,
                title: item.snippet.title,
                artist: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.high.url,
                duration: formatDuration(duration)
            };
        });
        
        res.json({ tracks });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed', message: error.message });
    }
});

// Stream URL endpoint
app.get('/api/stream/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        
        // Check cache first
        if (streamCache.has(videoId)) {
            const cached = streamCache.get(videoId);
            if (cached.expires > Date.now()) {
                return res.json(cached.data);
            }
            streamCache.delete(videoId);
        }
        
        const info = await ytdl.getInfo(videoId);
        
        // Get audio-only formats
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        
        // Prefer webm/opus for better quality and smaller size
        const format = audioFormats.find(f => f.container === 'webm' && f.audioCodec === 'opus') 
                    || audioFormats.find(f => f.container === 'mp4')
                    || audioFormats[0];
        
        if (!format) {
            throw new Error('No audio format available');
        }
        
        const data = {
            streamUrl: format.url,
            duration: info.videoDetails.lengthSeconds,
            quality: format.audioQuality,
            codec: format.audioCodec
        };
        
        // Cache for 1 hour
        streamCache.set(videoId, {
            data,
            expires: Date.now() + 3600000
        });
        
        res.json(data);
    } catch (error) {
        console.error('Stream error:', error);
        res.status(500).json({ error: 'Failed to get stream URL', message: error.message });
    }
});

// Track info endpoint
app.get('/api/track/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        
        const response = await youtube.videos.list({
            part: 'snippet,contentDetails,statistics',
            id: videoId
        });
        
        if (!response.data.items.length) {
            return res.status(404).json({ error: 'Track not found' });
        }
        
        const video = response.data.items[0];
        
        res.json({
            videoId: video.id,
            title: video.snippet.title,
            artist: video.snippet.channelTitle,
            thumbnail: video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high.url,
            duration: formatDuration(video.contentDetails.duration),
            views: parseInt(video.statistics.viewCount).toLocaleString(),
            likes: parseInt(video.statistics.likeCount).toLocaleString()
        });
    } catch (error) {
        console.error('Track info error:', error);
        res.status(500).json({ error: 'Failed to get track info' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Musly API',
        timestamp: new Date().toISOString()
    });
});

// Format ISO 8601 duration to readable format
function formatDuration(isoDuration) {
    if (!isoDuration) return '--:--';
    
    const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    
    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');
    
    let duration = '';
    if (hours) duration += `${hours}:`;
    duration += `${minutes || '0'}:`;
    duration += (seconds || '0').padStart(2, '0');
    
    return duration;
}

// Clean up cache periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of streamCache.entries()) {
        if (value.expires < now) {
            streamCache.delete(key);
        }
    }
}, 300000); // Every 5 minutes

app.listen(PORT, () => {
    console.log(`Musly backend running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
