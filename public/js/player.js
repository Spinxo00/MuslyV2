// Music Player Controller
class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audioPlayer');
        this.isPlaying = false;
        this.currentTrack = null;
        this.progress = 0;
        this.init();
    }

    init() {
        this.setupAudioEvents();
        this.setupControls();
        this.setupProgressBar();
    }

    setupAudioEvents() {
        this.audio.addEventListener('loadedmetadata', () => this.onMetadataLoaded());
        this.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
        this.audio.addEventListener('ended', () => this.onTrackEnded());
        this.audio.addEventListener('play', () => this.onPlay());
        this.audio.addEventListener('pause', () => this.onPause());
        this.audio.addEventListener('error', (e) => this.onError(e));
    }

    setupControls() {
        // Mini player controls
        document.getElementById('miniPlayBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePlayPause();
        });

        // Full player controls
        document.getElementById('playPauseBtn')?.addEventListener('click', () => this.togglePlayPause());
        document.getElementById('prevBtn')?.addEventListener('click', () => this.playPrevious());
        document.getElementById('nextBtn')?.addEventListener('click', () => this.playNext());
        document.getElementById('shuffleBtn')?.addEventListener('click', () => this.toggleShuffle());
        document.getElementById('repeatBtn')?.addEventListener('click', () => this.toggleRepeat());
    }

    setupProgressBar() {
        const slider = document.getElementById('progressSlider');
        
        slider?.addEventListener('input', (e) => {
            const value = e.target.value;
            this.seekTo(value);
        });

        // Touch events for better iOS experience
        slider?.addEventListener('touchstart', () => {
            this.isSeeking = true;
        });

        slider?.addEventListener('touchend', () => {
            this.isSeeking = false;
        });
    }

    loadTrack(url, trackInfo) {
        this.currentTrack = trackInfo;
        this.audio.src = url;
        
        // Update UI
        this.updatePlayerUI(trackInfo);
        
        // Auto play
        this.play();
    }

    updatePlayerUI(track) {
        // Mini player
        document.getElementById('miniThumbnail').src = track.thumbnail || '';
        document.getElementById('miniTitle').textContent = track.title;
        document.getElementById('miniArtist').textContent = track.artist;

        // Full player
        document.getElementById('playerArtwork').src = track.thumbnail || '';
        document.getElementById('playerTitle').textContent = track.title;
        document.getElementById('playerArtist').textContent = track.artist;
    }

    play() {
        const playPromise = this.audio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.isPlaying = true;
                this.updatePlayButton();
                this.startAnimation();
            }).catch(error => {
                console.error('Playback failed:', error);
                this.showPlaybackError();
            });
        }
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayButton();
        this.stopAnimation();
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    updatePlayButton() {
        // Mini player
        const miniPlayIcon = document.getElementById('miniPlayIcon');
        const miniPauseIcon = document.getElementById('miniPauseIcon');
        
        if (this.isPlaying) {
            miniPlayIcon?.classList.add('hidden');
            miniPauseIcon?.classList.remove('hidden');
        } else {
            miniPlayIcon?.classList.remove('hidden');
            miniPauseIcon?.classList.add('hidden');
        }

        // Full player
        const playIcon = document.getElementById('playIcon');
        const pauseIcon = document.getElementById('pauseIcon');
        
        if (this.isPlaying) {
            playIcon?.classList.add('hidden');
            pauseIcon?.classList.remove('hidden');
        } else {
            playIcon?.classList.remove('hidden');
            pauseIcon?.classList.add('hidden');
        }
    }

    onTimeUpdate() {
        if (!this.isSeeking) {
            const currentTime = this.audio.currentTime;
            const duration = this.audio.duration;
            
            if (duration) {
                this.progress = (currentTime / duration) * 100;
                this.updateProgress();
            }
        }
    }

    updateProgress() {
        // Update progress bars
        document.getElementById('miniProgressBar').style.width = `${this.progress}%`;
        document.getElementById('progressFill').style.width = `${this.progress}%`;
        document.getElementById('progressSlider').value = this.progress;
        
        // Update time display
        document.getElementById('currentTime').textContent = this.formatTime(this.audio.currentTime);
    }

    onMetadataLoaded() {
        const duration = this.audio.duration;
        document.getElementById('totalTime').textContent = this.formatTime(duration);
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    seekTo(percentage) {
        const duration = this.audio.duration;
        if (duration) {
            const time = (percentage / 100) * duration;
            this.audio.currentTime = time;
        }
    }

    playPrevious() {
        // Animate button
        this.animateButton('prevBtn');
        
        // Implement previous track logic
        if (this.audio.currentTime > 3) {
            this.audio.currentTime = 0;
        } else {
            // Play previous track in queue
            console.log('Previous track');
        }
    }

    playNext() {
        // Animate button
        this.animateButton('nextBtn');
        
        // Implement next track logic
        console.log('Next track');
    }

    toggleShuffle() {
        const btn = document.getElementById('shuffleBtn');
        btn.classList.toggle('active');
        this.animateButton('shuffleBtn');
    }

    toggleRepeat() {
        const btn = document.getElementById('repeatBtn');
        btn.classList.toggle('active');
        this.animateButton('repeatBtn');
    }

    onTrackEnded() {
        this.isPlaying = false;
        this.updatePlayButton();
        
        // Check if repeat is enabled
        if (document.getElementById('repeatBtn')?.classList.contains('active')) {
            this.play();
        } else {
            // Play next track
            this.playNext();
        }
    }

    onPlay() {
        this.isPlaying = true;
        this.updatePlayButton();
    }

    onPause() {
        this.isPlaying = false;
        this.updatePlayButton();
    }

    onError(error) {
        console.error('Audio error:', error);
        this.showPlaybackError();
    }

    showPlaybackError() {
        // Show error notification
        console.error('Playback error occurred');
    }

    startAnimation() {
        // Add visual feedback when playing
        document.getElementById('playerArtwork')?.classList.add('playing');
    }

    stopAnimation() {
        // Remove visual feedback when paused
        document.getElementById('playerArtwork')?.classList.remove('playing');
    }

    animateButton(buttonId) {
        const button = document.getElementById(buttonId);
        button?.classList.add('spring');
        setTimeout(() => {
            button?.classList.remove('spring');
        }, 500);
    }
}

// Initialize player
document.addEventListener('DOMContentLoaded', () => {
    window.musicPlayer = new MusicPlayer();
});
