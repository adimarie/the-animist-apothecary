/* ===========================================================
   traffic.js — first-party pageview beacon
   Sends one anonymous pageview per page load to the intranet
   Supabase (track_pageview RPC). No cookies, no IPs, no
   third-party trackers. Numbers appear in the intranet under
   Insights > Traffic.

   Opt out on any device: run
     localStorage.setItem('aap-notrack','1')
   in the browser console (Adi: do this on your own devices so
   your visits don't count).
   =========================================================== */
(function () {
  try {
    if (localStorage.getItem('aap-notrack') === '1') return;

    var RPC_URL = 'https://twmwqfmmfuwxvzkrwnui.supabase.co/rest/v1/rpc/track_pageview';
    var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bXdxZm1tZnV3eHZ6a3J3bnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNjQ5ODEsImV4cCI6MjA5NDc0MDk4MX0.sXjGyRuKg8yCNq_hlrhJU-UAV0XT5mBICtdlFNLEcRM';

    // One random key per browser session, so "unique visits" can be
    // counted without identifying anyone.
    var sessionKey = null;
    try {
      sessionKey = sessionStorage.getItem('aap-session');
      if (!sessionKey) {
        sessionKey = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem('aap-session', sessionKey);
      }
    } catch (e) { /* private mode; proceed without */ }

    var device = 'desktop';
    if (/bot|crawl|spider|preview|lighthouse/i.test(navigator.userAgent)) device = 'bot';
    else {
      var w = Math.min(window.screen.width || 9999, window.screen.height || 9999);
      if (w < 768) device = 'mobile';
      else if (w < 1024) device = 'tablet';
    }

    var referrerHost = '';
    try {
      if (document.referrer) {
        var r = new URL(document.referrer);
        if (r.hostname && r.hostname !== location.hostname) referrerHost = r.hostname;
      }
    } catch (e) { /* malformed referrer */ }

    var path = location.pathname || '/';
    if (path === '' || path === '/index.html') path = '/';

    fetch(RPC_URL, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + ANON_KEY
      },
      body: JSON.stringify({
        p: {
          path: path,
          title: (document.title || '').slice(0, 180),
          referrer_host: referrerHost,
          session_key: sessionKey,
          device: device
        }
      })
    }).catch(function () { /* never disturb the page */ });
  } catch (e) { /* never disturb the page */ }
})();
