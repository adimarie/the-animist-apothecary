/* ===========================================================
   Newsletter signup handler
   Wires #newsletter-form to the intranet Supabase via the
   contact_upsert_public RPC. Signups land in the contacts
   table at new.theanimistapothecary.com/intranet with a
   "Newsletter" tag — visible under Contacts > Newsletter.
   =========================================================== */

(function () {
  const INTRANET_URL      = 'https://twmwqfmmfuwxvzkrwnui.supabase.co';
  const INTRANET_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bXdxZm1tZnV3eHZ6a3J3bnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNjQ5ODEsImV4cCI6MjA5NDc0MDk4MX0.sXjGyRuKg8yCNq_hlrhJU-UAV0XT5mBICtdlFNLEcRM';

  function detectSource() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('wilds')) return 'wilds';
    if (path.includes('writings')) return 'writings';
    if (path.includes('book.html')) return 'begin-here';
    if (path === '/' || path.endsWith('index.html')) return 'homepage';
    if (path.includes('/letters/')) {
      const lm = path.match(/\/letters\/([^\/]+)\.html$/);
      return lm ? 'letters-' + lm[1] : 'letters';
    }
    const m = path.match(/\/([^\/]+)\.html$/);
    return m ? m[1] : 'unknown';
  }

  function setStatus(statusEl, type, message) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = 'newsletter-status newsletter-status-' + type;
  }

  function disableForm(form) {
    form.querySelectorAll('input, button').forEach(el => { el.disabled = true; });
  }

  async function handleSubmit(form, e) {
    e.preventDefault();
    const statusEl = form.parentElement.querySelector('#newsletter-status')
      || document.getElementById('newsletter-status');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : '';

    setStatus(statusEl, 'pending', 'Sending …');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending …';
    }

    const formData     = new FormData(form);
    const refSource    = (formData.get('referral_source') || '').trim();
    const refDetail    = (formData.get('referral_detail') || '').trim();
    const notesParts   = [refSource, refDetail].filter(Boolean);

    const payload = {
      email:         (formData.get('email') || '').trim().toLowerCase(),
      first_name:    (formData.get('first_name') || '').trim(),
      last_name:     (formData.get('last_name') || '').trim(),
      zip:           (formData.get('zip_code') || '').trim(),
      referred_by:   refSource,
      notes:         notesParts.join(' — '),
      source_list:   detectSource(),
      tags:          ['Newsletter'],
      is_subscribed: true,
    };

    if (!payload.email) {
      setStatus(statusEl, 'error', 'Please enter your email address.');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalBtnText; }
      return;
    }

    try {
      const response = await fetch(INTRANET_URL + '/rest/v1/rpc/contact_upsert_public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + INTRANET_ANON_KEY,
          'apikey':        INTRANET_ANON_KEY,
          'Prefer':        'return=representation',
        },
        body: JSON.stringify({ p_payload: payload }),
      });

      if (response.ok) {
        setStatus(statusEl, 'success', 'Held with care. The next letter will arrive with the season.');
        disableForm(form);
        if (submitBtn) submitBtn.textContent = '✓ Subscribed';
        try { if (window.aapTrack) window.aapTrack('newsletter', { source: payload.source_list }); } catch (e) {}
      } else {
        const text = await response.text();
        let errMsg = 'Something went wrong. Please try again, or write to its.adimarie@gmail.com.';
        try {
          const parsed = JSON.parse(text);
          if (parsed && parsed.message) errMsg = parsed.message;
          else if (parsed && parsed.error) errMsg = parsed.error;
        } catch (_) {}
        setStatus(statusEl, 'error', errMsg);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalBtnText; }
      }
    } catch (err) {
      console.error('Newsletter subscribe error:', err);
      setStatus(statusEl, 'error', 'Network error. Please try again, or write to its.adimarie@gmail.com.');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalBtnText; }
    }
  }

  function init() {
    document.querySelectorAll('#newsletter-form, .newsletter-form, form[id*="newsletter"]').forEach(form => {
      if (form.__newsletterBound) return;
      form.__newsletterBound = true;
      form.addEventListener('submit', e => handleSubmit(form, e));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
