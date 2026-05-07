/*
 * content-loader.js
 *
 * Reads /_content/<page>.yml and patches DOM elements via data-content attrs.
 *
 * Single-value pattern (text / html / image / link href / bg position / bg size):
 *   <span data-content="hero.eyebrow">fallback</span>
 *   <h1 data-content="hero.title" data-content-type="html">fallback</h1>
 *   <div class="hero-bg" data-content="hero.image" data-content-type="image"
 *        data-content-bgpos="hero.image_position" data-content-bgsize="hero.image_size"></div>
 *   <a data-content="cta_text" data-content-href="cta_url">fallback</a>
 *
 * List pattern (repeating items from a YAML array):
 *   <ul data-content-list="practitioner.quals">
 *     <li data-content-list-template data-content=".">Fallback qual</li>
 *   </ul>
 *
 *   <div class="cards" data-content-list="offerings.cards">
 *     <div class="card" data-content-list-template>
 *       <div class="card-img" data-content=".image" data-content-type="image"></div>
 *       <h3 data-content=".title">Fallback title</h3>
 *       <p data-content=".description">Fallback description</p>
 *       <a data-content=".link_text" data-content-href=".link_url">Learn more</a>
 *     </div>
 *   </div>
 *
 * The HTML always ships with hard-coded fallback content, so if this script
 * fails, the page still renders.
 */

(function () {
  'use strict';

  var page = (document.body && document.body.dataset.contentPage) || null;
  if (!page) return;

  var ATTR_TARGETS = ['content', 'contentHref', 'contentAlt', 'contentBgpos', 'contentBgsize'];

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
    if (path === '.') return obj;
    return path.split('.').reduce(function (acc, key) {
      return acc == null ? undefined : acc[key];
    }, obj);
  }

  // Rewrite a relative path like ".title" or "." to absolute "<base>.<index>.title" / "<base>.<index>"
  function absolutize(rel, base, index) {
    if (rel === '.') return base + '.' + index;
    if (rel.charAt(0) === '.') return base + '.' + index + rel;
    return rel; // already absolute
  }

  // Expand list templates BEFORE running the value pass.
  function expandLists(content, root) {
    var lists = (root || document).querySelectorAll('[data-content-list]');
    lists.forEach(function (parent) {
      var basePath = parent.dataset.contentList;
      var arr = getByPath(content, basePath);
      if (!Array.isArray(arr)) return;

      var template = parent.querySelector('[data-content-list-template]');
      if (!template) return;
      // Detach template from DOM (we'll clone from it)
      template.removeAttribute('data-content-list-template');
      var tplClone = template.cloneNode(true);
      tplClone.style.display = '';
      template.parentNode.removeChild(template);

      // Remove any previous clones (for hot-reload safety)
      parent.querySelectorAll('[data-content-list-clone]').forEach(function (c) { c.remove(); });

      arr.forEach(function (_, i) {
        var clone = tplClone.cloneNode(true);
        clone.setAttribute('data-content-list-clone', '');
        // Rewrite data-content* attrs whose value is relative
        ATTR_TARGETS.forEach(function (attr) {
          if (clone.dataset && clone.dataset[attr]) {
            clone.dataset[attr] = absolutize(clone.dataset[attr], basePath, i);
          }
          var camelToData = attr.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); });
          clone.querySelectorAll('[data-' + camelToData + ']').forEach(function (el) {
            el.dataset[attr] = absolutize(el.dataset[attr], basePath, i);
          });
        });
        parent.appendChild(clone);
      });
    });
  }

  function applyValues(content, root) {
    var ctx = root || document;

    // Text / HTML / image background substitution
    ctx.querySelectorAll('[data-content]').forEach(function (el) {
      var path = el.dataset.content;
      var value = getByPath(content, path);
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
    ctx.querySelectorAll('[data-content-href]').forEach(function (el) {
      var value = getByPath(content, el.dataset.contentHref);
      if (value !== undefined && value !== null) el.href = value;
    });

    // Background-position substitution
    ctx.querySelectorAll('[data-content-bgpos]').forEach(function (el) {
      var value = getByPath(content, el.dataset.contentBgpos);
      if (value) el.style.backgroundPosition = String(value);
    });

    // Background-size substitution
    ctx.querySelectorAll('[data-content-bgsize]').forEach(function (el) {
      var value = getByPath(content, el.dataset.contentBgsize);
      if (value) el.style.backgroundSize = String(value);
    });
  }

  function applyContent(content) {
    expandLists(content);
    applyValues(content);
  }

  fetch('/_content/' + page + '.yml', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('content fetch ' + r.status); return r.text(); })
    .then(function (text) {
      return loadJsYaml().then(function (yaml) { return yaml.load(text); });
    })
    .then(applyContent)
    .catch(function (err) {
      if (window.console && window.console.warn) console.warn('[content-loader]', err.message || err);
    });
})();
