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

// Hero Slider Logic
const slides = document.querySelectorAll('.hero-slide');
const slideTexts = document.querySelectorAll('.hero-slide-text');
let currentSlide = 0;

function nextSlide() {
    // Remove active from current
    slides[currentSlide].classList.remove('active');
    slideTexts[currentSlide].classList.remove('active');
    slideTexts[currentSlide].style.display = 'none';

    // Move to next
    currentSlide = (currentSlide + 1) % slides.length;

    // Add active to next
    slides[currentSlide].classList.add('active');
    slideTexts[currentSlide].classList.add('active');
    slideTexts[currentSlide].style.display = 'block';
}

if (slides.length > 0) {
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
