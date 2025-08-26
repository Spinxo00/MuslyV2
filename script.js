// Musly - Advanced Music Player v2.0
const API_KEY = 'AIzaSyCSUEacc1KEgl0d_b2zmS4Fh2uWY0px_jk';

// Enhanced State Management
const AppState = {
    player: null,
    currentVideoId: null,
    queue: [],
    currentIndex: 0,
    isPlaying: false,
    isRepeat: false,
    isShuffle: false,
    playlists: [],
    history: [],
    recentSearches: [],
    likedSongs: [],
    currentPlaylist: null,
    selectedColor: '#667eea',
    contextTarget: null,
    totalListeningTime: 0,
    settings: {
        theme: 'dark',
        accentColor: '#667eea',
        autoplay: true,
        crossfade: false,
        defaultVolume: 70,
        quality: 'auto'
    },
    volume: 70
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadLocalData();
    setupEventListeners();
    initializeSortable();
    applySettings();
});

// Enhanced Initialize App
function initializeApp() {
    updateQueueUI();
    updatePlaylistsUI();
    updateLibraryStats();
    loadRecentSearches();
    updateLikedSongsUI();
    updateHistoryUI();
}

// Enhanced Local Storage Management
function loadLocalData() {
    const savedData = {
        playlists: localStorage.getItem('musly_playlists'),
        queue: localStorage.getItem('musly_queue'),
        history: localStorage.getItem('musly_history'),
        recentSearches: localStorage.getItem('musly_recent_searches'),
        likedSongs: localStorage.getItem('musly_liked_songs'),
        totalTime: localStorage.getItem('musly_total_time'),
        settings: localStorage.getItem('musly_settings')
    };

    if (savedData.playlists) AppState.playlists = JSON.parse(savedData.playlists);
    if (savedData.queue) AppState.queue = JSON.parse(savedData.queue);
    if (savedData.history) AppState.history = JSON.parse(savedData.history);
    if (savedData.recentSearches) AppState.recentSearches = JSON.parse(savedData.recentSearches);
    if (savedData.likedSongs) AppState.likedSongs = JSON.parse(savedData.likedSongs);
    if (savedData.totalTime) AppState.totalListeningTime = parseInt(savedData.totalTime);
    if (savedData.settings) AppState.settings = JSON.parse(savedData.settings);
}

function saveLocalData(key, data) {
    localStorage.setItem(`musly_${key}`, JSON.stringify(data));
}

// Enhanced YouTube Player
function onYouTubeIframeAPIReady() {
    AppState.player = new YT.Player('youtube-player', {
        height: '0',
        width: '0',
        playerVars: {
            'autoplay': 1,
            'controls': 0,
            'disablekb': 1,
            'fs': 0,
            'modestbranding': 1,
            'rel': 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

function onPlayerReady(event) {
    console.log('Player ready');
    setVolume(AppState.settings.defaultVolume);
    updatePlayButton();
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        AppState.isPlaying = true;
        updatePlayButton();
        startProgressUpdate();
        document.getElementById('albumArt').classList.add('playing');
    } else if (event.data == YT.PlayerState.PAUSED) {
        AppState.isPlaying = false;
        updatePlayButton();
        stopProgressUpdate();
        document.getElementById('albumArt').classList.remove('playing');
    } else if (event.data == YT.PlayerState.ENDED) {
        handleVideoEnd();
    }
}

// Enhanced Event Listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });

    // Library sub-tabs
    document.querySelectorAll('.library-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const libraryTab = btn.dataset.library;
            switchLibraryTab(libraryTab);
        });
    });

    // Search
    document.getElementById('searchBtn').addEventListener('click', performSearch);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // Filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelector('.filter-chip.active').classList.remove('active');
            chip.classList.add('active');
        });
    });

    // Playback controls
    document.getElementById('playBtn').addEventListener('click', togglePlayPause);
    document.getElementById('prevBtn').addEventListener('click', playPrevious);
    document.getElementById('nextBtn').addEventListener('click', playNext);
    document.getElementById('repeatBtn').addEventListener('click', toggleRepeat);
    document.getElementById('shuffleBtn').addEventListener('click', toggleShuffle);

    // Queue management
    document.getElementById('clearQueueBtn').addEventListener('click', clearQueue);
    document.getElementById('saveQueueBtn').addEventListener('click', saveQueueAsPlaylist);

    // Playlist creation
    document.getElementById('createPlaylistBtn').addEventListener('click', showPlaylistModal);
    document.getElementById('closeModal').addEventListener('click', hidePlaylistModal);
    document.getElementById('cancelModal').addEventListener('click', hidePlaylistModal);
    document.getElementById('confirmModal').addEventListener('click', createPlaylist);

    // Color selection
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            AppState.selectedColor = option.dataset.color;
        });
    });

    // Track actions
    document.getElementById('likeBtn').addEventListener('click', toggleLike);
    document.getElementById('addToPlaylistBtn').addEventListener('click', showAddToPlaylistMenu);
    document.getElementById('shareBtn').addEventListener('click', shareTrack);

    // Progress bar
    document.querySelector('.progress-bar').addEventListener('click', seekTo);

    // Volume control
    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            setVolume(e.target.value);
        });
    }

    // Liked songs actions
    const playAllLiked = document.getElementById('playAllLiked');
    if (playAllLiked) {
        playAllLiked.addEventListener('click', playAllLikedSongs);
    }

    const shuffleLiked = document.getElementById('shuffleLiked');
    if (shuffleLiked) {
        shuffleLiked.addEventListener('click', shuffleLikedSongs);
    }

    // History actions
    const clearHistory = document.getElementById('clearHistory');
    if (clearHistory) {
        clearHistory.addEventListener('click', clearHistoryData);
    }

    // Settings
    setupSettingsListeners();

    // Context menu
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('click', hideContextMenu);

    // Keyboard shortcuts
    setupKeyboardShortcuts();
}

// Settings functionality
function setupSettingsListeners() {
    // Theme selector
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.value = AppState.settings.theme;
        themeSelect.addEventListener('change', (e) => {
            AppState.settings.theme = e.target.value;
            applyTheme(e.target.value);
            saveLocalData('settings', AppState.settings);
        });
    }

    // Color dots
    document.querySelectorAll('.color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const color = dot.dataset.themeColor;
            AppState.settings.accentColor = color;
            applyAccentColor(color);
            saveLocalData('settings', AppState.settings);

            // Update selection
            document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
            dot.classList.add('selected');
        });
    });

    // Autoplay toggle
    const autoplayToggle = document.getElementById('autoplayToggle');
    if (autoplayToggle) {
        autoplayToggle.checked = AppState.settings.autoplay;
        autoplayToggle.addEventListener('change', (e) => {
            AppState.settings.autoplay = e.target.checked;
            saveLocalData('settings', AppState.settings);
        });
    }

    // Crossfade toggle
    const crossfadeToggle = document.getElementById('crossfadeToggle');
    if (crossfadeToggle) {
        crossfadeToggle.checked = AppState.settings.crossfade;
        crossfadeToggle.addEventListener('change', (e) => {
            AppState.settings.crossfade = e.target.checked;
            saveLocalData('settings', AppState.settings);
        });
    }

    // Default volume
    const defaultVolume = document.getElementById('defaultVolume');
    const volumeValue = document.getElementById('volumeValue');
    if (defaultVolume && volumeValue) {
        defaultVolume.value = AppState.settings.defaultVolume;
        volumeValue.textContent = `${AppState.settings.defaultVolume}%`;
        defaultVolume.addEventListener('input', (e) => {
            AppState.settings.defaultVolume = e.target.value;
            volumeValue.textContent = `${e.target.value}%`;
            saveLocalData('settings', AppState.settings);
        });
    }

    // Data management
    const exportBtn = document.getElementById('exportData');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }

    const importBtn = document.getElementById('importData');
    const importFile = document.getElementById('importFile');
    if (importBtn && importFile) {
        importBtn.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', importData);
    }

    const clearAllBtn = document.getElementById('clearAllData');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllData);
    }
}

// Apply settings
function applySettings() {
    applyTheme(AppState.settings.theme);
    applyAccentColor(AppState.settings.accentColor);
    setVolume(AppState.settings.defaultVolume);
}

function applyTheme(theme) {
    document.body.classList.remove('theme-light', 'theme-dark');
    if (theme === 'auto') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.add(isDark ? 'theme-dark' : 'theme-light');
    } else {
        document.body.classList.add(`theme-${theme}`);
    }
}

function applyAccentColor(color) {
    document.documentElement.style.setProperty('--accent-color', color);
}

// Volume control
function setVolume(value) {
    AppState.volume = value;
    if (AppState.player && AppState.player.setVolume) {
        AppState.player.setVolume(value);
    }
}

// Library sub-tabs
function switchLibraryTab(tabName) {
    // Update nav
    document.querySelectorAll('.library-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.library === tabName);
    });

    // Update content
    document.querySelectorAll('.library-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`library-${tabName}`).classList.add('active');

    // Update content based on tab
    if (tabName === 'liked') {
        updateLikedSongsUI();
    } else if (tabName === 'history') {
        updateHistoryUI();
    }
}

// Liked Songs Management
function updateLikedSongsUI() {
    const likedList = document.getElementById('likedSongsList');
    const totalLiked = document.getElementById('totalLiked');
    
    if (totalLiked) {
        totalLiked.textContent = AppState.likedSongs.length;
    }
    
    if (!likedList) return;
    
    if (AppState.likedSongs.length === 0) {
        likedList.innerHTML = '<p class="empty-state">No liked songs yet. Start liking songs to see them here!</p>';
        return;
    }

    likedList.innerHTML = AppState.likedSongs.map((song, index) => `
        <div class="liked-song-item">
            <img src="${song.thumbnail}" alt="${song.title}" class="liked-thumbnail">
            <div class="liked-info">
                <div class="liked-title">${song.title}</div>
                <div class="liked-channel">${song.channel}</div>
            </div>
            <div class="liked-actions">
                <button class="icon-btn small" onclick="playLikedSong(${index})" title="Play">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 3L19 12L5 21V3Z" fill="currentColor"/>
                    </svg>
                </button>
                <button class="icon-btn small" onclick="addLikedToQueue(${index})" title="Add to Queue">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
                <button class="icon-btn small" onclick="removeLikedSong(${index})" title="Remove">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function playLikedSong(index) {
    const song = AppState.likedSongs[index];
    if (song) {
        playVideo(song.videoId, song);
        showToast('Playing from liked songs', 'success');
    }
}

function addLikedToQueue(index) {
    const song = AppState.likedSongs[index];
    if (song) {
        AppState.queue.push(song);
        updateQueueUI();
        saveLocalData('queue', AppState.queue);
        showToast('Added to queue', 'success');
    }
}

function removeLikedSong(index) {
    AppState.likedSongs.splice(index, 1);
    saveLocalData('liked_songs', AppState.likedSongs);
    updateLikedSongsUI();
    updateLibraryStats();
    showToast('Removed from liked songs', 'info');
}

function playAllLikedSongs() {
    if (AppState.likedSongs.length === 0) {
        showToast('No liked songs to play', 'error');
        return;
    }
    
    AppState.queue = [...AppState.likedSongs];
    AppState.currentIndex = 0;
    const firstSong = AppState.queue[0];
    playVideo(firstSong.videoId, firstSong);
    updateQueueUI();
    switchTab('queue');
    showToast('Playing all liked songs', 'success');
}

function shuffleLikedSongs() {
    if (AppState.likedSongs.length === 0) {
        showToast('No liked songs to shuffle', 'error');
        return;
    }
    
    // Shuffle array
    const shuffled = [...AppState.likedSongs];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    AppState.queue = shuffled;
    AppState.currentIndex = 0;
    const firstSong = AppState.queue[0];
    playVideo(firstSong.videoId, firstSong);
    updateQueueUI();
    switchTab('queue');
    showToast('Shuffling liked songs', 'success');
}

// History Management
function updateHistoryUI() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    if (AppState.history.length === 0) {
        historyList.innerHTML = '<p class="empty-state">No listening history yet</p>';
        return;
    }

    // Group by date
    const grouped = {};
    AppState.history.forEach(item => {
        const date = new Date(item.playedAt).toLocaleDateString();
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(item);
    });

    historyList.innerHTML = Object.entries(grouped).map(([date, items]) => `
        <div class="history-group">
            <h5 class="history-date">${date}</h5>
            ${items.map(item => `
                <div class="history-item">
                    <img src="${item.snippet?.thumbnails?.default?.url || ''}" alt="${item.snippet?.title}" class="history-thumbnail">
                    <div class="history-info">
                        <div class="history-title">${item.snippet?.title || 'Unknown'}</div>
                        <div class="history-time">${new Date(item.playedAt).toLocaleTimeString()}</div>
                    </div>
                    <button class="icon-btn small" onclick="replayFromHistory('${item.videoId}', '${encodeURIComponent(JSON.stringify(item.snippet))}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M5 3L19 12L5 21V3Z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
            `).join('')}
        </div>
    `).join('');
}

function replayFromHistory(videoId, snippetData) {
    const snippet = JSON.parse(decodeURIComponent(snippetData));
    playVideo(videoId, snippet);
}

function clearHistoryData() {
    if (confirm('Clear all listening history?')) {
        AppState.history = [];
        saveLocalData('history', AppState.history);
        updateHistoryUI();
        showToast('History cleared', 'info');
    }
}

// Enhanced Playlist Management
function addSongToPlaylist(playlistId, song) {
    const playlist = AppState.playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    // Check if song already exists
    if (playlist.songs.some(s => s.videoId === song.videoId)) {
        showToast('Song already in playlist', 'info');
        return;
    }
    
    playlist.songs.push(song);
    playlist.updatedAt = new Date().toISOString();
    saveLocalData('playlists', AppState.playlists);
    showToast(`Added to ${playlist.name}`, 'success');
}

function removeSongFromPlaylist(playlistId, songIndex) {
    const playlist = AppState.playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    playlist.songs.splice(songIndex, 1);
    playlist.updatedAt = new Date().toISOString();
    saveLocalData('playlists', AppState.playlists);
    updatePlaylistsUI();
}

// Data Import/Export
function exportData() {
    const data = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        playlists: AppState.playlists,
        likedSongs: AppState.likedSongs,
        history: AppState.history,
        settings: AppState.settings,
        totalListeningTime: AppState.totalListeningTime
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `musly-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully', 'success');
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            
            // Validate data
            if (!data.version) {
                throw new Error('Invalid backup file');
            }
            
            // Import data
            if (data.playlists) AppState.playlists = data.playlists;
            if (data.likedSongs) AppState.likedSongs = data.likedSongs;
            if (data.history) AppState.history = data.history;
            if (data.settings) AppState.settings = data.settings;
            if (data.totalListeningTime) AppState.totalListeningTime = data.totalListeningTime;
            
            // Save to localStorage
            saveLocalData('playlists', AppState.playlists);
            saveLocalData('liked_songs', AppState.likedSongs);
            saveLocalData('history', AppState.history);
            saveLocalData('settings', AppState.settings);
            saveLocalData('total_time', AppState.totalListeningTime);
            
            // Update UI
            initializeApp();
            applySettings();
            showToast('Data imported successfully', 'success');
        } catch (error) {
            console.error('Import error:', error);
            showToast('Failed to import data', 'error');
        }
    };
    reader.readAsText(file);
}

function clearAllData() {
    if (confirm('This will delete all your data including playlists, liked songs, and settings. Are you sure?')) {
        if (confirm('This action cannot be undone. Please confirm again.')) {
            localStorage.clear();
            location.reload();
        }
    }
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch(e.key) {
            case ' ':
                e.preventDefault();
                togglePlayPause();
                break;
            case 'ArrowRight':
                if (e.shiftKey) {
                    seekForward(10);
                } else {
                    playNext();
                }
                break;
            case 'ArrowLeft':
                if (e.shiftKey) {
                    seekBackward(10);
                } else {
                    playPrevious();
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                changeVolume(5);
                break;
            case 'ArrowDown':
                e.preventDefault();
                changeVolume(-5);
                break;
            case 'l':
                toggleLike();
                break;
            case 'r':
                toggleRepeat();
                break;
            case 's':
                toggleShuffle();
                break;
            case 'f':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    document.getElementById('searchInput').focus();
                }
                break;
        }
    });
}

function seekForward(seconds) {
    if (AppState.player && AppState.player.getCurrentTime) {
        const currentTime = AppState.player.getCurrentTime();
        AppState.player.seekTo(currentTime + seconds);
    }
}

function seekBackward(seconds) {
    if (AppState.player && AppState.player.getCurrentTime) {
        const currentTime = AppState.player.getCurrentTime();
        AppState.player.seekTo(Math.max(0, currentTime - seconds));
    }
}

function changeVolume(delta) {
    const newVolume = Math.max(0, Math.min(100, AppState.volume + delta));
    setVolume(newVolume);
    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) volumeSlider.value = newVolume;
    showToast(`Volume: ${newVolume}%`, 'info');
}

// Enhanced Library Stats
function updateLibraryStats() {
    const totalSongs = AppState.queue.length + AppState.likedSongs.length;
    const totalPlaylists = AppState.playlists.length;
    const totalHours = Math.floor(AppState.totalListeningTime / 3600);
    const totalLiked = AppState.likedSongs.length;
    
    const elements = {
        totalSongs: document.getElementById('totalSongs'),
        totalPlaylists: document.getElementById('totalPlaylists'),
        totalTime: document.getElementById('totalTime'),
        totalLiked: document.getElementById('totalLiked')
    };
    
    if (elements.totalSongs) elements.totalSongs.textContent = totalSongs;
    if (elements.totalPlaylists) elements.totalPlaylists.textContent = totalPlaylists;
    if (elements.totalTime) elements.totalTime.textContent = `${totalHours}h`;
    if (elements.totalLiked) elements.totalLiked.textContent = totalLiked;
}

// Keep all your existing functions (performSearch, displayResults, etc.) as they are
// Just add these enhancements...

// Export for debugging
window.MuslyDebug = {
    state: AppState,
    clearAll: () => {
        if (confirm('Clear all data?')) {
            localStorage.clear();
            location.reload();
        }
    },
    exportState: () => {
        console.log(JSON.stringify(AppState, null, 2));
    }
};
