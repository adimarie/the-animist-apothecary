/* ===========================================================
   The Animist Apothecary — Community Gate (Supabase-backed)

   Per-person token gate for in-person gathering pages. Unlike the
   shared-password gate (shared/password-gate.js), tokens are unique
   per member, stored in Supabase, validated server-side via the
   validate_community_token() RPC, and revocable by Adi.

   Page contract:
     #communityGate   — the gateway (token entry + intake), shown by default
     #gatedContent     — the member content, hidden until unlocked
     #gateForm         — form with #gateToken input and #gateError element

   Unlock paths: a prior sessionStorage unlock, a ?token=… link, or a
   token typed into the gate. On unlock, fires window 'community:unlocked'.
   =========================================================== */
(function () {
  var SUPABASE_URL = 'https://wdecjlrfulsdklqeetqb.supabase.co';
  var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZWNqbHJmdWxzZGtscWVldHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODQwMTQsImV4cCI6MjA4ODY2MDAxNH0.mIBgkpU24IgxnzS8kR06FOL6_1Z9NmaEDe9z36CxtHs';
  var STORAGE_KEY = 'aap-gatherings-unlocked';
  var TOKEN_KEY = 'aap-gatherings-token';

  function rpc(name, body) {
    return fetch(SUPABASE_URL + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + ANON_KEY
      },
      body: JSON.stringify(body || {})
    }).then(function (res) {
      if (!res.ok) return { valid: false, ok: false };
      return res.json();
    }).catch(function () { return { valid: false, ok: false }; });
  }

  function validateToken(token) {
    if (!token || !token.trim()) return Promise.resolve({ valid: false });
    return rpc('validate_community_token', { p_token: token.trim() });
  }

  function unlock(label, token) {
    try {
      sessionStorage.setItem(STORAGE_KEY, label || 'member');
      if (token) sessionStorage.setItem(TOKEN_KEY, token);
    } catch (e) {}
    var gate = document.getElementById('communityGate');
    var content = document.getElementById('gatedContent');
    if (gate) gate.style.display = 'none';
    if (content) content.style.display = 'block';
    window.dispatchEvent(new CustomEvent('community:unlocked', { detail: { label: label } }));
  }

  // Expose for page scripts (registration, calendar)
  window.AApCommunityGate = {
    SUPABASE_URL: SUPABASE_URL,
    ANON_KEY: ANON_KEY,
    STORAGE_KEY: STORAGE_KEY,
    rpc: rpc,
    validateToken: validateToken,
    unlock: unlock,
    currentLabel: function () { try { return sessionStorage.getItem(STORAGE_KEY); } catch (e) { return null; } },
    currentToken: function () { try { return sessionStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }
  };

  document.addEventListener('DOMContentLoaded', function () {
    // 1) Already unlocked this session?
    var existing = null;
    try { existing = sessionStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (existing) { unlock(existing); return; }

    // 2) Personalized ?token= link?
    var params = new URLSearchParams(window.location.search);
    var urlToken = params.get('token');

    function wireForm() {
      var form = document.getElementById('gateForm');
      if (!form) return;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = document.getElementById('gateToken');
        var err = document.getElementById('gateError');
        var btn = form.querySelector('button[type="submit"]');
        if (err) err.style.display = 'none';
        if (btn) { btn.disabled = true; }
        var entered = input.value.trim();
        validateToken(entered).then(function (r) {
          if (btn) btn.disabled = false;
          if (r && r.valid) {
            unlock(r.label, entered);
          } else {
            if (err) { err.style.display = 'block'; }
            input.value = '';
            input.focus();
          }
        });
      });
    }

    if (urlToken) {
      validateToken(urlToken).then(function (r) {
        if (r && r.valid) { unlock(r.label, urlToken.trim()); }
        else { wireForm(); }
      });
    } else {
      wireForm();
    }
  });
})();
