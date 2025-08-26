// Musly - Advanced Music Player
const API_KEY = 'AIzaSyCSUEacc1KEgl0d_b2zmS4Fh2uWY0px_jk';

// State Management
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
    totalListeningTime: 0
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadLocalData();
    setupEventListeners();
    initializeSortable();
});

// Initialize App
function initializeApp() {
    updateQueueUI();
    updatePlaylistsUI();
    updateLibraryStats();
    loadRecentSearches();
}

// Local Storage Management
function loadLocalData() {
    const savedData = {
        playlists: localStorage.getItem('musly_playlists'),
        queue: localStorage.getItem('musly_queue'),
        history: localStorage.getItem('musly_history'),
        recentSearches: localStorage.getItem('musly_recent_searches'),
        likedSongs: localStorage.getItem('musly_liked_songs'),
        totalTime: localStorage.getItem('musly_total_time')
    };

    if (savedData.playlists) AppState.playlists = JSON.parse(savedData.playlists);
    if (savedData.queue) AppState.queue = JSON.parse(savedData.queue);
    if (savedData.history) AppState.history = JSON.parse(savedData.history);
    if (savedData.recentSearches) AppState.recentSearches = JSON.parse(savedData.recentSearches);
    if (savedData.likedSongs) AppState.likedSongs = JSON.parse(savedData.likedSongs);
    if (savedData.totalTime) AppState.totalListeningTime = parseInt(savedData.totalTime);
}

function saveLocalData(key, data) {
    localStorage.setItem(`musly_${key}`, JSON.stringify(data));
}

// YouTube Player
function onYouTubeIframeAPIReady() {
    AppState.player = new YT.Player('youtube-player', {
        height: '0',
        width: '0',
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

function onPlayerReady(event) {
    console.log('Player ready');
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

function onPlayerError(event) {
    console.error('Player error:', event.data);
    showToast('Error playing video', 'error');
}

// Tab Navigation
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
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
            // Apply filter logic here
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

    // Context menu
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('click', hideContextMenu);
}

function switchTab(tabName) {
    // Update nav
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Search Functionality
async function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;

    // Save to recent searches
    addToRecentSearches(query);

    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=20&key=${API_KEY}`
        );

        if (!response.ok) throw new Error('Search failed');

        const data = await response.json();
        displayResults(data.items);
    } catch (error) {
        console.error('Search error:', error);
        showToast('Search failed. Please try again.', 'error');
    }
}

function addToRecentSearches(query) {
    AppState.recentSearches = AppState.recentSearches.filter(q => q !== query);
    AppState.recentSearches.unshift(query);
    if (AppState.recentSearches.length > 10) {
        AppState.recentSearches.pop();
    }
    saveLocalData('recent_searches', AppState.recentSearches);
    loadRecentSearches();
}

function loadRecentSearches() {
    const recentList = document.getElementById('recentList');
    if (!AppState.recentSearches.length) {
        recentList.innerHTML = '<p class="empty-state">No recent searches</p>';
        return;
    }

    recentList.innerHTML = AppState.recentSearches.map(search => `
        <button class="recent-item" onclick="searchFromRecent('${search}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
                <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ${search}
        </button>
    `).join('');
}

function searchFromRecent(query) {
    document.getElementById('searchInput').value = query;
    performSearch();
}

function displayResults(items) {
    const resultsGrid = document.getElementById('resultsGrid');
    resultsGrid.innerHTML = '';

    items.forEach((item, index) => {
        const card = createResultCard(item);
        card.style.animationDelay = `${index * 0.05}s`;
        resultsGrid.appendChild(card);
    });
}

function createResultCard(item) {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
        <img src="${item.snippet.thumbnails.medium.url}" alt="${item.snippet.title}" class="result-thumbnail">
        <h4 class="result-title">${item.snippet.title}</h4>
        <p class="result-channel">${item.snippet.channelTitle}</p>
        <button class="result-menu-btn" onclick="showContextMenu(event, '${item.id.videoId}', '${encodeURIComponent(JSON.stringify(item.snippet))}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="6" r="2" fill="currentColor"/>
                <circle cx="12" cy="12" r="2" fill="currentColor"/>
                <circle cx="12" cy="18" r="2" fill="currentColor"/>
            </svg>
        </button>
    `;

    card.addEventListener('click', (e) => {
        if (!e.target.closest('.result-menu-btn')) {
            addToQueue(item);
            if (AppState.queue.length === 1) {
                playVideo(item.id.videoId, item.snippet);
            }
        }
    });

    return card;
}

// Queue Management
function addToQueue(item, position = 'end') {
    const queueItem = {
        id: generateId(),
        videoId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.default.url,
        duration: item.snippet.duration || '0:00'
    };

    if (position === 'next') {
        AppState.queue.splice(AppState.currentIndex + 1, 0, queueItem);
    } else {
        AppState.queue.push(queueItem);
    }

    updateQueueUI();
    saveLocalData('queue', AppState.queue);
    showToast('Added to queue', 'success');
}

function removeFromQueue(index) {
    AppState.queue.splice(index, 1);
    if (index < AppState.currentIndex) {
        AppState.currentIndex--;
    } else if (index === AppState.currentIndex && AppState.queue.length > 0) {
        if (AppState.currentIndex >= AppState.queue.length) {
            AppState.currentIndex = AppState.queue.length - 1;
        }
        const item = AppState.queue[AppState.currentIndex];
        if (item) playVideo(item.videoId, item);
    }
    updateQueueUI();
    saveLocalData('queue', AppState.queue);
}

function clearQueue() {
    if (confirm('Clear entire queue?')) {
        AppState.queue = [];
        AppState.currentIndex = 0;
        updateQueueUI();
        saveLocalData('queue', AppState.queue);
        showToast('Queue cleared', 'info');
    }
}

function updateQueueUI() {
    const queueList = document.getElementById('queueList');
    
    if (AppState.queue.length === 0) {
        queueList.innerHTML = '<p class="empty-state">Queue is empty</p>';
        return;
    }

    queueList.innerHTML = AppState.queue.map((item, index) => `
        <div class="queue-item ${index === AppState.currentIndex ? 'active' : ''}" data-id="${item.id}" data-index="${index}">
            <div class="queue-drag-handle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5V5.01M12 12V12.01M12 19V19.01M12 6C11.4477 6 11 5.55228 11 5C11 4.44772 11.4477 4 12 4C12.5523 4 13 4.44772 13 5C13 5.55228 12.5523 6 12 6ZM12 13C11.4477 13 11 12.5523 11 12C11 11.4477 11.4477 11 12 11C12.5523 11 13 11.4477 13 12C13 12.5523 12.5523 13 12 13ZM12 20C11.4477 20 11 19.5523 11 19C11 18.4477 11.4477 18 12 18C12.5523 18 13 18.4477 13 19C13 19.5523 12.5523 20 12 20Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </div>
            <img src="${item.thumbnail}" alt="${item.title}" class="queue-thumbnail">
            <div class="queue-info">
                <div class="queue-title">${item.title}</div>
                <div class="queue-channel">${item.channel}</div>
            </div>
            <button class="queue-remove" onclick="removeFromQueue(${index})">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
    `).join('');

    // Add click listeners
    queueList.querySelectorAll('.queue-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.queue-remove') && !e.target.closest('.queue-drag-handle')) {
                const index = parseInt(item.dataset.index);
                AppState.currentIndex = index;
                const queueItem = AppState.queue[index];
                playVideo(queueItem.videoId, queueItem);
            }
        });
    });
}

// Sortable Queue
function initializeSortable() {
    const queueList = document.getElementById('queueList');
    if (queueList) {
        new Sortable(queueList, {
            animation: 150,
            handle: '.queue-drag-handle',
            ghostClass: 'sortable-ghost',
            onEnd: function(evt) {
                const item = AppState.queue.splice(evt.oldIndex, 1)[0];
                AppState.queue.splice(evt.newIndex, 0, item);
                
                // Update current index if needed
                if (evt.oldIndex === AppState.currentIndex) {
                    AppState.currentIndex = evt.newIndex;
                } else if (evt.oldIndex < AppState.currentIndex && evt.newIndex >= AppState.currentIndex) {
                    AppState.currentIndex--;
                } else if (evt.oldIndex > AppState.currentIndex && evt.newIndex <= AppState.currentIndex) {
                    AppState.currentIndex++;
                }
                
                updateQueueUI();
                saveLocalData('queue', AppState.queue);
            }
        });
    }
}

// Playlist Management
function showPlaylistModal() {
    document.getElementById('playlistModal').classList.add('show');
}

function hidePlaylistModal() {
    document.getElementById('playlistModal').classList.remove('show');
    document.getElementById('playlistName').value = '';
    document.getElementById('playlistDescription').value = '';
}

function createPlaylist() {
    const name = document.getElementById('playlistName').value.trim();
    const description = document.getElementById('playlistDescription').value.trim();
    
    if (!name) {
        showToast('Please enter a playlist name', 'error');
        return;
    }

    const playlist = {
        id: generateId(),
        name: name,
        description: description,
        color: AppState.selectedColor,
        songs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    AppState.playlists.push(playlist);
    saveLocalData('playlists', AppState.playlists);
    updatePlaylistsUI();
    hidePlaylistModal();
    showToast(`Playlist "${name}" created!`, 'success');
}

function saveQueueAsPlaylist() {
    if (AppState.queue.length === 0) {
        showToast('Queue is empty', 'error');
        return;
    }

    const name = prompt('Enter playlist name:');
    if (!name) return;

    const playlist = {
        id: generateId(),
        name: name,
        description: `Created from queue on ${new Date().toLocaleDateString()}`,
        color: '#667eea',
        songs: [...AppState.queue],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    AppState.playlists.push(playlist);
    saveLocalData('playlists', AppState.playlists);
    updatePlaylistsUI();
    showToast(`Queue saved as "${name}"`, 'success');
}

function updatePlaylistsUI() {
    const grid = document.getElementById('playlistsGrid');
    
    if (AppState.playlists.length === 0) {
        grid.innerHTML = '<p class="empty-state">No playlists yet. Create your first playlist!</p>';
        return;
    }

    grid.innerHTML = AppState.playlists.map(playlist => `
        <div class="playlist-card" onclick="loadPlaylist('${playlist.id}')" style="background: linear-gradient(135deg, ${playlist.color}, ${playlist.color}66);">
            <div class="playlist-card-header">
                <h4>${playlist.name}</h4>
                <button class="playlist-menu-btn" onclick="event.stopPropagation(); showPlaylistMenu('${playlist.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="6" r="2" fill="currentColor"/>
                        <circle cx="12" cy="12" r="2" fill="currentColor"/>
                        <circle cx="12" cy="18" r="2" fill="currentColor"/>
                    </svg>
                </button>
            </div>
            <p class="playlist-description">${playlist.description || 'No description'}</p>
            <div class="playlist-stats">
                <span>${playlist.songs.length} songs</span>
                <span>•</span>
                <span>${formatDate(playlist.createdAt)}</span>
            </div>
        </div>
    `).join('');
}

function loadPlaylist(playlistId) {
    const playlist = AppState.playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    AppState.queue = [...playlist.songs];
    AppState.currentIndex = 0;
    AppState.currentPlaylist = playlistId;
    
    updateQueueUI();
    saveLocalData('queue', AppState.queue);
    
    if (AppState.queue.length > 0) {
        const firstSong = AppState.queue[0];
        playVideo(firstSong.videoId, firstSong);
    }
    
    switchTab('queue');
    showToast(`Loaded playlist: ${playlist.name}`, 'success');
}

function deletePlaylist(playlistId) {
    if (confirm('Delete this playlist?')) {
        AppState.playlists = AppState.playlists.filter(p => p.id !== playlistId);
        saveLocalData('playlists', AppState.playlists);
        updatePlaylistsUI();
        showToast('Playlist deleted', 'info');
    }
}

// Context Menu
function showContextMenu(event, videoId, snippetData) {
    event.stopPropagation();
    const snippet = JSON.parse(decodeURIComponent(snippetData));
    AppState.contextTarget = { videoId, snippet };
    
    const menu = document.getElementById('contextMenu');
    menu.style.display = 'block';
    menu.style.left = `${event.pageX}px`;
    menu.style.top = `${event.pageY}px`;

    // Setup context menu actions
    document.getElementById('playNow').onclick = () => {
        playVideo(videoId, snippet);
        hideContextMenu();
    };

    document.getElementById('playNext').onclick = () => {
        addToQueue({ id: { videoId }, snippet }, 'next');
        hideContextMenu();
    };

    document.getElementById('addToQueue').onclick = () => {
        addToQueue({ id: { videoId }, snippet });
        hideContextMenu();
    };

    document.getElementById('addToPlaylist').onclick = () => {
        showAddToPlaylistMenu({ videoId, snippet });
        hideContextMenu();
    };
}

function hideContextMenu() {
    document.getElementById('contextMenu').style.display = 'none';
}

// Playback Controls
function playVideo(videoId, snippet) {
    AppState.currentVideoId = videoId;
    
    // Update UI
    document.getElementById('trackTitle').textContent = snippet.title;
    document.getElementById('trackArtist').textContent = snippet.channel || snippet.channelTitle;
    
    // Update album art
    const albumArt = document.getElementById('albumArt');
    const thumbnailUrl = snippet.thumbnail || snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url;
    albumArt.innerHTML = `<img src="${thumbnailUrl}" alt="${snippet.title}">`;
    
    // Load and play video
    if (AppState.player && AppState.player.loadVideoById) {
        AppState.player.loadVideoById(videoId);
        AppState.isPlaying = true;
        updatePlayButton();
    }
    
    // Add to history
    addToHistory({ videoId, snippet });
    updateQueueUI();
}

function togglePlayPause() {
    if (!AppState.player || !AppState.currentVideoId) return;
    
    if (AppState.isPlaying) {
        AppState.player.pauseVideo();
    } else {
        AppState.player.playVideo();
    }
}

function playPrevious() {
    if (AppState.queue.length === 0) return;
    
    if (AppState.currentIndex > 0) {
        AppState.currentIndex--;
    } else {
        AppState.currentIndex = AppState.queue.length - 1;
    }
    
    const item = AppState.queue[AppState.currentIndex];
    playVideo(item.videoId, item);
}

function playNext() {
    if (AppState.queue.length === 0) return;
    
    if (AppState.isShuffle) {
        AppState.currentIndex = Math.floor(Math.random() * AppState.queue.length);
    } else if (AppState.currentIndex < AppState.queue.length - 1) {
        AppState.currentIndex++;
    } else {
        AppState.currentIndex = 0;
    }
    
    const item = AppState.queue[AppState.currentIndex];
    playVideo(item.videoId, item);
}

function handleVideoEnd() {
    if (AppState.isRepeat) {
        AppState.player.playVideo();
    } else {
        playNext();
    }
}

function toggleRepeat() {
    AppState.isRepeat = !AppState.isRepeat;
    const repeatBtn = document.getElementById('repeatBtn');
    repeatBtn.classList.toggle('active', AppState.isRepeat);
    showToast(AppState.isRepeat ? 'Repeat enabled' : 'Repeat disabled', 'info');
}

function toggleShuffle() {
    AppState.isShuffle = !AppState.isShuffle;
    const shuffleBtn = document.getElementById('shuffleBtn');
    shuffleBtn.classList.toggle('active', AppState.isShuffle);
    showToast(AppState.isShuffle ? 'Shuffle enabled' : 'Shuffle disabled', 'info');
}

function updatePlayButton() {
    const playIcon = document.querySelector('.play-icon');
    const pauseIcon = document.querySelector('.pause-icon');
    
    if (AppState.isPlaying) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
}

// Progress Management
let progressInterval;

function startProgressUpdate() {
    stopProgressUpdate();
    progressInterval = setInterval(updateProgress, 1000);
}

function stopProgressUpdate() {
    if (progressInterval) {
        clearInterval(progressInterval);
    }
}

function updateProgress() {
    if (!AppState.player || !AppState.player.getCurrentTime) return;
    
    const currentTime = AppState.player.getCurrentTime();
    const duration = AppState.player.getDuration();
    
    if (duration) {
        const progressPercent = (currentTime / duration) * 100;
        document.getElementById('progress').style.width = `${progressPercent}%`;
        document.getElementById('currentTime').textContent = formatTime(currentTime);
        document.getElementById('duration').textContent = formatTime(duration);
        
        // Update total listening time
        AppState.totalListeningTime++;
        if (AppState.totalListeningTime % 60 === 0) {
            saveLocalData('total_time', AppState.totalListeningTime);
            updateLibraryStats();
        }
    }
}

function seekTo(e) {
    if (!AppState.player || !AppState.player.getDuration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    const duration = AppState.player.getDuration();
    
    if (duration) {
        const seekTime = duration * percentage;
        AppState.player.seekTo(seekTime);
    }
}

// Track Actions
function toggleLike() {
    if (!AppState.currentVideoId) return;
    
    const likeBtn = document.getElementById('likeBtn');
    const isLiked = AppState.likedSongs.some(s => s.videoId === AppState.currentVideoId);
    
    if (isLiked) {
        AppState.likedSongs = AppState.likedSongs.filter(s => s.videoId !== AppState.currentVideoId);
        likeBtn.classList.remove('liked');
        showToast('Removed from liked songs', 'info');
    } else {
        const currentTrack = AppState.queue[AppState.currentIndex];
        if (currentTrack) {
            AppState.likedSongs.push(currentTrack);
            likeBtn.classList.add('liked');
            showToast('Added to liked songs', 'success');
        }
    }
    
    saveLocalData('liked_songs', AppState.likedSongs);
}

function showAddToPlaylistMenu(track) {
    if (AppState.playlists.length === 0) {
        showToast('No playlists available. Create one first!', 'info');
        return;
    }
    
    const playlistName = prompt('Select playlist:\n' + 
        AppState.playlists.map((p, i) => `${i + 1}. ${p.name}`).join('\n'));
    
    const index = parseInt(playlistName) - 1;
    if (index >= 0 && index < AppState.playlists.length) {
        const playlist = AppState.playlists[index];
        playlist.songs.push(track || AppState.queue[AppState.currentIndex]);
        playlist.updatedAt = new Date().toISOString();
        saveLocalData('playlists', AppState.playlists);
        showToast(`Added to ${playlist.name}`, 'success');
    }
}

function shareTrack() {
    if (!AppState.currentVideoId) return;
    
    const url = `https://youtube.com/watch?v=${AppState.currentVideoId}`;
    
    if (navigator.share) {
        navigator.share({
            title: document.getElementById('trackTitle').textContent,
            text: 'Check out this song on Musly!',
            url: url
        });
    } else {
        navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard!', 'success');
    }
}

// History Management
function addToHistory(track) {
    AppState.history.unshift({
        ...track,
        playedAt: new Date().toISOString()
    });
    
    if (AppState.history.length > 100) {
        AppState.history = AppState.history.slice(0, 100);
    }
    
    saveLocalData('history', AppState.history);
}

// Library Stats
function updateLibraryStats() {
    const totalSongs = AppState.queue.length + AppState.likedSongs.length;
    const totalPlaylists = AppState.playlists.length;
    const totalHours = Math.floor(AppState.totalListeningTime / 3600);
    
    document.getElementById('totalSongs').textContent = totalSongs;
    document.getElementById('totalPlaylists').textContent = totalPlaylists;
    document.getElementById('totalTime').textContent = `${totalHours}h`;
}

// Utility Functions
function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Export for debugging
window.MuslyDebug = {
    state: AppState,
    clearAll: () => {
        localStorage.clear();
        location.reload();
    },
    exportData: () => {
        const data = {
            playlists: AppState.playlists,
            queue: AppState.queue,
            history: AppState.history,
            likedSongs: AppState.likedSongs
        };
        console.log(JSON.stringify(data, null, 2));
    }
};
