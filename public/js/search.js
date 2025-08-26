// Search Controller
class SearchController {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.debounceTimer = null;
        this.init();
    }

    init() {
        this.setupSearchSuggestions();
        this.setupVoiceSearch();
        this.setupSearchHistory();
    }

    setupSearchSuggestions() {
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.fetchSuggestions(e.target.value);
            }, 300);
        });
    }

    async fetchSuggestions(query) {
        if (query.length < 2) return;
        
        // Implement search suggestions
        // This would connect to your backend API
    }

    setupVoiceSearch() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.searchInput.value = transcript;
                window.musicApp.performSearch();
            };
        }
    }

    startVoiceSearch() {
        if (this.recognition) {
            this.recognition.start();
            this.animateVoiceSearch();
        }
    }

    animateVoiceSearch() {
        // Add voice search animation
        this.searchInput.style.animation = 'pulse 1.5s infinite';
    }

    setupSearchHistory() {
        this.loadSearchHistory();
        
        this.searchInput.addEventListener('focus', () => {
            this.showSearchHistory();
        });
    }

    loadSearchHistory() {
        const history = localStorage.getItem('searchHistory');
        this.searchHistory = history ? JSON.parse(history) : [];
    }

    saveToHistory(query) {
        if (!this.searchHistory.includes(query)) {
            this.searchHistory.unshift(query);
            this.searchHistory = this.searchHistory.slice(0, 10); // Keep only last 10
            localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
        }
    }

    showSearchHistory() {
        // Implement search history dropdown
    }

    clearHistory() {
        this.searchHistory = [];
        localStorage.removeItem('searchHistory');
    }
}

// Initialize search controller
document.addEventListener('DOMContentLoaded', () => {
    window.searchController = new SearchController();
});
