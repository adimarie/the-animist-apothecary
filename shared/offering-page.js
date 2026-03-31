/**
 * Offering Page Renderer — reads offering data and renders a complete detail page.
 * Used by individual offering pages (platicas, divinations, etc.).
 * Each page only needs: <div id="offeringContent"></div> and a call to initOfferingPage(slug).
 */
import { getOffering, SHARED_POLICIES } from './offerings-data.js';
import { initPublicPage } from './public-shell.js';

/* ------------------------------------------------------------------ */
/*  Helper renderers                                                   */
/* ------------------------------------------------------------------ */

function renderWhatSupports(items) {
  return `
    <div style="max-width: 50ch; margin: 0 auto 2rem; text-align: center;">
      <p style="color: var(--aap-text-muted); font-size: 0.95rem; margin-bottom: 0.75rem; font-weight: 600; letter-spacing: 0.04em;">What This Supports</p>
      <ul style="list-style: none; padding: 0; margin: 0; color: var(--aap-text-muted); font-size: 0.95rem; line-height: 2;">
        ${items.map(item => `<li>${item}</li>`).join('')}
      </ul>
    </div>`;
}

function renderAccordionStep(step, i) {
  return `
    <details class="aap-accordion__item">
      <summary class="aap-accordion__trigger">
        <span style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="color: var(--aap-accent); font-size: 0.85rem; font-weight: 600; min-width: 1.5rem;">${String(i + 1).padStart(2, '0')}</span>
          ${step.title}
        </span>
        <svg class="aap-accordion__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </summary>
      <div class="aap-accordion__content">
        ${step.content}
      </div>
    </details>`;
}

function renderSlidingScale(scale) {
  return `
    <div class="aap-scale">
      ${Object.values(scale).map(tier => `
        <div class="aap-scale__tier aap-scale__tier--${tier.color}">
          <div class="aap-scale__label">${tier.label}</div>
          <div class="aap-scale__price">≥ $${tier.min.toLocaleString()}</div>
        </div>
      `).join('')}
    </div>`;
}

function renderSharedPolicies() {
  return `
    <div style="max-width: 60ch; margin: 2rem auto 0; text-align: center; color: var(--aap-text-muted); font-size: 0.92rem; line-height: 1.8;">
      <p>${SHARED_POLICIES.scaleNote}</p>
      <p style="margin-top: 1rem;">${SHARED_POLICIES.limitedSlots}</p>
      <p style="margin-top: 1rem;">${SHARED_POLICIES.reciprocityNote}</p>
      <p style="margin-top: 1rem; font-style: italic;">${SHARED_POLICIES.paymentPolicy}</p>
    </div>`;
}

function renderVirtualNote(note) {
  return `
    <div style="max-width: 60ch; margin: 2rem auto 0; padding: 1.25rem 1.5rem; border-left: 2px solid var(--aap-accent); background: rgba(255,255,255,0.02); border-radius: 0 6px 6px 0;">
      <p style="color: var(--aap-text-muted); font-size: 0.9rem; line-height: 1.7; margin: 0;">
        <strong style="color: var(--aap-text-light); font-weight: 600;">Virtual Session Note</strong><br>
        ${note}
      </p>
    </div>`;
}

function renderAftercareNote(note) {
  return `
    <div style="max-width: 60ch; margin: 1.5rem auto 0; text-align: center;">
      <p style="color: var(--aap-text-muted); font-size: 0.92rem; line-height: 1.7;">
        <strong style="color: var(--aap-text-light);">Aftercare Included</strong> — ${note}
      </p>
    </div>`;
}

function renderDivider() {
  return '<div style="width: 60px; height: 1px; background: var(--aap-accent); margin: 0 auto; opacity: 0.4;"></div>';
}

/* ------------------------------------------------------------------ */
/*  Main page renderer                                                 */
/* ------------------------------------------------------------------ */

function renderOfferingPage(offering) {
  return `
    <!-- Section I: The Modality -->
    <section class="aap-content" style="padding-top: var(--aap-space-xl);">
      <div style="text-align:center; margin-bottom: var(--aap-space-xl);">
        <h1 style="font-family: var(--aap-font-heading); font-size: 3rem; font-weight: 400; letter-spacing: 0.04em; color: var(--aap-text-light); margin-bottom: 0.5rem;">${offering.name}</h1>
        ${offering.subtitle ? `<p style="font-family: var(--aap-font-heading); font-size: 1.25rem; color: var(--aap-text-muted); font-style: italic;">${offering.subtitle}</p>` : ''}
        <p style="margin-top: 1rem; color: var(--aap-text-muted); font-size: 0.9rem;">${offering.duration} · ${offering.format}</p>
      </div>

      <p style="font-size: 1.15rem; line-height: 1.8; color: var(--aap-text); max-width: 65ch; margin: 0 auto 2rem; text-align: center; font-style: italic;">${offering.description}</p>

      ${offering.extendedDescription ? `<p style="color: var(--aap-text-muted); max-width: 65ch; margin: 0 auto 2rem; text-align: center;">${offering.extendedDescription}</p>` : ''}

      ${offering.whatSupports ? renderWhatSupports(offering.whatSupports) : ''}

      ${offering.virtualNote ? renderVirtualNote(offering.virtualNote) : ''}
    </section>

    ${renderDivider()}

    <!-- Section II: The Journey -->
    <section class="aap-content">
      <h2 style="font-family: var(--aap-font-heading); font-size: 2rem; font-weight: 400; text-align: center; margin-bottom: var(--aap-space-lg); color: var(--aap-text-light);">The Process of This Experience</h2>

      <div class="aap-accordion">
        ${offering.journeySteps.map((step, i) => renderAccordionStep(step, i)).join('')}
      </div>
    </section>

    ${renderDivider()}

    <!-- Section III: Booking / Sliding Scale -->
    <section class="aap-content">
      <h2 style="font-family: var(--aap-font-heading); font-size: 2rem; font-weight: 400; text-align: center; margin-bottom: var(--aap-space-lg); color: var(--aap-text-light);">Sacred Reciprocity &amp; Sliding Scale</h2>

      ${renderSlidingScale(offering.scale)}

      ${offering.aftercare && offering.aftercareNote ? renderAftercareNote(offering.aftercareNote) : ''}

      ${renderSharedPolicies()}

      <div style="text-align: center; margin-top: var(--aap-space-xl);">
        <a href="/book/?intake=true" class="aap-btn aap-btn--primary" style="font-size: 1.1rem; padding: 0.85rem 2.5rem;">Begin Here</a>
      </div>
    </section>

    ${renderDivider()}

    <!-- Section IV: Testimonials & FAQs (placeholder) -->
    <section class="aap-content" style="text-align: center; padding-bottom: var(--aap-space-3xl);">
      <p style="color: var(--aap-text-muted); font-style: italic;">Testimonials and frequently asked questions coming soon.</p>
    </section>`;
}

/* ------------------------------------------------------------------ */
/*  Public entry point                                                 */
/* ------------------------------------------------------------------ */

/**
 * Initialises an offering detail page.
 * @param {string} slug — the offering slug (e.g. 'platicas', 'divinations')
 */
export function initOfferingPage(slug) {
  const offering = getOffering(slug);
  if (!offering) {
    console.error(`[offering-page] No offering found for slug "${slug}"`);
    return;
  }

  const target = document.getElementById('offeringContent');
  if (target) {
    target.innerHTML = renderOfferingPage(offering);
  }

  initPublicPage();
}

if (typeof window !== 'undefined') {
  window.aapOffering = { initOfferingPage };
}
