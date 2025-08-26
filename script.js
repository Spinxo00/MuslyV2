// YouTube API Configuration
const YOUTUBE_API_KEY = 'AIzaSyCSUEacc1KEgl0d_b2zmS4Fh2uWY0px_jk';
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

// Player State
let currentSong = null;
let playlist = [];
let currentIndex = 0;
let isPlaying = false;
let isShuffled = false;
let repeatMode = 'off'; // 'off', 'one', 'all'
let favorites = JSON.parse(localStorage.getItem('musly-favorites') || '[]');

// DOM Elements
const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const favoriteBtn = document.getElementById('favoriteBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');
const playlistContainer = document.getElementById('playlist');
const loadingSpinner = document.getElementById('loadingSpinner');
const progressSlider = document.getElementById('progressSlider');
const volumeSlider = document.getElementById('volumeSlider');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const currentTitle = document.getElementById('currentTitle');
const currentArtist = document.getElementById('currentArtist');
const currentArtwork = document.getElementById('currentArtwork');
const progressFill = document.querySelector('.progress-fill');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializePlayer();
    setupEventListeners();
    loadSamplePlaylist();
});

// Initialize Player
function initializePlayer() {
    volumeSlider.value = 80;
    audioPlayer.volume = 0.8;
    updateShuffleButton();
    updateRepeatButton();
    updatePlaylistUI();
}

// Setup Event Listeners
function setupEventListeners() {
    // Search
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Player Controls
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', playNext);
    shuffleBtn.addEventListener('click', toggleShuffle);
    repeatBtn.addEventListener('click', toggleRepeat);
    favoriteBtn.addEventListener('click', toggleFavorite);

    // Audio Events
    audioPlayer.addEventListener('loadedmetadata', updateDuration);
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', handleSongEnd);
    audioPlayer.addEventListener('error', handleAudioError);

    // Sliders
    progressSlider.addEventListener('input', seekTo);
    volumeSlider.addEventListener('input', updateVolume);
}

// Search YouTube
async function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    showLoading(true);
    
    try {
        const response = await fetch(`${YOUTUBE_API_URL}?part=snippet&maxResults=20&q=${encodeURIComponent(query + ' music')}&type=video&key=${YOUTUBE_API_KEY}`);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        displaySearchResults(data.items || []);
    } catch (error) {
        console.error('Search error:', error);
        showError('Search failed. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Display Search Results
function displaySearchResults(videos) {
    searchResults.innerHTML = '';
    
    if (videos.length === 0) {
        searchResults.innerHTML = '<p class="no-results">No results found. Try a different search term.</p>';
        return;
    }

    videos.forEach(video => {
        const songCard = createSongCard(video);
        searchResults.appendChild(songCard);
    });
}

// Create Song Card
function createSongCard(video) {
    const card = document.createElement('div');
    card.className = 'song-card';
    
    const thumbnail = video.snippet.thumbnails.medium || video.snippet.thumbnails.default;
    const title = video.snippet.title;
    const channel = video.snippet.channelTitle;
    
    card.innerHTML = `
        <img src="${thumbnail.url}" alt="${title}" class="song-thumbnail">
        <div class="song-details">
            <h3>${title}</h3>
            <p>${channel}</p>
        </div>
    `;

    card.addEventListener('click', () => {
        addToPlaylist({
            id: video.id.videoId,
            title: title,
            artist: channel,
            thumbnail: thumbnail.url,
            url: `https://www.youtube.com/watch?v=${video.id.videoId}`
        });
    });

    return card;
}

// Add to Playlist
function addToPlaylist(song) {
    // Check if song already exists
    const exists = playlist.find(s => s.id === song.id);
    if (exists) {
        showNotification('Song already in playlist');
        return;
    }

    playlist.push(song);
    updatePlaylistUI();
    showNotification('Added to playlist');

    // If no song is playing, start this one
    if (!currentSong) {
        currentIndex = playlist.length - 1;
        loadSong(song);
    }
}

// Update Playlist UI
function updatePlaylistUI() {
    playlistContainer.innerHTML = '';
    
    if (playlist.length === 0) {
        playlistContainer.innerHTML = '<p class="empty-playlist">Your playlist is empty. Search for music to add songs!</p>';
        return;
    }

    playlist.forEach((song, index) => {
        const item = document.createElement('div');
        item.className = `playlist-item ${index === currentIndex ? 'active' : ''}`;
        
        item.innerHTML = `
            <img src="${song.thumbnail}" alt="${song.title}">
            <div class="playlist-item-info">
                <h4>${song.title}</h4>
                <p>${song.artist}</p>
            </div>
        `;

        item.addEventListener('click', () => {
            currentIndex = index;
            loadSong(song);
            updatePlaylistUI();
        });

        playlistContainer.appendChild(item);
    });
}

// Load Song
function loadSong(song) {
    currentSong = song;
    
    // Update UI
    currentTitle.textContent = song.title;
    currentArtist.textContent = song.artist;
    currentArtwork.src = song.thumbnail;
    
    // For demo purposes, we'll use a placeholder audio
    // In a real app, you'd need to extract audio from YouTube video
    audioPlayer.src = getAudioUrl(song.id);
    
    updateFavoriteButton();
    updatePlaylistUI();
}

// Get Audio URL (Placeholder - You'll need a YouTube to MP3 service)
function getAudioUrl(videoId) {
    // This is a placeholder. In production, you'd need to use:
    // 1. YouTube Data API + youtube-dl or similar service
    // 2. A YouTube to MP3 conversion service
    // 3. Or integrate with YouTube's embedded player API
    
    // For demo, returning a sample audio file
    return 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3';
}

// Player Controls
function togglePlayPause() {
    if (!currentSong) {
        showNotification('Please select a song first');
        return;
    }

    if (isPlaying) {
        audioPlayer.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        currentArtwork.classList.remove('playing');
    } else {
        audioPlayer.play().catch(e => {
            console.error('Playback error:', e);
            showError('Unable to play audio');
        });
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        currentArtwork.classList.add('playing');
    }
    
    isPlaying = !isPlaying;
}

function playPrevious() {
    if (playlist.length === 0) return;
    
    if (isShuffled) {
        currentIndex = Math.floor(Math.random() * playlist.length);
    } else {
        currentIndex = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1;
    }
    
    loadSong(playlist[currentIndex]);
    if (isPlaying) {
        audioPlayer.play();
    }
}

function playNext() {
    if (playlist.length === 0) return;
    
    if (isShuffled) {
        currentIndex = Math.floor(Math.random() * playlist.length);
    } else {
        currentIndex = currentIndex < playlist.length - 1 ? currentIndex + 1 : 0;
    }
    
    loadSong(playlist[currentIndex]);
    if (isPlaying) {
        audioPlayer.play();
    }
}

function toggleShuffle() {
    isShuffled = !isShuffled;
    updateShuffleButton();
}

function toggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const currentModeIndex = modes.indexOf(repeatMode);
    repeatMode = modes[(currentModeIndex + 1) % modes.length];
    updateRepeatButton();
}

function toggleFavorite() {
    if (!currentSong) return;
    
    const index = favorites.findIndex(fav => fav.id === currentSong.id);
    
    if (index === -1) {
        favorites.push(currentSong);
        showNotification('Added to favorites');
    } else {
        favorites.splice(index, 1);
        showNotification('Removed from favorites');
    }
    
    localStorage.setItem('musly-favorites', JSON.stringify(favorites));
    updateFavoriteButton();
}

// Update Button States
function updateShuffleButton() {
    shuffleBtn.classList.toggle('active', isShuffled);
}

function updateRepeatButton() {
    repeatBtn.classList.remove('active');
    
    switch(repeatMode) {
        case 'one':
            repeatBtn.innerHTML = '<i class="fas fa-redo-alt"></i>';
            repeatBtn.classList.add('active');
            break;
        case 'all':
            repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
            repeatBtn.classList.add('active');
            break;
        default:
            repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
    }
}

function updateFavoriteButton() {
    if (!currentSong) return;
    
    const isFavorite = favorites.some(fav => fav.id === currentSong.id);
    favoriteBtn.classList.toggle('active', isFavorite);
    favoriteBtn.innerHTML = isFavorite ? 
        '<i class="fas fa-heart"></i>' : 
        '<i class="far fa-heart"></i>';
}

// Audio Event Handlers
function updateDuration() {
    const duration = audioPlayer.duration;
    if (!isNaN(duration)) {
        totalTimeEl.textContent = formatTime(duration);
        progressSlider.max = duration;
    }
}

function updateProgress() {
    const currentTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration;
    
    if (!isNaN(currentTime) && !isNaN(duration)) {
        currentTimeEl.textContent = formatTime(currentTime);
        progressSlider.value = currentTime;
        
        const progressPercent = (currentTime / duration) * 100;
        progressFill.style.width = `${progressPercent}%`;
    }
}

function handleSongEnd() {
    switch(repeatMode) {
        case 'one':
            audioPlayer.currentTime = 0;
            audioPlayer.play();
            break;
        case 'all':
        case 'off':
        default:
            if (currentIndex < playlist.length - 1 || repeatMode === 'all') {
                playNext();
            } else {
                // End of playlist
                isPlaying = false;
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                currentArtwork.classList.remove('playing');
            }
    }
}

function handleAudioError(e) {
    console.error('Audio error:', e);
    showError('Error playing audio. Skipping to next song.');
    playNext();
}

// Slider Controls
function seekTo() {
    const seekTime = progressSlider.value;
    audioPlayer.currentTime = seekTime;
}

function updateVolume() {
    const volume = volumeSlider.value / 100;
    audioPlayer.volume = volume;
}

// Utility Functions
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function showLoading(show) {
    loadingSpinner.classList.toggle('hidden', !show);
}

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
            document.head.removeChild(style);
        }, 300);
    }, 3000);
}

function showError(message) {
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #ff4757, #ff3742);
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Load Sample Playlist
function loadSamplePlaylist() {
    const sampleSongs = [
        {
            id: 'sample1',
            title: 'Bohemian Rhapsody',
            artist: 'Queen',
            thumbnail: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/mqdefault.jpg',
            url: 'sample'
        },
        {
            id: 'sample2',
            title: 'Imagine',
            artist: 'John Lennon',
            thumbnail: 'https://i.ytimg.com/vi/YkgkThdzX-8/mqdefault.jpg',
            url: 'sample'
        },
        {
            id: 'sample3',
            title: 'Hotel California',
            artist: 'Eagles',
            thumbnail: 'https://i.ytimg.com/vi/BciS5krYL80/mqdefault.jpg',
            url: 'sample'
        }
    ];

    // Add sample songs to playlist for demo
    playlist = [...sampleSongs];
    updatePlaylistUI();
    
    // Load first song
    if (playlist.length > 0) {
        loadSong(playlist[0]);
    }
}

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    // Only handle shortcuts if not typing in input
    if (e.target.tagName === 'INPUT') return;
    
    switch(e.code) {
        case 'Space':
            e.preventDefault();
            togglePlayPause();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            playPrevious();
            break;
        case 'ArrowRight':
            e.preventDefault();
            playNext();
            break;
        case 'KeyS':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                toggleShuffle();
            }
            break;
        case 'KeyR':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                toggleRepeat();
            }
            break;
        case 'KeyF':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                toggleFavorite();
            }
            break;
    }
});

// Touch/Swipe Support for Mobile
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchend', (e) => {
    if (!touchStartX || !touchStartY) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    // Only handle horizontal swipes on the player area
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        const playerRect = document.querySelector('.player-container').getBoundingClientRect();
        if (touchStartY >= playerRect.top) {
            if (diffX > 0) {
                // Swipe left - next song
                playNext();
            } else {
                // Swipe right - previous song
                playPrevious();
            }
        }
    }

    touchStartX = 0;
    touchStartY = 0;
});

// Service Worker Registration (for PWA capabilities)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatTime,
        addToPlaylist,
        togglePlayPause,
        playNext,
        playPrevious
    };
}
