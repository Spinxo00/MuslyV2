const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "https://www.googleapis.com", "https://i.ytimg.com", "https://www.soundjay.com"],
            mediaSrc: ["'self'", "https:", "http:", "data:"],
        },
    },
}));

app.use(compression());
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// YouTube API proxy (optional - for additional security)
app.get('/api/youtube/search', async (req, res) => {
    try {
        const { q, maxResults = 20 } = req.query;
        
        if (!q) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        const fetch = (await import('node-fetch')).default;
        const API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyCSUEacc1KEgl0d_b2zmS4Fh2uWY0px_jk';
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(q + ' music')}&type=video&key=${API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'YouTube API error');
        }
        
        res.json(data);
    } catch (error) {
        console.error('YouTube API error:', error);
        res.status(500).json({ 
            error: 'Failed to search YouTube', 
            message: error.message 
        });
    }
});

// Catch all handler for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🎵 Musly server running on port ${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} to view the app`);
    console.log(`🌟 Environment: ${process.env.NODE_ENV || 'development'}`);
});
