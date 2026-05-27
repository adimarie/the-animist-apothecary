/* ===========================================================
   Newsletter signup handler
   Wires #newsletter-form to the Supabase subscribe-newsletter
   edge function. Passes source so admin can distinguish where
   signups came from (homepage vs writings vs other pages added later).
   Shows real success/error state in #newsletter-status.
   =========================================================== */

(function () {
  const SUPABASE_URL = 'https://wdecjlrfulsdklqeetqb.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZWNqbHJmdWxzZGtscWVldHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODQwMTQsImV4cCI6MjA4ODY2MDAxNH0.mIBgkpU24IgxnzS8kR06FOL6_1Z9NmaEDe9z36CxtHs';

  function detectSource() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('writings')) return 'writings';
    if (path.includes('book.html')) return 'begin-here';
    if (path === '/' || path.endsWith('index.html')) return 'homepage';
    // Default — page name without extension
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

    const formData = new FormData(form);
    const payload = {
      first_name: (formData.get('first_name') || '').trim(),
      last_name: (formData.get('last_name') || '').trim(),
      email: (formData.get('email') || '').trim().toLowerCase(),
      source: detectSource(),
    };

    if (!payload.email) {
      setStatus(statusEl, 'error', 'Please enter your email address.');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalBtnText; }
      return;
    }

    try {
      const response = await fetch(SUPABASE_URL + '/functions/v1/subscribe-newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Success — replace form with held-with-care message
        setStatus(statusEl, 'success', 'Held with care. The next letter will arrive with the season.');
        disableForm(form);
        if (submitBtn) submitBtn.textContent = '✓ Subscribed';
      } else {
        const text = await response.text();
        let errMsg = 'Something went wrong. Please try again, or write to its.adimarie@gmail.com.';
        try {
          const parsed = JSON.parse(text);
          if (parsed && parsed.error) errMsg = parsed.error;
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
