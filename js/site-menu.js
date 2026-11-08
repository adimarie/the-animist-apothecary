/* The Animist Apothecary — site menu toggle (phone menu), 2026-11-03.
   Below 1000px the eight-item menu lives behind the header toggle and
   opens as a full-height panel under the header. Nothing here runs on
   wide screens except closing the panel when the window grows. */
(function () {
  var btn = document.querySelector('.site-header .nav-toggle');
  var nav = document.getElementById('site-menu');
  var header = document.querySelector('.site-header');
  if (!btn || !nav || !header) return;
  var body = document.body;
  var root = document.documentElement;
  function isOpen() { return body.classList.contains('menu-open'); }
  function setHeaderHeight() { root.style.setProperty('--aap-header-h', header.offsetHeight + 'px'); }
  function open() {
    setHeaderHeight();
    body.classList.add('menu-open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Close menu');
    var first = nav.querySelector('a');
    if (first) first.focus({ preventScroll: true });
  }
  function close(refocus) {
    body.classList.remove('menu-open');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
    if (refocus) btn.focus();
  }
  btn.addEventListener('click', function () { if (isOpen()) close(false); else open(); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) close(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) close(true); });
  var wide = window.matchMedia('(min-width: 1200px)');
  function onChange() { if (wide.matches) close(false); }
  if (wide.addEventListener) wide.addEventListener('change', onChange); else wide.addListener(onChange);
  window.addEventListener('resize', function () { if (isOpen()) setHeaderHeight(); }, { passive: true });
  window.addEventListener('scroll', function () { if (isOpen()) setHeaderHeight(); }, { passive: true });
})();

/* Menu links land on anchors deep in long pages. Images above the target can load after the jump
   and push it down, so once the page has fully loaded we jump again — instantly, never animated. */
(function () {
  function rejump() {
    var h = window.location.hash;
    if (!h || h.length < 2) return;
    var el = null;
    try { el = document.getElementById(decodeURIComponent(h.slice(1))); } catch (e) { el = null; }
    if (!el) return;
    var top = el.getBoundingClientRect().top;
    if (top < 60 || top > 220) el.scrollIntoView({ block: 'start', behavior: 'auto' });
  }
  window.addEventListener('load', function () { rejump(); setTimeout(rejump, 700); setTimeout(rejump, 1600); });
  window.addEventListener('hashchange', function () { setTimeout(rejump, 50); });
})();
