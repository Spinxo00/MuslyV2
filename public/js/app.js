// Main App Controller
class MusicApp {
    constructor() {
        this.currentSource = 'youtube';
        this.searchResults = [];
        this.currentTrack = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeSplashScreen();
        this.loadUserPreferences();
    }

    initializeSplashScreen() {
        setTimeout(() => {
            document.getElementById('splash-screen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('splash-screen').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                this.animateMainApp();
            }, 500);
        }, 2000);
    }

    animateMainApp() {
        const elements = document.querySelectorAll('.source-btn, .search-container, .app-header');
        elements.forEach((el, index) => {
            setTimeout(() => {
                el.style.animation = 'slideInUp 0.5s ease-out';
            }, index * 100);
        });
    }

    setupEventListeners() {
        // Source selector
        document.querySelectorAll('.source-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleSourceChange(e));
        });

        // Search
        document.getElementById('searchBtn').addEventListener('click', () => this.performSearch());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });

        // Add ripple effect to buttons
        document.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => this.createRipple(e));
        });
    }

    handleSourceChange(e) {
        const btn = e.currentTarget;
        const source = btn.dataset.source;
        
        document.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.currentSource = source;
        this.animateSourceChange();
        
        // Save preference
        localStorage.setItem('preferredSource', source);
    }

    animateSourceChange() {
        const container = document.getElementById('resultsContainer');
        container.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            container.innerHTML = '';
            container.style.animation = '';
        }, 300);
    }

    async performSearch() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) return;

        this.showLoading();
        
        try {
            const response = await fetch(`/api/${this.currentSource}/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.success) {
                this.displayResults(data.tracks);
            } else {
                this.showError('Search failed. Please try again.');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Network error. Please check your connection.');
        }
    }

    displayResults(tracks) {
        const container = document.getElementById('resultsContainer');
        container.innerHTML = '';
        
        if (tracks.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <p>No results found</p>
                </div>
            `;
            return;
        }

        tracks.forEach((track, index) => {
            const card = this.createTrackCard(track, index);
            container.appendChild(card);
        });
    }

    createTrackCard(track, index) {
        const card = document.createElement('div');
        card.className = 'track-card';
        card.style.animationDelay = `${index * 0.05}s`;
        
        card.innerHTML = `
            <img src="${track.thumbnail}" alt="${track.title}" class="track-thumbnail" onerror="this.src='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23667eea" width="100" height="100"/%3E%3C/svg%3E'">
            <div class="track-info">
                <div class="track-title">${track.title}</div>
                <div class="track-artist">${track.artist}</div>
            </div>
            <button class="track-play-btn" data-track='${JSON.stringify(track)}'>
                <svg viewBox="0 0 24 24">
                    <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
                </svg>
            </button>
        `;
        
        card.querySelector('.track-play-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.playTrack(track);
        });
        
        card.addEventListener('click', () => this.playTrack(track));
        
        return card;
    }

    async playTrack(track) {
        this.currentTrack = track;
        const player = window.musicPlayer;
        
        if (track.source === 'youtube') {
            const response = await fetch(`/api/youtube/stream/${track.id}`);
            const data = await response.json();
            if (data.success) {
                player.loadTrack(data.streamUrl, track);
            }
        } else if (track.source === 'spotify' && track.preview_url) {
            player.loadTrack(track.preview_url, track);
        } else if (track.source === 'soundcloud' && track.stream_url) {
            player.loadTrack(track.stream_url, track);
        }
        
        this.showPlayer();
    }

    showPlayer() {
        document.getElementById('player').classList.remove('hidden');
    }

    showLoading() {
        const container = document.getElementById('resultsContainer');
        container.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
            </div>
        `;
    }

    showError(message) {
        const container = document.getElementById('resultsContainer');
        container.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
            </div>
        `;
    }

    createRipple(e) {
        const button = e.currentTarget;
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        button.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    }

    loadUserPreferences() {
        const savedSource = localStorage.getItem('preferredSource');
        if (savedSource) {
            this.currentSource = savedSource;
            document.querySelectorAll('.source-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.source === savedSource);
            });
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.musicApp = new MusicApp();
});
