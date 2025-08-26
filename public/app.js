// Main App Module - Production-grade PWA music player
// Handles Audius, YouTube, and SoundCloud playback with iOS optimizations

class MusicPlayer {
  constructor() {
    this.currentProvider = 'audius';
    this.currentTrack = null;
    this.queue = [];
    this.queueIndex = -1;
    this.isPlaying = false;
    this.audioElement = null;
    this.youtubePlayer = null;
    this.soundcloudWidget = null;
    
    // iOS Safari detection
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }
  
  init() {
    this.setupAudioElement();
    this.setupEventListeners();
    this.setupMediaSession();
    this.loadQueueFromStorage();
    this.registerServiceWorker();
    
    // Fix iOS viewport height
    this.fixIOSViewport();
    
    // Setup YouTube API when ready
    window.onYouTubeIframeAPIReady = () => {
      this.initYouTubePlayer();
    };
  }
  
  fixIOSViewport() {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
  }
  
  setupAudioElement() {
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    
    // Audio events
    this.audioElement.addEventListener('play', () => this.onPlay());
    this.audioElement.addEventListener('pause', () => this.onPause());
    this.audioElement.addEventListener('ended', () => this.onEnded());
    this.audioElement.addEventListener('timeupdate', () => this.onTimeUpdate());
    this.audioElement.addEventListener('loadedmetadata', () => this.onMetadataLoaded());
    this.audioElement.addEventListener('error', (e) => this.onError(e));
  }
  
  setupEventListeners() {
    // Provider selector
    document.querySelectorAll('.segment').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchProvider(e.target.dataset.provider);
      });
    });
    
    // Search
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    searchBtn.addEventListener('click', () => this.search());
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.search();
    });
    
    // Player controls
    document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePlayPause());
    document.getElementById('prevBtn').addEventListener('click', () => this.playPrevious());
    document.getElementById('nextBtn').addEventListener('click', () => this.playNext());
    
    // Progress slider
    const progressSlider = document.querySelector('.progress-slider');
    progressSlider.addEventListener('input', (e) => {
      this.seek(e.target.value / 100);
    });
    
    // Mini player
    document.querySelector('.mini-player').addEventListener('click', () => {
      this.showFullPlayer();
    });
    
    // Full player close
    document.querySelector('.player-close').addEventListener('click', () => {
      this.hideFullPlayer();
    });
    
    // Queue button
    document.getElementById('queueBtn').addEventListener('click', () => {
      this.toggleQueue();
    });
    
    // Clear queue
    document.querySelector('.clear-queue-btn').addEventListener('click', () => {
      this.clearQueue();
    });
    
    // Share button
    document.getElementById('shareBtn').addEventListener('click', () => {
      this.shareCurrentTrack();
    });
    
    // Handle backdrop click
    document.querySelector('.player-backdrop').addEventListener('click', () => {
      this.hideFullPlayer();
    });
  }
  
  setupMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.play());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrevious());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        this.seek(details.seekTime / this.audioElement.duration);
      });
    }
  }
  
  switchProvider(provider) {
    this.currentProvider = provider;
    
    // Update UI
    document.querySelectorAll('.segment').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.provider === provider);
    });
    
    // Update search placeholder
    const searchInput = document.getElementById('searchInput');
    if (provider === 'audius') {
      searchInput.placeholder = 'Search tracks on Audius...';
    } else if (provider === 'youtube') {
      searchInput.placeholder = 'Paste YouTube URL...';
    } else {
      searchInput.placeholder = 'Paste SoundCloud URL...';
    }
    
    // Clear results
    document.getElementById('results').innerHTML = '';
  }
  
  async search() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;
    
    this.showLoading(true);
    
    try {
      if (this.currentProvider === 'audius') {
        await this.searchAudius(query);
      } else if (this.currentProvider === 'youtube') {
        await this.loadYouTubeURL(query);
      } else if (this.currentProvider === 'soundcloud') {
        await this.loadSoundCloudURL(query);
      }
    } catch (error) {
      console.error('Search error:', error);
      this.showError('Search failed. Please try again.');
    } finally {
      this.showLoading(false);
    }
  }
  
  async searchAudius(query) {
    const response = await fetch(`/api/audius/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    if (data.data) {
      this.displayAudiusResults(data.data);
    }
  }
  
  displayAudiusResults(tracks) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';
    
    tracks.forEach(track => {
      const item = this.createTrackElement(track, 'audius');
      resultsContainer.appendChild(item);
    });
  }
  
  createTrackElement(track, provider) {
    const div = document.createElement('div');
    div.className = 'track-item';
    
    let title, artist, artwork, duration;
    
    if (provider === 'audius') {
      title = track.title;
      artist = track.user.name;
      artwork = track.artwork?.['150x150'] || track.artwork?.['480x480'] || '';
      duration = this.formatDuration(track.duration);
    } else {
      title = track.title;
      artist = track.author_name || 'Unknown';
      artwork = track.thumbnail_url || '';
      duration = '';
    }
    
    div.innerHTML = `
      <img class="track-artwork" src="${artwork}" alt="${title}" onerror="this.src='data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" fill=\"%23333\"/></svg>'">
      <div class="track-info">
        <div class="track-title">${this.escapeHtml(title)}</div>
        <div class="track-artist">${this.escapeHtml(artist)}</div>
      </div>
      ${duration ? `<div class="track-duration">${duration}</div>` : ''}
    `;
    
    div.addEventListener('click', () => {
      this.playTrack({ ...track, provider });
    });
    
    return div;
  }
  
  async loadYouTubeURL(url) {
    // Validate YouTube URL
    const videoId = this.extractYouTubeId(url);
    if (!videoId) {
      this.showError('Invalid YouTube URL');
      return;
    }
    
    const response = await fetch(`/api/youtube/oembed?url=${encodeURIComponent(url)}`);
    const data = await response.json();
    
    if (data.title) {
      const track = {
        ...data,
        url,
        videoId,
        provider: 'youtube'
      };
      
      const resultsContainer = document.getElementById('results');
      resultsContainer.innerHTML = '';
      resultsContainer.appendChild(this.createTrackElement(track, 'youtube'));
    }
  }
  
  async loadSoundCloudURL(url) {
    const response = await fetch(`/api/soundcloud/oembed?url=${encodeURIComponent(url)}`);
    const data = await response.json();
    
    if (data.title) {
      const track = {
        ...data,
        url,
        provider: 'soundcloud'
      };
      
      const resultsContainer = document.getElementById('results');
      resultsContainer.innerHTML = '';
      resultsContainer.appendChild(this.createTrackElement(track, 'soundcloud'));
    }
  }
  
  extractYouTubeId(url) {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
  
  async playTrack(track) {
    this.currentTrack = track;
    this.addToQueue(track);
    
    // Update UI
    this.updatePlayerUI(track);
    this.showMiniPlayer();
    
    // Stop current playback
    this.stopAllPlayers();
    
    // Play based on provider
    if (track.provider === 'audius') {
      await this.playAudius(track);
    } else if (track.provider === 'youtube') {
      await this.playYouTube(track);
    } else if (track.provider === 'soundcloud') {
      await this.playSoundCloud(track);
    }
    
    // Update media session
    this.updateMediaSession(track);
  }
  
  async playAudius(track) {
    const streamUrl = `/api/audius/stream/${track.id}`;
    this.audioElement.src = streamUrl;
    
    try {
      await this.audioElement.play();
      this.isPlaying = true;
    } catch (error) {
      console.error('Playback error:', error);
      // Handle autoplay policy
      if (error.name === 'NotAllowedError') {
        this.showError('Please tap play to start playback');
      }
    }
  }
  
  async playYouTube(track) {
    if (!this.youtubePlayer) {
      this.initYouTubePlayer();
      // Wait for player to be ready
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (this.youtubePlayer && this.youtubePlayer.loadVideoById) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    }
    
    this.youtubePlayer.loadVideoById(track.videoId);
    this.youtubePlayer.playVideo();
    this.isPlaying = true;
    this.onPlay();
  }
  
  async playSoundCloud(track) {
    // Create iframe for SoundCloud
    const container = document.getElementById('youtubePlayer');
    container.innerHTML = track.html;
    
    // Get widget reference
    const iframe = container.querySelector('iframe');
    if (iframe && window.SC) {
      this.soundcloudWidget = SC.Widget(iframe);
      this.soundcloudWidget.play();
      this.isPlaying = true;
      this.onPlay();
    }
  }
  
  initYouTubePlayer() {
    this.youtubePlayer = new YT.Player('youtubePlayer', {
      height: '200',
      width: '200',
      playerVars: {
        autoplay: 1,
        controls: 0,
        modestbranding: 1,
        playsinline: 1
      },
      events: {
        onStateChange: (event) => {
          if (event.data === YT.PlayerState.ENDED) {
            this.onEnded();
          } else if (event.data === YT.PlayerState.PLAYING) {
            this.onPlay();
          } else if (event.data === YT.PlayerState.PAUSED) {
            this.onPause();
          }
        }
      }
    });
  }
  
  stopAllPlayers() {
    // Stop audio element
    this.audioElement.pause();
    this.audioElement.src = '';
    
    // Stop YouTube
    if (this.youtubePlayer && this.youtubePlayer.stopVideo) {
      this.youtubePlayer.stopVideo();
    }
    
    // Stop SoundCloud
    if (this.soundcloudWidget && this.soundcloudWidget.pause) {
      this.soundcloudWidget.pause();
    }
  }
  
  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }
  
  play() {
    if (!this.currentTrack) return;
    
    if (this.currentTrack.provider === 'audius') {
      this.audioElement.play();
    } else if (this.currentTrack.provider === 'youtube' && this.youtubePlayer) {
      this.youtubePlayer.playVideo();
    } else if (this.currentTrack.provider === 'soundcloud' && this.soundcloudWidget) {
      this.soundcloudWidget.play();
    }
    
    this.isPlaying = true;
    this.onPlay();
  }
  
  pause() {
    if (this.currentTrack.provider === 'audius') {
      this.audioElement.pause();
    } else if (this.currentTrack.provider === 'youtube' && this.youtubePlayer) {
      this.youtubePlayer.pauseVideo();
    } else if (this.currentTrack.provider === 'soundcloud' && this.soundcloudWidget) {
      this.soundcloudWidget.pause();
    }
    
    this.isPlaying = false;
    this.onPause();
  }
  
  seek(percentage) {
    if (this.currentTrack.provider === 'audius') {
      this.audioElement.currentTime = this.audioElement.duration * percentage;
    } else if (this.currentTrack.provider === 'youtube' && this.youtubePlayer) {
      const duration = this.youtubePlayer.getDuration();
      this.youtubePlayer.seekTo(duration * percentage);
    }
  }
  
  playNext() {
    if (this.queue.length === 0) return;
    
    this.queueIndex = (this.queueIndex + 1) % this.queue.length;
    this.playTrack(this.queue[this.queueIndex]);
  }
  
  playPrevious() {
    if (this.queue.length === 0) return;
    
    this.queueIndex = this.queueIndex > 0 ? this.queueIndex - 1 : this.queue.length - 1;
    this.playTrack(this.queue[this.queueIndex]);
  }
  
  addToQueue(track) {
    // Check if track already exists
    const existingIndex = this.queue.findIndex(t => 
      t.id === track.id && t.provider === track.provider
    );
    
    if (existingIndex === -1) {
      this.queue.push(track);
      this.queueIndex = this.queue.length - 1;
    } else {
      this.queueIndex = existingIndex;
    }
    
    this.saveQueueToStorage();
    this.updateQueueUI();
  }
  
  clearQueue() {
    this.queue = [];
    this.queueIndex = -1;
    this.saveQueueToStorage();
    this.updateQueueUI();
  }
  
  saveQueueToStorage() {
    try {
      localStorage.setItem('musicQueue', JSON.stringify(this.queue));
    } catch (e) {
      console.error('Failed to save queue:', e);
    }
  }
  
  loadQueueFromStorage() {
    try {
      const saved = localStorage.getItem('musicQueue');
      if (saved) {
        this.queue = JSON.parse(saved);
        this.updateQueueUI();
      }
    } catch (e) {
      console.error('Failed to load queue:', e);
    }
  }
  
  updateQueueUI() {
    const queueList = document.getElementById('queueList');
    queueList.innerHTML = '';
    
    this.queue.forEach((track, index) => {
      const item = document.createElement('div');
      item.className = `queue-item ${index === this.queueIndex ? 'playing' : ''}`;
      
      item.innerHTML = `
        <div class="queue-number">${index + 1}</div>
        <img class="track-artwork" src="${track.artwork?.['150x150'] || track.thumbnail_url || ''}" alt="">
        <div class="track-info">
          <div class="track-title">${this.escapeHtml(track.title)}</div>
          <div class="track-artist">${this.escapeHtml(track.user?.name || track.author_name || '')}</div>
        </div>
      `;
      
      item.addEventListener('click', () => {
        this.queueIndex = index;
        this.playTrack(track);
      });
      
      queueList.appendChild(item);
    });
  }
  
  toggleQueue() {
    document.querySelector('.queue-section').classList.toggle('visible');
  }
  
  updatePlayerUI(track) {
    // Mini player
    document.querySelector('.mini-title').textContent = track.title;
    document.querySelector('.mini-artist').textContent = track.user?.name || track.author_name || '';
    document.querySelector('.mini-artwork').src = track.artwork?.['150x150'] || track.thumbnail_url || '';
    
    // Full player
    document.querySelector('.player-title').textContent = track.title;
    document.querySelector('.player-artist').textContent = track.user?.name || track.author_name || '';
    document.querySelector('.player-artwork').src = track.artwork?.['480x480'] || track.artwork?.['150x150'] || track.thumbnail_url || '';
  }
  
  updateMediaSession(track) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.user?.name || track.author_name || '',
        artwork: [
          {
            src: track.artwork?.['480x480'] || track.artwork?.['150x150'] || track.thumbnail_url || '',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      });
    }
  }
  
  onPlay() {
    // Update play button icons
    const playIcon = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    document.querySelectorAll('.play-pause-btn svg').forEach(svg => {
      svg.innerHTML = playIcon;
    });
    
    document.querySelector('.mini-play-btn svg').innerHTML = playIcon;
  }
  
  onPause() {
    // Update play button icons
    const pauseIcon = '<path d="M8 5v14l11-7z"/>';
    document.querySelectorAll('.play-pause-btn svg').forEach(svg => {
      svg.innerHTML = pauseIcon;
    });
    
    document.querySelector('.mini-play-btn svg').innerHTML = pauseIcon;
  }
  
  onEnded() {
    this.playNext();
  }
  
  onTimeUpdate() {
    if (this.currentTrack?.provider === 'audius') {
      const progress = (this.audioElement.currentTime / this.audioElement.duration) * 100;
      
      // Update progress bar
      document.querySelector('.mini-progress').style.width = `${progress}%`;
      document.querySelector('.progress-slider').value = progress;
      
      // Update time display
      document.querySelector('.time-current').textContent = this.formatTime(this.audioElement.currentTime);
      document.querySelector('.time-total').textContent = this.formatTime(this.audioElement.duration);
    }
  }
  
  onMetadataLoaded() {
    // Metadata loaded
  }
  
  onError(error) {
    console.error('Playback error:', error);
    this.showError('Playback failed. Trying next track...');
    setTimeout(() => this.playNext(), 2000);
  }
  
  showMiniPlayer() {
    document.getElementById('miniPlayer').classList.add('visible');
    document.getElementById('miniPlayer').classList.remove('hidden');
  }
  
  showFullPlayer() {
    document.getElementById('fullPlayer').classList.add('visible');
    document.getElementById('fullPlayer').classList.remove('hidden');
    
    // Haptic feedback on iOS
    if (this.isIOS && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  }
  
  hideFullPlayer() {
    document.getElementById('fullPlayer').classList.remove('visible');
    setTimeout(() => {
      document.getElementById('fullPlayer').classList.add('hidden');
    }, 300);
  }
  
  async shareCurrentTrack() {
    if (!this.currentTrack) return;
    
    const shareData = {
      title: this.currentTrack.title,
      text: `Listen to ${this.currentTrack.title}`,
      url: window.location.href
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        this.showError('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  }
  
  showLoading(show) {
    document.getElementById('loadingIndicator').classList.toggle('hidden', !show);
  }
  
  showError(message) {
    // Simple error display - you can enhance this with a toast component
    console.error(message);
    
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--color-surface);
      color: white;
      padding: 12px 24px;
      border-radius: 20px;
      z-index: 500;
      animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
  
  formatDuration(seconds) {
    return this.formatTime(seconds);
  }
  
  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('ServiceWorker registered:', registration);
      } catch (error) {
        console.error('ServiceWorker registration failed:', error);
      }
    }
  }
}

// Initialize the app
const app = new MusicPlayer();

// Export for debugging
window.musicPlayer = app;
