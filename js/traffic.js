/* ===========================================================
   traffic.js v2 — first-party analytics beacon
   Pageviews, engaged time, scroll depth, UTM campaigns, web
   vitals, JS errors, outbound clicks, and conversions — all
   into the practice's own database (track_pageview RPC).
   No cookies, no IP addresses, no third parties. Country is
   inferred later from timezone only.

   Numbers appear in the intranet under Insights > Traffic.

   Opt out on any device (do this on your own!):
     localStorage.setItem('aap-notrack','1')

   Conversions: other scripts call window.aapTrack('newsletter')
   / aapTrack('inquiry') / aapTrack('booking') on success.
   =========================================================== */
(function () {
  'use strict';

  var RPC_URL = 'https://twmwqfmmfuwxvzkrwnui.supabase.co/rest/v1/rpc/track_pageview';
  var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bXdxZm1tZnV3eHZ6a3J3bnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNjQ5ODEsImV4cCI6MjA5NDc0MDk4MX0.sXjGyRuKg8yCNq_hlrhJU-UAV0XT5mBICtdlFNLEcRM';

  var optedOut = false;
  try { optedOut = localStorage.getItem('aap-notrack') === '1'; } catch (e) {}
  // Still define aapTrack as a no-op so callers never break.
  if (optedOut) { window.aapTrack = function () {}; return; }

  // ── Session + campaign context ─────────────────────────
  var sessionKey = null, utm = { source: '', medium: '', campaign: '' };
  try {
    sessionKey = sessionStorage.getItem('aap-session');
    if (!sessionKey) {
      sessionKey = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('aap-session', sessionKey);
    }
    var storedUtm = sessionStorage.getItem('aap-utm');
    if (storedUtm) utm = JSON.parse(storedUtm);
    var qs = new URLSearchParams(location.search);
    if (qs.get('utm_source') || qs.get('utm_medium') || qs.get('utm_campaign')) {
      utm = {
        source: (qs.get('utm_source') || '').slice(0, 80),
        medium: (qs.get('utm_medium') || '').slice(0, 80),
        campaign: (qs.get('utm_campaign') || '').slice(0, 120)
      };
      sessionStorage.setItem('aap-utm', JSON.stringify(utm));
    }
  } catch (e) {}

  var device = 'desktop';
  if (/bot|crawl|spider|preview|lighthouse|headless/i.test(navigator.userAgent)) device = 'bot';
  else {
    var w = Math.min(window.screen.width || 9999, window.screen.height || 9999);
    if (w < 768) device = 'mobile';
    else if (w < 1024) device = 'tablet';
  }

  var tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}

  var referrerHost = '';
  try {
    if (document.referrer) {
      var r = new URL(document.referrer);
      if (r.hostname && r.hostname !== location.hostname) referrerHost = r.hostname;
    }
  } catch (e) {}

  var path = location.pathname || '/';
  if (path === '' || path === '/index.html') path = '/';

  function send(extra) {
    try {
      var p = {
        path: path,
        title: (document.title || '').slice(0, 180),
        referrer_host: referrerHost,
        session_key: sessionKey,
        device: device,
        timezone: tz,
        utm_source: utm.source, utm_medium: utm.medium, utm_campaign: utm.campaign
      };
      for (var k in extra) p[k] = extra[k];
      fetch(RPC_URL, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
          'Authorization': 'Bearer ' + ANON_KEY
        },
        body: JSON.stringify({ p: p })
      }).catch(function () {});
    } catch (e) { /* analytics never disturbs the page */ }
  }

  // ── 1. Pageview (or 404) ───────────────────────────────
  var is404 = /^404\b|not found/i.test(document.title || '');
  send(is404 ? { event_type: 'not_found', meta: { requested: location.pathname } } : { event_type: 'pageview' });

  // ── 2. Engaged time + scroll depth ─────────────────────
  var engagedMs = 0, lastTick = Date.now(), lastActivity = Date.now(), maxScroll = 0, summarySent = false;
  function tick() {
    var now = Date.now();
    if (document.visibilityState === 'visible' && now - lastActivity < 30000) {
      engagedMs += now - lastTick;
    }
    lastTick = now;
  }
  setInterval(tick, 2000);
  function activity() { lastActivity = Date.now(); }
  ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, activity, { passive: true });
  });
  function measureScroll() {
    try {
      var h = document.documentElement;
      var total = Math.max(1, (h.scrollHeight || 1) - window.innerHeight);
      var pct = Math.min(100, Math.round(((window.scrollY || h.scrollTop || 0) / total) * 100));
      if (pct > maxScroll) maxScroll = pct;
    } catch (e) {}
  }
  window.addEventListener('scroll', measureScroll, { passive: true });
  measureScroll();

  // ── 3. Web vitals (LCP, CLS, FCP) ──────────────────────
  var vitals = {};
  try {
    new PerformanceObserver(function (list) {
      var entries = list.getEntries();
      if (entries.length) vitals.lcp = Math.round(entries[entries.length - 1].startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {}
  try {
    var cls = 0;
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (en) { if (!en.hadRecentInput) cls += en.value; });
      vitals.cls = Math.round(cls * 1000) / 1000;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (en) {
        if (en.name === 'first-contentful-paint') vitals.fcp = Math.round(en.startTime);
      });
    }).observe({ type: 'paint', buffered: true });
  } catch (e) {}

  function sendSummary() {
    if (summarySent) return;
    summarySent = true;
    tick();
    measureScroll();
    if (engagedMs > 500) {
      send({ event_type: 'engagement', engaged_ms: Math.round(engagedMs), max_scroll_pct: maxScroll });
    }
    if (vitals.lcp || vitals.cls != null || vitals.fcp) {
      send({ event_type: 'vital', meta: { lcp: String(vitals.lcp || ''), cls: String(vitals.cls == null ? '' : vitals.cls), fcp: String(vitals.fcp || '') } });
    }
  }
  window.addEventListener('pagehide', sendSummary);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') sendSummary();
    else summarySent = false; /* returned; a fresh summary may follow */
  });

  // ── 4. JS errors (first 3 per page) ────────────────────
  var errCount = 0;
  window.addEventListener('error', function (e) {
    if (errCount++ >= 3) return;
    send({
      event_type: 'error',
      meta: {
        message: String((e && e.message) || 'unknown').slice(0, 300),
        source: String((e && e.filename) || '').slice(0, 200),
        line: String((e && e.lineno) || '')
      }
    });
  });

  // ── 5. Outbound clicks ─────────────────────────────────
  document.addEventListener('click', function (e) {
    try {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (/^https?:\/\//i.test(href)) {
        var u = new URL(href);
        if (u.hostname !== location.hostname) {
          send({ event_type: 'click_outbound', meta: { href: href.slice(0, 300), text: (a.textContent || '').trim().slice(0, 120) } });
        }
      }
    } catch (err) {}
  }, { passive: true });

  // ── 6. Conversions (called by other scripts on success) ─
  var CONVERSIONS = {
    newsletter: 'conversion_newsletter',
    inquiry: 'conversion_inquiry',
    booking: 'conversion_booking'
  };
  window.aapTrack = function (kind, meta) {
    var type = CONVERSIONS[kind];
    if (!type) return;
    var m = {};
    try {
      if (meta && typeof meta === 'object') {
        for (var k in meta) { m[String(k).slice(0, 40)] = String(meta[k]).slice(0, 200); }
      }
    } catch (e) {}
    send({ event_type: type, meta: m });
  };
})();
