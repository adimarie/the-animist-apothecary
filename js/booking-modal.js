/* ===========================================================
   The Animist Apothecary — Booking Modal (shared component)

   A self-contained modal that opens from any element marked with
   `data-modal-open` and populated from data-* attributes.

   Usage:
     <a class="offering-card" data-modal-open
        data-title="Multi-Day Intensives"
        data-eyebrow="Multi-Day Private"
        data-desc="2–7 day private ceremonial retreats..."
        data-reciprocity="By inquiry · Reciprocity discussed at Intake"
        data-schedule-url="https://calendar.app.google/YOUR_LINK"
        data-venmo-url="https://venmo.com/u/adimarie"
        data-paypal-url="https://paypal.me/ahtheemaree"
        data-inquire-email-subject="Multi-Day Intensive Inquiry">
       Schedule & Inquire →
     </a>

   Just drop <script src="js/booking-modal.js" defer></script> on any
   page that needs it. Modal HTML + CSS are auto-injected.
   =========================================================== */

(function () {
  if (window.__bookingModalInit) return;
  window.__bookingModalInit = true;

  // ---------- Inject styles ----------
  const css = `
    .booking-modal {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .booking-modal[aria-hidden="false"] {
      display: flex;
      animation: bm-fade-in 0.25s ease;
    }
    @keyframes bm-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .booking-modal-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(28, 22, 16, 0.7);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      cursor: pointer;
    }
    .booking-modal-panel {
      position: relative;
      background: #FAF8F3;
      max-width: 640px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      border-radius: 4px;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
      padding: 2.5rem 2.5rem 2rem;
      animation: bm-rise 0.3s ease;
    }
    @keyframes bm-rise {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .booking-modal-close {
      position: absolute;
      top: 0.8rem;
      right: 1rem;
      background: transparent;
      border: none;
      font-size: 1.8rem;
      line-height: 1;
      color: #5A554C;
      cursor: pointer;
      padding: 0.3rem 0.7rem;
      transition: color 0.2s, transform 0.2s;
    }
    .booking-modal-close:hover {
      color: #c9a84c;
      transform: scale(1.15);
    }
    .booking-modal-eyebrow {
      display: inline-block;
      font-family: 'Cormorant SC', 'Cormorant Garamond', serif;
      font-size: 0.72rem;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: #c9a84c;
      margin-bottom: 0.5rem;
    }
    .booking-modal-title {
      font-family: 'Cormorant Garamond', serif;
      font-weight: 400;
      font-size: clamp(1.6rem, 3vw, 2.2rem);
      line-height: 1.15;
      color: #2D2A26;
      margin: 0 0 1rem;
    }
    .booking-modal-desc {
      font-family: 'Cormorant Garamond', serif;
      font-size: 1.05rem;
      line-height: 1.65;
      color: #3D3A36;
      margin: 0 0 1.4rem;
    }
    .booking-modal-reciprocity {
      font-family: 'Cormorant SC', serif;
      font-size: 0.78rem;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #c9a84c;
      padding: 0.8rem 1rem;
      background: #F5F3ED;
      border-left: 3px solid #c9a84c;
      border-radius: 2px;
      margin: 0 0 1.6rem;
    }
    .booking-modal-section-title {
      font-family: 'Cormorant SC', serif;
      font-size: 0.72rem;
      letter-spacing: 0.26em;
      text-transform: uppercase;
      color: #5A554C;
      margin: 1.5rem 0 0.7rem;
    }
    .booking-modal-schedule-btn {
      display: block;
      width: 100%;
      text-align: center;
      padding: 1.1rem 1.4rem;
      background: #2D2A26;
      color: #FAF8F3;
      border-radius: 2px;
      text-decoration: none;
      font-family: 'Cormorant SC', 'Cormorant Garamond', serif;
      font-size: 0.85rem;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      transition: background 0.2s;
      margin: 0 0 1rem;
    }
    .booking-modal-schedule-btn:hover {
      background: #c9a84c;
      color: #2D2A26;
    }
    .booking-modal-schedule-note {
      font-family: 'Cormorant Garamond', serif;
      font-style: italic;
      font-size: 0.92rem;
      color: #5A554C;
      margin: 0 0 1.6rem;
      text-align: center;
    }
    .booking-modal-payment-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.7rem;
      margin: 0.4rem 0 1rem;
    }
    .booking-modal-payment-btn {
      padding: 0.9rem 1rem;
      border-radius: 2px;
      text-decoration: none;
      text-align: center;
      font-family: 'Cormorant SC', 'Cormorant Garamond', serif;
      font-size: 0.8rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      border: 1px solid #c9a84c;
      color: #c9a84c;
      transition: background 0.2s, color 0.2s;
    }
    .booking-modal-payment-btn:hover {
      background: #c9a84c;
      color: #FAF8F3;
    }
    .booking-modal-inquire-link {
      display: inline-block;
      font-family: 'Cormorant Garamond', serif;
      font-style: italic;
      font-size: 0.95rem;
      color: #5A554C;
      text-decoration: underline;
      text-decoration-color: rgba(201, 168, 76, 0.4);
      text-underline-offset: 3px;
      margin: 0.6rem 0 0;
    }
    .booking-modal-inquire-link:hover { color: #c9a84c; }
    body.bm-locked { overflow: hidden; }
    @media (max-width: 520px) {
      .booking-modal-panel { padding: 2rem 1.4rem 1.5rem; }
      .booking-modal-payment-row { grid-template-columns: 1fr; }
    }
  `;
  const style = document.createElement('style');
  style.id = 'booking-modal-styles';
  style.textContent = css;
  document.head.appendChild(style);

  // ---------- Inject modal HTML ----------
  const modalHTML = `
    <div class="booking-modal" id="booking-modal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="bm-title">
      <div class="booking-modal-backdrop" data-bm-close></div>
      <div class="booking-modal-panel">
        <button class="booking-modal-close" data-bm-close aria-label="Close">&times;</button>
        <span class="booking-modal-eyebrow" id="bm-eyebrow"></span>
        <h2 class="booking-modal-title" id="bm-title"></h2>
        <p class="booking-modal-desc" id="bm-desc"></p>
        <div class="booking-modal-reciprocity" id="bm-reciprocity"></div>

        <h3 class="booking-modal-section-title">Schedule</h3>
        <a class="booking-modal-schedule-btn" id="bm-schedule" href="#" target="_blank" rel="noopener">Schedule via Calendar →</a>
        <p class="booking-modal-schedule-note">Choose a time that opens on the wheel.</p>

        <h3 class="booking-modal-section-title">Reciprocity</h3>
        <div class="booking-modal-payment-row">
          <a class="booking-modal-payment-btn" id="bm-venmo" href="#" target="_blank" rel="noopener">Venmo</a>
          <a class="booking-modal-payment-btn" id="bm-paypal" href="#" target="_blank" rel="noopener">PayPal</a>
        </div>

        <a class="booking-modal-inquire-link" id="bm-inquire" href="mailto:its.adimarie@gmail.com">Prefer to write first? Send a note →</a>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modal = document.getElementById('booking-modal');
  const els = {
    eyebrow: document.getElementById('bm-eyebrow'),
    title: document.getElementById('bm-title'),
    desc: document.getElementById('bm-desc'),
    reciprocity: document.getElementById('bm-reciprocity'),
    schedule: document.getElementById('bm-schedule'),
    venmo: document.getElementById('bm-venmo'),
    paypal: document.getElementById('bm-paypal'),
    inquire: document.getElementById('bm-inquire'),
  };

  // ---------- Open modal ----------
  function openModal(btn) {
    const d = btn.dataset;
    els.eyebrow.textContent = d.eyebrow || '';
    els.title.textContent = d.title || '';
    els.desc.textContent = d.desc || '';
    els.reciprocity.textContent = d.reciprocity || 'Reciprocity discussed at Intake & Inquiry.';
    els.schedule.href = d.scheduleUrl || '#';
    els.venmo.href = d.venmoUrl || 'https://venmo.com/u/adimarie';
    els.paypal.href = d.paypalUrl || 'https://paypal.me/ahtheemaree';
    const subject = encodeURIComponent(d.inquireEmailSubject || (d.title + ' — Inquiry'));
    els.inquire.href = 'mailto:its.adimarie@gmail.com?subject=' + subject;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('bm-locked');
  }

  function closeModal() {
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('bm-locked');
  }

  // ---------- Wire click handlers ----------
  document.querySelectorAll('[data-modal-open]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      openModal(btn);
    });
  });

  modal.querySelectorAll('[data-bm-close]').forEach(el => {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal();
  });

})();
