// API Service for backend communication
class MuslyAPI {
    constructor() {
        // Update this with your Render.com backend URL
        this.baseURL = process.env.API_URL || 'https://musly-api.onrender.com';
    }

    async search(query) {
        try {
            const response = await fetch(`${this.baseURL}/api/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Search failed');
            
            const data = await response.json();
            return data.tracks;
        } catch (error) {
            console.error('Search error:', error);
            throw error;
        }
    }

    async getStreamUrl(videoId) {
        try {
            const response = await fetch(`${this.baseURL}/api/stream/${videoId}`);
            if (!response.ok) throw new Error('Failed to get stream URL');
            
            return await response.json();
        } catch (error) {
            console.error('Stream URL error:', error);
            throw error;
        }
    }

    async getTrackInfo(videoId) {
        try {
            const response = await fetch(`${this.baseURL}/api/track/${videoId}`);
            if (!response.ok) throw new Error('Failed to get track info');
            
            return await response.json();
        } catch (error) {
            console.error('Track info error:', error);
            throw error;
        }
    }

    async getPlaylists() {
        try {
            const response = await fetch(`${this.baseURL}/api/playlists`);
            if (!response.ok) throw new Error('Failed to get playlists');
            
            return await response.json();
        } catch (error) {
            console.error('Playlists error:', error);
            throw error;
        }
    }
}
