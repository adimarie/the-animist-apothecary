/* ===================================================
   THE ANIMIST APOTHECARY — main.js
   =================================================== */

// ── Header: add .scrolled on scroll ─────────────────
const header = document.querySelector('.site-header');
if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
}

// ── Active nav link from current page ───────────────
(function () {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav > ul > li > a').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('nav-active');
  });
})();

// ── Smooth scroll (anchor links, header offset) ─────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + scrollY - 90;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// ── Accordion ────────────────────────────────────────
document.querySelectorAll('.accordion-header').forEach(header => {
  header.addEventListener('click', () => {
    const item = header.closest('.accordion-item');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.accordion-item.open').forEach(el => el.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

// ── Fade-in on scroll (Intersection Observer) ────────
if ('IntersectionObserver' in window) {
  const targets = document.querySelectorAll(
    'section, .offering-card, .modality-card, .community-card, .process-step, .vision-pillar, .cycle-phase'
  );

  targets.forEach(el => el.classList.add('fade-in'));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.07, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(el => io.observe(el));
}

// ── Book form: client-side success state ─────────────
const bookForm = document.getElementById('booking-form');
if (bookForm) {
  bookForm.addEventListener('submit', e => {
    e.preventDefault();
    const btn  = bookForm.querySelector('button[type="submit"]');
    const note = bookForm.querySelector('.form-note');
    btn.textContent  = 'Message Sent ✓';
    btn.style.background = '#4A6344';
    btn.disabled = true;
    if (note) {
      note.textContent = "Thank you — we'll be in touch within 48 hours.";
      note.style.color = '#5B7553';
    }
  });
}
