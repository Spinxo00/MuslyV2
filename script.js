// Musly - Music Player Script
const API_KEY = 'AIzaSyCSUEacc1KEgl0d_b2zmS4Fh2uWY0px_jk';

let player;
let currentVideoId = null;
let playlist = [];
let currentIndex = 0;
let isPlaying = false;
let isRepeat = false;
let isShuffle = false;

// Initialize YouTube Player
function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-player', {
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
        isPlaying = true;
        updatePlayButton();
        startProgressUpdate();
        document.getElementById('albumArt').classList.add('playing');
    } else if (event.data == YT.PlayerState.PAUSED) {
        isPlaying = false;
        updatePlayButton();
        stopProgressUpdate();
        document.getElementById('albumArt').classList.remove('playing');
    } else if (event.data == YT.PlayerState.ENDED) {
        handleVideoEnd();
    }
}

function onPlayerError(event) {
    console.error('Player error:', event.data);
    showNotification('Error playing video', 'error');
}

// Search functionality
document.getElementById('searchBtn').addEventListener('click', performSearch);
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

async function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;
    
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=12&key=${API_KEY}`
        );
        
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        displayResults(data.items);
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Search failed. Please try again.', 'error');
    }
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
    `;
    
    card.addEventListener('click', () => {
        addToPlaylist(item);
        if (playlist.length === 1) {
            playVideo(item.id.videoId, item.snippet);
        }
    });
    
    return card;
}

function addToPlaylist(item) {
    playlist.push({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.default.url
    });
    updatePlaylistUI();
    showNotification('Added to queue', 'success');
}

function updatePlaylistUI() {
    const playlistEl = document.getElementById('playlist');
    playlistEl.innerHTML = '';
    
    if (playlist.length === 0) {
        playlistEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Queue is empty</p>';
        return;
    }
    
    playlist.forEach((item, index) => {
        const playlistItem = document.createElement('div');
        playlistItem.className = 'playlist-item';
        if (index === currentIndex) {
            playlistItem.classList.add('active');
        }
        
        playlistItem.innerHTML = `
            <img src="${item.thumbnail}" alt="${item.title}" class="playlist-thumbnail">
            <div class="playlist-info">
                <div class="playlist-title">${item.title}</div>
                <div class="playlist-channel">${item.channel}</div>
            </div>
        `;
        
        playlistItem.addEventListener('click', () => {
            currentIndex = index;
            playVideo(item.videoId, item);
        });
        
        playlistEl.appendChild(playlistItem);
    });
}

function playVideo(videoId, snippet) {
    currentVideoId = videoId;
    
    // Update UI
    document.getElementById('trackTitle').textContent = snippet.title || snippet.snippet.title;
    document.getElementById('trackArtist').textContent = snippet.channel || snippet.snippet.channelTitle;
    
    // Update album art
    const albumArt = document.getElementById('albumArt');
    const thumbnailUrl = snippet.thumbnail || snippet.snippet.thumbnails.high.url;
    albumArt.innerHTML = `<img src="${thumbnailUrl}" alt="${snippet.title || snippet.snippet.title}">`;
    
    // Load and play video
    if (player && player.loadVideoById) {
        player.loadVideoById(videoId);
        isPlaying = true;
        updatePlayButton();
    }
    
    updatePlaylistUI();
}

// Playback controls
document.getElementById('playBtn').addEventListener('click', togglePlayPause);
document.getElementById('prevBtn').addEventListener('click', playPrevious);
document.getElementById('nextBtn').addEventListener('click', playNext);
document.getElementById('repeatBtn').addEventListener('click', toggleRepeat);
document.getElementById('shuffleBtn').addEventListener('click', toggleShuffle);

function togglePlayPause() {
    if (!player || !currentVideoId) return;
    
    if (isPlaying) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
}

function updatePlayButton() {
    const playIcon = document.querySelector('.play-icon');
    const pauseIcon = document.querySelector('.pause-icon');
    
    if (isPlaying) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
}

function playPrevious() {
    if (playlist.length === 0) return;
    
    if (currentIndex > 0) {
        currentIndex--;
    } else {
        currentIndex = playlist.length - 1;
    }
    
    const item = playlist[currentIndex];
    playVideo(item.videoId, item);
}

function playNext() {
    if (playlist.length === 0) return;
    
    if (isShuffle) {
        currentIndex = Math.floor(Math.random() * playlist.length);
    } else if (currentIndex < playlist.length - 1) {
        currentIndex++;
    } else {
        currentIndex = 0;
    }
    
    const item = playlist[currentIndex];
    playVideo(item.videoId, item);
}

function handleVideoEnd() {
    if (isRepeat) {
        player.playVideo();
    } else {
        playNext();
    }
}

function toggleRepeat() {
    isRepeat = !isRepeat;
    const repeatBtn = document.getElementById('repeatBtn');
    repeatBtn.style.color = isRepeat ? 'var(--primary-color)' : 'var(--text-primary)';
}

function toggleShuffle() {
    isShuffle = !isShuffle;
    const shuffleBtn = document.getElementById('shuffleBtn');
    shuffleBtn.style.color = isShuffle ? 'var(--primary-color)' : 'var(--text-primary)';
}

// Progress bar
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
    if (!player || !player.getCurrentTime) return;
    
    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();
    
    if (duration) {
        const progressPercent = (currentTime / duration) * 100;
        document.getElementById('progress').style.width = `${progressPercent}%`;
        document.getElementById('currentTime').textContent = formatTime(currentTime);
        document.getElementById('duration').textContent = formatTime(duration);
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Progress bar click to seek
document.querySelector('.progress-bar').addEventListener('click', (e) => {
    if (!player || !player.getDuration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    const duration = player.getDuration();
    
    if (duration) {
        const seekTime = duration * percentage;
        player.seekTo(seekTime);
    }
});

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'error' ? 'var(--danger)' : 'var(--success)'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        animation: slideIn 0.3s ease;
        z-index: 1000;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    updatePlaylistUI();
});
