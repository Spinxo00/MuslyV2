// Main Application Controller
class HarmonyApp {
    constructor() {
        this.currentSource = 'itunes';
        this.currentTrack = null;
        this.tracks = [];
        this.isLoading = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeApp();
        this.loadPreferences();
        this.setupServiceWorker();
    }

    initializeApp() {
        // Hide loading screen with animation
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                this.animateIntroduction();
            }, 300);
        }, 1500);
    }

    animateIntroduction() {
        // Animate UI elements on first load
        const elements = [
            '.ios-nav',
            '.source-section',
            '.quick-actions',
            '.content-section',
            '.tab-bar'
        ];

        elements.forEach((selector, index) => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.opacity = '0';
                element.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    element.style.transition = 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                }, index * 100);
            }
        });
    }

    setupEventListeners() {
        // Source pills
        document.querySelectorAll('.source-pill').forEach(pill => {
            pill.addEventListener('click', (e) => this.handleSourceChange(e));
        });

        // Quick actions
        document.getElementById('chartsBtn')?.addEventListener('click', () => this.loadCharts());
        document.getElementById('exploreBtn')?.addEventListener('click', () => this.loadCharts());

        // Tab bar
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.addEventListener('click', (e) => this.handleTabChange(e));
        });

        // Search
        document.getElementById('searchToggle')?.addEventListener('click', () => this.toggleSearch());
        document.getElementById('searchCancel')?.addEventListener('click', () => this.closeSearch());
        document.getElementById('searchInput')?.addEventListener('input', (e) => this.handleSearchInput(e));

        // Mini player
        document.getElementById('miniPlayer')?.addEventListener('click', () => this.openFullPlayer());
        document.getElementById('playerDismiss')?.addEventListener('click', () => this.closeFullPlayer());

        // Add touch feedback
        this.addTouchFeedback();
    }

    handleSourceChange(e) {
        const pill = e.currentTarget;
        const source = pill.dataset.source;
        
        // Update active state
        document.querySelectorAll('.source-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        
        this.currentSource = source;
        
        // Animate change
        this.animateSourceChange();
        
        // Save preference
        localStorage.setItem('preferredSource', source);
    }

    animateSourceChange() {
        const container = document.getElementById('resultsContainer');
        container.style.opacity = '0';
        container.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            container.style.transition = 'all 0.3s ease';
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        }, 100);
    }

    async performSearch(query) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();
        
        try {
            let endpoint;
            switch(this.currentSource) {
                case 'itunes':
                    endpoint = `/api/free/search/itunes?q=${encodeURIComponent(query)}`;
                    break;
                case 'deezer':
                    endpoint = `/api/deezer/search?q=${encodeURIComponent(query)}`;
                    break;
                case 'youtube':
                    endpoint = `/api/youtube/search?q=${encodeURIComponent(query)}`;
                    break;
                case 'spotify':
                    endpoint = `/api/spotify/search?q=${encodeURIComponent(query)}`;
                    break;
                case 'soundcloud':
                    endpoint = `/api/soundcloud/search?q=${encodeURIComponent(query)}`;
                    break;
                default:
                    endpoint = `/api/free/search/itunes?q=${encodeURIComponent(query)}`;
            }
            
            const response = await fetch(endpoint);
            const data = await response.json();
            
            if (data.success) {
                this.tracks = data.tracks;
                this.displayTracks(data.tracks);
            } else {
                this.showError('No results found');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Failed to search. Please try again.');
        } finally {
            this.isLoading = false;
        }
    }

    displayTracks(tracks) {
        const container = document.getElementById('resultsContainer');
        const sectionTitle = document.getElementById('sectionTitle');
        
        sectionTitle.textContent = 'Search Results';
        
        if (tracks.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="bi bi-search"></i>
                    <p>No tracks found</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        tracks.forEach((track, index) => {
            const card = this.createTrackCard(track, index);
            container.appendChild(card);
            
            // Animate each card
            setTimeout(() => {
                card.classList.add('slide-up');
            }, index * 50);
        });
    }

    createTrackCard(track, index) {
        const card = document.createElement('div');
        card.className = 'track-card';
        card.dataset.index = index;
        
        card.innerHTML = `
            <img class="track-thumbnail" 
                 src="${track.thumbnail || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="56" height="56" fill="%23E5E5EA"%3E%3Crect width="56" height="56" rx="8"/%3E%3C/svg%3E'}" 
                 alt="${track.title}"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="56" height="56" fill="%23E5E5EA"%3E%3Crect width="56" height="56" rx="8"/%3E%3C/svg%3E'">
            <div class="track-info">
                <div class="track-title">${this.escapeHtml(track.title)}</div>
                <div class="track-artist">${this.escapeHtml(track.artist)}</div>
            </div>
            <div class="track-actions">
                <button class="track-play" data-index="${index}">
                    <i class="bi bi-play-fill"></i>
                </button>
                <button class="track-more">
                    <i class="bi bi-three-dots"></i>
                </button>
            </div>
        `;
        
        // Add event listeners
        card.querySelector('.track-play').addEventListener('click', (e) => {
            e.stopPropagation();
            this.playTrack(track);
        });
        
        card.addEventListener('click', () => this.playTrack(track));
        
        return card;
    }

    async playTrack(track) {
        this.currentTrack = track;
        
        // Get stream URL based on source
        let streamUrl = track.preview || track.stream_url;
        
        if (track.source === 'youtube') {
            try {
                const response = await fetch(`/api/youtube/stream/${track.id}`);
                const data = await response.json();
                if (data.success) {
                    streamUrl = data.streamUrl;
                }
            } catch (error) {
                console.error('Failed to get stream URL:', error);
            }
        }
        
        if (streamUrl) {
            window.musicPlayer.loadTrack(streamUrl, track);
            this.showMiniPlayer(track);
        } else {
            this.showError('Preview not available for this track');
        }
    }

    showMiniPlayer(track) {
        const miniPlayer = document.getElementById('miniPlayer');
        document.getElementById('miniThumbnail').src = track.thumbnail || '';
        document.getElementById('miniTitle').textContent = track.title;
        document.getElementById('miniArtist').textContent = track.artist;
        
        miniPlayer.classList.remove('hidden');
        miniPlayer.style.animation = 'slide-up 0.3s ease-out';
    }

    openFullPlayer() {
        document.getElementById('fullPlayer').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeFullPlayer() {
        document.getElementById('fullPlayer').classList.remove('active');
        document.body.style.overflow = '';
    }

    toggleSearch() {
        const searchSection = document.getElementById('searchSection');
        searchSection.classList.toggle('active');
        
        if (searchSection.classList.contains('active')) {
            document.getElementById('searchInput').focus();
        }
    }

    closeSearch() {
        document.getElementById('searchSection').classList.remove('active');
        document.getElementById('searchInput').value = '';
    }

    handleSearchInput(e) {
        const query = e.target.value;
        const clearBtn = document.getElementById('searchClear');
        
        if (query.length > 0) {
            clearBtn.classList.remove('hidden');
            
            // Debounced search
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                if (query.length > 2) {
                    this.performSearch(query);
                }
            }, 500);
        } else {
            clearBtn.classList.add('hidden');
        }
    }

    async loadCharts() {
        this.showLoading();
        
        try {
            const response = await fetch('/api/deezer/charts');
            const data = await response.json();
            
            if (data.success) {
                this.tracks = data.tracks;
                this.displayTracks(data.tracks);
                document.getElementById('sectionTitle').textContent = 'Top Charts';
            }
        } catch (error) {
            console.error('Failed to load charts:', error);
            this.showError('Failed to load charts');
        }
    }

    handleTabChange(e) {
        const tab = e.currentTarget;
        const tabName = tab.dataset.tab;
        
        // Update active state
        document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Handle tab logic
        switch(tabName) {
            case 'home':
                this.loadHome();
                break;
            case 'search':
                this.toggleSearch();
                break;
            case 'library':
                this.loadLibrary();
                break;
            case 'profile':
                this.loadProfile();
                break;
        }
    }

    loadHome() {
        // Implement home screen
        const container = document.getElementById('resultsContainer');
        container.innerHTML = `
            <div class="welcome-screen">
                <div class="welcome-icon">
                    <i class="bi bi-music-note-beamed"></i>
                </div>
                <h2>Welcome Back</h2>
                <p>Discover new music from multiple sources</p>
                <button class="cta-button" onclick="window.app.loadCharts()">
                    <i class="bi bi-fire"></i>
                    Explore Top Charts
                </button>
            </div>
        `;
    }

    loadLibrary() {
        // Implement library screen
        this.showError('Library coming soon');
    }

    loadProfile() {
        // Implement profile screen
        this.showError('Profile coming soon');
    }

    showLoading() {
        const container = document.getElementById('resultsContainer');
        container.innerHTML = `
            <div class="loading-container">
                ${this.createSkeletonCards(6)}
            </div>
        `;
    }

    createSkeletonCards(count) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="track-card skeleton">
                    <div class="skeleton-thumbnail"></div>
                    <div class="skeleton-info">
                        <div class="skeleton-title"></div>
                        <div class="skeleton-artist"></div>
                    </div>
                </div>
            `;
        }
        return html;
    }

    showError(message) {
        const container = document.getElementById('resultsContainer');
        container.innerHTML = `
            <div class="error-screen">
                <i class="bi bi-exclamation-circle"></i>
                <p>${message}</p>
            </div>
        `;
    }

    addTouchFeedback() {
        // Add iOS-style touch feedback
        document.addEventListener('touchstart', (e) => {
            if (e.target.closest('.track-card, .action-card, button')) {
                e.target.closest('.track-card, .action-card, button').style.opacity = '0.7';
            }
        });
        
        document.addEventListener('touchend', () => {
            document.querySelectorAll('.track-card, .action-card, button').forEach(el => {
                el.style.opacity = '1';
            });
        });
    }

    loadPreferences() {
        const savedSource = localStorage.getItem('preferredSource');
        if (savedSource) {
            this.currentSource = savedSource;
            document.querySelectorAll('.source-pill').forEach(pill => {
                pill.classList.toggle('active', pill.dataset.source === savedSource);
            });
        }
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err => {
                console.log('ServiceWorker registration failed:', err);
            });
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new HarmonyApp();
});
