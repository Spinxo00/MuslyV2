// Animation Controller
class AnimationController {
    constructor() {
        this.init();
    }

    init() {
        this.setupIntersectionObserver();
        this.setupParallax();
        this.setupSmoothScroll();
        this.initializeAnimations();
    }

    setupIntersectionObserver() {
        const options = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, options);

        // Observe all animatable elements
        document.querySelectorAll('.track-card').forEach(el => {
            this.observer.observe(el);
        });
    }

    setupParallax() {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const parallax = document.querySelector('.app-header');
            if (parallax) {
                parallax.style.transform = `translateY(${scrolled * 0.5}px)`;
            }
        });
    }

    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    initializeAnimations() {
        // Add stagger animation to cards
        this.staggerAnimation('.track-card', 50);
        
        // Add hover effects
        this.setupHoverEffects();
        
        // Setup loading animations
        this.setupLoadingAnimations();
    }

    staggerAnimation(selector, delay) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el, index) => {
            el.style.animationDelay = `${index * delay}ms`;
        });
    }

    setupHoverEffects() {
        document.querySelectorAll('.track-card').forEach(card => {
            card.addEventListener('mouseenter', (e) => {
                this.createHoverEffect(e.currentTarget);
            });
        });
    }

    createHoverEffect(element) {
        element.style.transform = 'translateY(-5px) scale(1.02)';
        element.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.3)';
    }

    setupLoadingAnimations() {
        // Create skeleton loading animation
        this.createSkeletonLoader();
    }

    createSkeletonLoader() {
        const skeleton = `
            <div class="skeleton-card">
                <div class="skeleton skeleton-thumbnail"></div>
                <div class="skeleton-info">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-artist"></div>
                </div>
            </div>
        `;
        return skeleton;
    }

    animateElement(element, animationName, duration = 500) {
        element.style.animation = `${animationName} ${duration}ms ease-out`;
        setTimeout(() => {
            element.style.animation = '';
        }, duration);
    }

    createConfetti() {
        // Fun confetti animation for special events
        const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c'];
        const confettiCount = 50;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 3000);
        }
    }
}

// Initialize animation controller
document.addEventListener('DOMContentLoaded', () => {
    window.animationController = new AnimationController();
});

// Add touch animations for mobile
document.addEventListener('touchstart', function(e) {
    if (e.target.classList.contains('track-card') || e.target.closest('.track-card')) {
        const card = e.target.closest('.track-card');
        card.style.transform = 'scale(0.98)';
    }
});

document.addEventListener('touchend', function(e) {
    if (e.target.classList.contains('track-card') || e.target.closest('.track-card')) {
        const card = e.target.closest('.track-card');
        card.style.transform = 'scale(1)';
    }
});
