// Music Player Controller
class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audioPlayer');
        this.isPlaying = false;
        this.currentTrack = null;
        this.init();
    }

    init() {
        this.setupAudioEvents();
        this.setupControlEvents();
        this.setupProgressBar();
    }

    setupAudioEvents() {
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('ended', () => this.handleTrackEnd());
        this.audio.addEventListener('error', (e) => this.handleError(e));
    }

    setupControlEvents() {
        document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('prevBtn').addEventListener('click', () => this.playPrevious());
        document.getElementById('nextBtn').addEventListener('click', () => this.playNext());
    }

    setupProgressBar() {
        const progressBar = document.getElementById('progressBar');
        progressBar.addEventListener('input', (e) => {
            const value = e.target.value;
            const time = (value / 100) * this.audio.duration;
            this.audio.currentTime = time;
        });
    }

    loadTrack(url, trackInfo) {
        this.currentTrack = trackInfo;
        this.audio.src = url;
        
        // Update UI
        document.getElementById('playerTitle').textContent = trackInfo.title;
        document.getElementById('playerArtist').textContent = trackInfo.artist;
        document.getElementById('playerThumbnail').src = trackInfo.thumbnail;
        
        // Animate player appearance
        this.animatePlayerIn();
        
        // Auto play
        this.play();
    }

    play() {
        this.audio.play().then(() => {
            this.isPlaying = true;
            this.updatePlayButton();
            this.startVisualEffects();
        }).catch(error => {
            console.error('Playback failed:', error);
            this.showNotification('Playback failed. Please try another track.');
        });
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayButton();
        this.stopVisualEffects();
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    updatePlayButton() {
        const playIcon = document.getElementById('playIcon');
        const pauseIcon = document.getElementById('pauseIcon');
        
        if (this.isPlaying) {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        } else {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        }
    }

    updateProgress() {
        const currentTime = this.audio.currentTime;
        const duration = this.audio.duration;
        
        if (duration) {
            const progressPercent = (currentTime / duration) * 100;
            document.getElementById('progressBar').value = progressPercent;
            document.getElementById('currentTime').textContent = this.formatTime(currentTime);
        }
    }

    updateDuration() {
        const duration = this.audio.duration;
        document.getElementById('duration').textContent = this.formatTime(duration);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    playPrevious() {
        // Implement previous track logic
        this.animateButtonPress('prevBtn');
    }

    playNext() {
        // Implement next track logic
        this.animateButtonPress('nextBtn');
    }

    handleTrackEnd() {
        this.isPlaying = false;
        this.updatePlayButton();
        // Auto play next track if available
    }

    handleError(error) {
        console.error('Audio error:', error);
        this.showNotification('Error playing track');
    }

    animatePlayerIn() {
        const player = document.getElementById('player');
        player.style.animation = 'slideInUp 0.5s ease-out';
    }

    animateButtonPress(buttonId) {
        const button = document.getElementById(buttonId);
        button.style.transform = 'scale(0.9)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 200);
    }

    startVisualEffects() {
        // Add visual effects when playing
        document.querySelector('.player-album-art img').style.animation = 'pulse 2s infinite';
    }

    stopVisualEffects() {
        // Stop visual effects when paused
        document.querySelector('.player-album-art img').style.animation = 'none';
    }

    showNotification(message) {
        // Implement notification system
        console.log(message);
    }
}

// Initialize player when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.musicPlayer = new MusicPlayer();
});
