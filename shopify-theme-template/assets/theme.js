/*
  Premium Glass Theme Interactions
  - Theme toggle persists in localStorage
  - Scroll reveal for fade-in animations
  - Ripple effect on buttons
*/

const themeToggle = document.querySelector('[data-theme-toggle]');
const root = document.documentElement;

const storedTheme = localStorage.getItem('glass-theme');
if (storedTheme) {
  root.dataset.theme = storedTheme;
  if (themeToggle) {
    themeToggle.setAttribute('aria-pressed', storedTheme === 'dark');
  }
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = nextTheme;
    themeToggle.setAttribute('aria-pressed', nextTheme === 'dark');
    localStorage.setItem('glass-theme', nextTheme);
  });
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2 }
);

document.querySelectorAll('[data-animate="fade"]').forEach((el) => observer.observe(el));

const rippleTargets = document.querySelectorAll('[data-ripple]');
rippleTargets.forEach((target) => {
  target.addEventListener('click', (event) => {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = target.getBoundingClientRect();
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    target.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
});

const style = document.createElement('style');
style.innerHTML = `
  [data-ripple] { position: relative; overflow: hidden; }
  .ripple {
    position: absolute;
    width: 18px;
    height: 18px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.5);
    transform: translate(-50%, -50%);
    animation: ripple 600ms ease-out;
    pointer-events: none;
  }
  @keyframes ripple {
    0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    100% { opacity: 0; transform: translate(-50%, -50%) scale(12); }
  }
`;

document.head.appendChild(style);
