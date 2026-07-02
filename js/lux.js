/* lux.js — sitewide scroll-reveal (2026-07-01). Safe by construction:
   no-JS and reduced-motion users always see full content. */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  var start = function () {
    document.body.classList.add('lux-anim');
    var sections = Array.prototype.slice.call(document.querySelectorAll('section')).filter(function (s) {
      var c = s.className || '';
      if (/hero/i.test(c)) return false;              // heroes stay put
      if (s.querySelector('.main-nav')) return false; // never the header
      return true;
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('lux-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });
    sections.forEach(function (el) { el.classList.add('lux-reveal'); io.observe(el); });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
