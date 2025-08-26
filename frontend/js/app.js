// Main Application Controller
class MuslyApp {
    constructor() {
        this.api = new MuslyAPI();
        this.player = new MusicPlayer();
        this.currentResults = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSavedState();
        this.checkMobileDevice();
    }

    setupEventListeners() {
        // Search functionality
        const searchToggle = document.getElementById('searchToggle');
        const searchContainer = document.getElementById('searchContainer');
        const searchInput = document.getElementById('searchInput');
        const searchClear = document.getElementById('searchClear');

        searchToggle.addEventListener('click', () => {
            searchContainer.classList.toggle('active');
            if (searchContainer.classList.contains('active')) {
                searchInput.focus();
            }
        });

        searchInput.addEventListener('input', (e) => {
            searchClear.classList.toggle('visible', e.target.value.length > 0);
            if (e.target.value.length > 2) {
                this.debounceSearch(e.target.value);
            }
        });

        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.classList.remove('visible');
            this.hideResults();
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch(e.target.value);
            }
        });

        // Player controls
        const miniPlayer = document.getElementById('miniPlayer');
        const playerModal = document.getElementById('playerModal');
        const collapsePlayer = document.getElementById('collapsePlayer');

        miniPlayer.addEventListener('click', (e) => {
            if (!e.target.closest('#miniPlayBtn')) {
                this.openFullPlayer();
            }
        });

        collapsePlayer.addEventListener('click', () => {
            this.closeFullPlayer();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                this.player.togglePlay();
            }
            if (e.key === 'ArrowRight' && e.target.tagName !== 'INPUT') {
                this.player.next();
            }
            if (e.key === 'ArrowLeft' && e.target.tagName !== 'INPUT') {
                this.player.previous();
            }
        });

        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            this.handleOrientationChange();
        });
    }

    // Search functionality
    debounceTimer = null;
    debounceSearch(query) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.performSearch(query);
        }, 500);
    }

    async performSearch(query) {
        if (!query || query.length < 2) return;

        this.showLoading();
        
        try {
            const results = await this.api.search(query);
            this.currentResults = results;
            this.displayResults(results);
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Failed to search. Please try again.');
        }
    }

    displayResults(results) {
        const welcomeScreen = document.getElementById('welcomeScreen');
        const loadingContainer = document.getElementById('loadingContainer');
        const resultsContainer = document.getElementById('resultsContainer');
        const tracksList = document.getElementById('tracksList');
        const resultsCount = document.getElementById('resultsCount');

        welcomeScreen.classList.add('hidden');
        loadingContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');

        resultsCount.textContent = `${results.length} tracks found`;
        
        tracksList.innerHTML = results.map((track, index) => `
            <div class="track-item" data-index="${index}">
                <img class="track-thumbnail" src="${track.thumbnail}" alt="${track.title}">
                <div class="track-info">
                    <div class="track-title">${this.escapeHtml(track.title)}</div>
                    <div class="track-artist">${this.escapeHtml(track.artist)}</div>
                </div>
                <div class="track-duration">${track.duration || '--:--'}</div>
            </div>
        `).join('');

        // Add click listeners to tracks
        tracksList.querySelectorAll('.track-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.playTrack(this.currentResults[index]);
                this.highlightPlayingTrack(item);
            });
        });
    }

    async playTrack(track) {
        try {
            // Show mini player
            document.getElementById('miniPlayer').classList.add('visible');
            
            // Update mini player info
            document.getElementById('miniThumbnail').src = track.thumbnail;
            document.getElementById('miniTitle').textContent = track.title;
            document.getElementById('miniArtist').textContent = track.artist;
            
            // Update full player info
            document.getElementById('playerArtwork').src = track.thumbnail;
            document.getElementById('playerTitle').textContent = track.title;
            document.getElementById('playerArtist').textContent = track.artist;
            
            // Get stream URL and play
            const streamData = await this.api.getStreamUrl(track.videoId);
            this.player.loadTrack(streamData.streamUrl, track);
            
        } catch (error) {
            console.error('Play error:', error);
            this.showError('Failed to play track. Please try again.');
        }
    }

    highlightPlayingTrack(element) {
        // Remove previous highlighting
        document.querySelectorAll('.track-item').forEach(item => {
            item.classList.remove('playing');
        });
        
        // Add highlighting to current track
        element.classList.add('playing');
        
        // Add playing indicator
        if (!element.querySelector('.track-playing-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'track-playing-indicator';
            indicator.innerHTML = '<span></span><span></span><span></span>';
            element.appendChild(indicator);
        }
    }

    openFullPlayer() {
        document.getElementById('playerModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeFullPlayer() {
        document.getElementById('playerModal').classList.remove('active');
        document.body.style.overflow = '';
    }

    showLoading() {
        document.getElementById('welcomeScreen').classList.add('hidden');
        document.getElementById('resultsContainer').classList.add('hidden');
        document.getElementById('loadingContainer').classList.remove('hidden');
    }

    hideResults() {
        document.getElementById('resultsContainer').classList.add('hidden');
        document.getElementById('welcomeScreen').classList.remove('hidden');
    }

    showError(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    checkMobileDevice() {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
            document.body.classList.add('mobile-device');
        }
    }

    handleOrientationChange() {
        const orientation = window.orientation;
        if (orientation === 90 || orientation === -90) {
            document.body.classList.add('landscape');
        } else {
            document.body.classList.remove('landscape');
        }
    }

    loadSavedState() {
        // Load last played track, volume, etc. from localStorage
        const savedVolume = localStorage.getItem('musly_volume');
        if (savedVolume) {
            document.getElementById('volumeSlider').value = savedVolume;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.muslyApp = new MuslyApp();
});
