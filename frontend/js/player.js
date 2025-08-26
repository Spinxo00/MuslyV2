// Music Player Controller
class MusicPlayer {
    constructor() {
        this.audio = new Audio();
        this.currentTrack = null;
        this.isPlaying = false;
        this.volume = 0.7;
        this.isRepeat = false;
        this.isShuffle = false;
        this.playlist = [];
        this.currentIndex = 0;
        
        this.init();
    }

    init() {
        this.setupAudioEvents();
        this.setupControls();
        this.loadSettings();
    }

    setupAudioEvents() {
        // Update progress
        this.audio.addEventListener('timeupdate', () => {
            this.updateProgress();
        });

        // Track ended
        this.audio.addEventListener('ended', () => {
            if (this.isRepeat) {
                this.audio.play();
            } else {
                this.next();
            }
        });

        // Loading states
        this.audio.addEventListener('loadstart', () => {
            this.setLoadingState(true);
        });

        this.audio.addEventListener('canplay', () => {
            this.setLoadingState(false);
        });

        // Error handling
        this.audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            this.handlePlaybackError();
        });
    }

    setupControls() {
        // Play/Pause buttons
        const playBtn = document.getElementById('playBtn');
        const miniPlayBtn = document.getElementById('miniPlayBtn');
        
        playBtn.addEventListener('click', () => this.togglePlay());
        miniPlayBtn.addEventListener('click', () => this.togglePlay());

        // Navigation
        document.getElementById('prevBtn').addEventListener('click', () => this.previous());
        document.getElementById('nextBtn').addEventListener('click', () => this.next());

        // Repeat & Shuffle
        document.getElementById('repeatBtn').addEventListener('click', () => this.toggleRepeat());
        document.getElementById('shuffleBtn').addEventListener('click', () => this.toggleShuffle());

        // Progress slider
        const progressSlider = document.getElementById('progressSlider');
        progressSlider.addEventListener('input', (e) => {
            const seekTime = (e.target.value / 100) * this.audio.duration;
            this.seek(seekTime);
        });

        // Volume control
        const volumeSlider = document.getElementById('volumeSlider');
        volumeSlider.addEventListener('input', (e) => {
            this.setVolume(e.target.value / 100);
        });
    }

    loadTrack(url, trackInfo) {
        this.currentTrack = trackInfo;
        this.audio.src = url;
        this.audio.load();
        this.play();
    }

    play() {
        this.audio.play().then(() => {
            this.isPlaying = true;
            this.updatePlayButton();
        }).catch(error => {
            console.error('Play error:', error);
            this.handlePlaybackError();
        });
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayButton();
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    next() {
        if (this.playlist.length > 0) {
            if (this.isShuffle) {
                this.currentIndex = Math.floor(Math.random() * this.playlist.length);
            } else {
                this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
            }
            const nextTrack = this.playlist[this.currentIndex];
            window.muslyApp.playTrack(nextTrack);
        }
    }

    previous() {
        if (this.audio.currentTime > 3) {
            this.seek(0);
        } else if (this.playlist.length > 0) {
            this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
            const prevTrack = this.playlist[this.currentIndex];
            window.muslyApp.playTrack(prevTrack);
        }
    }

    seek(time) {
        if (!isNaN(time)) {
            this.audio.currentTime = time;
        }
    }

    setVolume(value) {
        this.volume = value;
        this.audio.volume = value;
        localStorage.setItem('musly_volume', value * 100);
    }

    toggleRepeat() {
        this.isRepeat = !this.isRepeat;
        document.getElementById('repeatBtn').classList.toggle('active', this.isRepeat);
    }

    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        document.getElementById('shuffleBtn').classList.toggle('active', this.isShuffle);
    }

    updateProgress() {
        const currentTime = this.audio.currentTime;
        const duration = this.audio.duration || 0;
        
        // Update time displays
        document.getElementById('currentTime').textContent = this.formatTime(currentTime);
        document.getElementById('duration').textContent = this.formatTime(duration);
        
        // Update progress bars
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
        document.getElementById('progressSlider').value = progress;
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('miniProgress').style.width = `${progress}%`;
    }

    updatePlayButton() {
        const playBtn = document.getElementById('playBtn');
        const miniPlayBtn = document.getElementById('miniPlayBtn');
        
        if (this.isPlaying) {
            playBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
            miniPlayBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
        } else {
            playBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
            miniPlayBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
        }
    }

    setLoadingState(loading) {
        const playBtn = document.getElementById('playBtn');
        if (loading) {
            playBtn.innerHTML = '<div class="loading-spinner small"></div>';
        } else {
            this.updatePlayButton();
        }
    }

    handlePlaybackError() {
        this.pause();
        window.muslyApp.showError('Playback error. Trying alternative source...');
        // Implement fallback logic here
    }

    formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity) return '--:--';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    loadSettings() {
        const savedVolume = localStorage.getItem('musly_volume');
        if (savedVolume) {
            this.setVolume(parseFloat(savedVolume) / 100);
            document.getElementById('volumeSlider').value = savedVolume;
        }
    }

    addToPlaylist(track) {
        this.playlist.push(track);
    }

    clearPlaylist() {
        this.playlist = [];
        this.currentIndex = 0;
    }
}
