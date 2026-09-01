// Mobile Menu Toggle
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.getElementById('navLinks');

if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
        const isActive = navLinks.classList.toggle('active');
        mobileToggle.innerText = isActive ? '✕' : '☰';

        // Prevent body scroll when menu is open
        document.body.style.overflow = isActive ? 'hidden' : '';
    });

    // Close menu when clicking links
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            mobileToggle.innerText = '☰';
            document.body.style.overflow = '';
        });
    });
}

// Hero Slider Logic (background photos only — hero text is static)
const slides = document.querySelectorAll('.hero-slide');
let currentSlide = 0;

function nextSlide() {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
}

if (slides.length > 1) {
    setInterval(nextSlide, 6000); // Switch every 6 seconds
}

// Reveal Engine
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('on');
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Theme toggle (visual only — dark is the only styled theme for now)
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    if (localStorage.getItem('uwezo-theme') === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }
    themeToggle.addEventListener('click', () => {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        document.documentElement.setAttribute('data-theme', isLight ? 'dark' : 'light');
        localStorage.setItem('uwezo-theme', isLight ? 'dark' : 'light');
    });
}
