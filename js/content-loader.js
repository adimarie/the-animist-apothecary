/*
 * content-loader.js
 *
 * Lightweight runtime patcher: fetches /_content/<page>.yml and injects
 * the values into DOM elements marked with data-content="path.to.field".
 *
 * The HTML always ships with hard-coded fallback content, so if this script
 * fails (network error, malformed YAML, etc.) the page still renders correctly.
 *
 * Usage in HTML:
 *   <body data-content-page="home">
 *     <span class="hero-eyebrow" data-content="hero.eyebrow">fallback text</span>
 *     <h1 data-content="hero.title" data-content-type="html">fallback <em>html</em></h1>
 *     <div class="hero-bg" data-content="hero.image" data-content-type="image"></div>
 *     <a href="#fallback" data-content="hero.cta_text" data-content-href="hero.cta_url">CTA</a>
 *   </body>
 *
 * Edited by Adi via /studio/ (Decap CMS).
 */

(function () {
  'use strict';

  var page = (document.body && document.body.dataset.contentPage) || null;
  if (!page) return;

  function loadJsYaml() {
    return new Promise(function (resolve, reject) {
      if (typeof window.jsyaml !== 'undefined') return resolve(window.jsyaml);
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js';
      s.onload = function () { resolve(window.jsyaml); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function getByPath(obj, path) {
    if (!obj || !path) return undefined;
    return path.split('.').reduce(function (acc, key) {
      return acc == null ? undefined : acc[key];
    }, obj);
  }

  function applyContent(content) {
    // Text / HTML / image background substitution
    document.querySelectorAll('[data-content]').forEach(function (el) {
      var value = getByPath(content, el.dataset.content);
      if (value === undefined || value === null) return;

      var type = el.dataset.contentType || 'text';
      if (type === 'image') {
        if (el.tagName === 'IMG') {
          el.src = value;
        } else {
          el.style.backgroundImage = "url('" + value + "')";
        }
        var altPath = el.dataset.contentAlt;
        if (altPath) {
          var alt = getByPath(content, altPath);
          if (alt) el.setAttribute('aria-label', alt);
        }
      } else if (type === 'html') {
        el.innerHTML = value;
      } else {
        el.textContent = value;
      }
    });

    // Anchor href substitution
    document.querySelectorAll('[data-content-href]').forEach(function (el) {
      var value = getByPath(content, el.dataset.contentHref);
      if (value !== undefined && value !== null) el.href = value;
    });

    // Background-position substitution (e.g. "center 30%")
    document.querySelectorAll('[data-content-bgpos]').forEach(function (el) {
      var value = getByPath(content, el.dataset.contentBgpos);
      if (value) el.style.backgroundPosition = String(value);
    });

    // Background-size substitution (e.g. "cover" / "contain")
    document.querySelectorAll('[data-content-bgsize]').forEach(function (el) {
      var value = getByPath(content, el.dataset.contentBgsize);
      if (value) el.style.backgroundSize = String(value);
    });
  }

  fetch('/_content/' + page + '.yml', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('content fetch ' + r.status); return r.text(); })
    .then(function (text) {
      return loadJsYaml().then(function (yaml) { return yaml.load(text); });
    })
    .then(applyContent)
    .catch(function (err) {
      // Silent: HTML fallback content is what users see.
      if (window.console && window.console.warn) console.warn('[content-loader]', err.message || err);
    });
})();
