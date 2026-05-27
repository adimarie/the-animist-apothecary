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

// ── Fade-in on scroll DISABLED ──────────────────────
// Was hiding YAML-rendered list items because the IntersectionObserver
// was set up at page load on the hardcoded elements; when content-loader
// replaced them with clones, the new ones inherited opacity:0 from
// .fade-in but never got .visible. Polish v16 CSS kills the rule.
// We still set .js-ready (other CSS may key off it) but no longer add
// the .fade-in class anywhere.
document.documentElement.classList.add('js-ready');

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

// ── Calendar: cue status badge color by text ────────
// Runs after content-loader has populated the events list.
(function () {
  function applyStatusColors() {
    document.querySelectorAll('.event-status').forEach(function (el) {
      var t = (el.textContent || '').trim().toLowerCase();
      if (t.indexOf('waitlist') !== -1) el.dataset.status = 'waitlist';
      else if (t.indexOf('inquiry') !== -1) el.dataset.status = 'inquiry';
      else if (t.indexOf('closed') !== -1 || t.indexOf('full') !== -1) el.dataset.status = 'closed';
      else if (t.indexOf('open') !== -1) el.dataset.status = 'open';
    });
  }
  // Run once on DOMContentLoaded, and again after a short delay so it
  // catches content that content-loader injected asynchronously.
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    applyStatusColors();
    setTimeout(applyStatusColors, 800);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      applyStatusColors();
      setTimeout(applyStatusColors, 800);
    });
  }
})();
