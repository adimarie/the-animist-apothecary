/*
  coming-soon.js — soft "work in progress" overlay for pages still being built.

  v2: the list of live pages is managed from the intranet (Site → Pages).
  This script reads that list (cached for 60s per browser session) and lifts
  the veil for any page Adi has switched to Live. The hardcoded LIVE list
  below is the fail-safe baseline: those pages are never gated, even if the
  network read fails.

  Flow for a gated-by-default page: the overlay appears immediately (no
  flash of content), then lifts within a moment if the intranet list says
  the page is live.
*/
(function () {
  // Fail-safe baseline — never gated, no network needed.
  var LIVE = [
    "", "index.html",
    "sessions.html",
    "manage-booking.html",
    "events-dashboard.html",
    "proposals.html",
    "404.html"
  ];
  var file = (location.pathname.split("/").pop() || "").toLowerCase();
  if (LIVE.indexOf(file) !== -1) return;

  // Dev / preview bypass — visit any page once with ?preview=1 and the
  // overlay stays hidden for this browser until ?preview=0.
  try {
    var qs = new URLSearchParams(location.search);
    if (qs.has("preview")) {
      if (qs.get("preview") === "0") localStorage.removeItem("aap-preview");
      else localStorage.setItem("aap-preview", "1");
    }
    if (localStorage.getItem("aap-preview") === "1") return;
  } catch (e) {}

  // Cached allowlist from the intranet (60s TTL).
  var CACHE_KEY = "aap-live-pages";
  var TTL = 60000;
  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.ts || Date.now() - parsed.ts > TTL) return null;
      return parsed.pages || null;
    } catch (e) { return null; }
  }
  var cachedPages = readCache();
  if (cachedPages && cachedPages.indexOf(file) !== -1) return; // known live

  function build() {
    if (document.getElementById("aap-coming-soon")) return;

    var style = document.createElement("style");
    style.textContent =
      "#aap-coming-soon{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;" +
      "padding:2rem;background:rgba(247,245,240,0.975);-webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px);" +
      "font-family:'Cormorant Garamond',Georgia,serif;color:#2D2A26;text-align:center;overflow:auto;}" +
      "#aap-coming-soon .acs-inner{max-width:620px;}" +
      "#aap-coming-soon .acs-mark{font-size:1.7rem;line-height:1;color:#C9A84C;margin-bottom:1.5rem;}" +
      "#aap-coming-soon .acs-eyebrow{font-family:'Cinzel',serif;font-size:0.7rem;letter-spacing:0.3em;text-transform:uppercase;color:#C9A84C;display:block;margin-bottom:1.7rem;font-weight:600;}" +
      "#aap-coming-soon .acs-title{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:clamp(2rem,5vw,3rem);line-height:1.12;margin:0 0 1rem;color:#2D2A26;}" +
      "#aap-coming-soon .acs-title em{font-style:italic;color:#C9A84C;}" +
      "#aap-coming-soon .acs-sub{font-family:'Cinzel',serif;font-size:0.72rem;letter-spacing:0.22em;text-transform:uppercase;color:#886039;margin:0 0 2.1rem;}" +
      "#aap-coming-soon .acs-lead{font-size:1.28rem;line-height:1.7;color:#3a3530;margin:0 0 2.5rem;}" +
      "#aap-coming-soon .acs-btn{display:inline-block;font-family:'Cinzel',serif;font-size:0.82rem;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;padding:1.05rem 2.3rem;border-radius:2px;background:#2D2A26;color:#F7F5F0;border:1px solid #2D2A26;transition:all 0.3s ease;}" +
      "#aap-coming-soon .acs-btn:hover{background:#C9A84C;border-color:#C9A84C;color:#2D2A26;}" +
      "#aap-coming-soon .acs-home{display:block;margin-top:1.8rem;font-size:1.02rem;color:#886039;text-decoration:underline;text-underline-offset:3px;}" +
      "#aap-coming-soon .acs-home:hover{color:#C9A84C;}";
    document.head.appendChild(style);

    var ov = document.createElement("div");
    ov.id = "aap-coming-soon";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-label", "This page is coming soon");
    ov.innerHTML =
      '<div class="acs-inner">' +
      '<div class="acs-mark">❧</div>' +
      '<span class="acs-eyebrow">The Animist Apothecary</span>' +
      '<h1 class="acs-title">This part of the site is still being <em>woven</em>.</h1>' +
      '<p class="acs-sub">Work in progress &middot; Coming soon</p>' +
      '<p class="acs-lead">In the meantime, begin where everyone begins &mdash; an introductory session, one&#8209;on&#8209;one.</p>' +
      '<a class="acs-btn" href="sessions.html">Begin with an introductory session &rarr;</a>' +
      '<a class="acs-home" href="index.html">Return to the home page</a>' +
      "</div>";
    document.body.appendChild(ov);

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function lift() {
    var ov = document.getElementById("aap-coming-soon");
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  if (document.body) build();
  else document.addEventListener("DOMContentLoaded", build);

  // Ask the intranet whether this page has been switched to Live.
  try {
    var URL_ = "https://twmwqfmmfuwxvzkrwnui.supabase.co/rest/v1/site_pages_public?select=page";
    var KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bXdxZm1tZnV3eHZ6a3J3bnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNjQ5ODEsImV4cCI6MjA5NDc0MDk4MX0.sXjGyRuKg8yCNq_hlrhJU-UAV0XT5mBICtdlFNLEcRM";
    fetch(URL_, { headers: { apikey: KEY, Authorization: "Bearer " + KEY } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (rows) {
        if (!rows) return; // network trouble: veil stays, fail-safe
        var pages = rows.map(function (r) { return String(r.page || "").toLowerCase(); });
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), pages: pages })); } catch (e) {}
        if (pages.indexOf(file) !== -1) lift();
      })
      .catch(function () { /* veil stays */ });
  } catch (e) {}
})();
