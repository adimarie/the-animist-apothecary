/*
  coming-soon.js — the veil: every page except Home shows the "still being
  woven" notice with a form to join the email list (newsletters and
  announcements). The form posts to the same intranet RPC as the Home signup
  (contact_upsert_public, tag "Newsletter"), so every signup lands in
  Contacts > Newsletter.

  v4 (2026-11-04): path-aware. Only "/" and "/index.html" are Home; pages in
  sub-folders (letters/, portal/, _drafts/, admin/ …) are veiled like the rest,
  and the script is loaded by absolute path (/js/coming-soon.js) so it works
  from any folder. LIVE below is the only allowlist (the intranet Site → Pages
  list is not consulted). To open a page, add its path to LIVE and bump the
  ?v= on every page's script tag.

  Preview: add ?veil=off to any address to hide the veil for THIS TAB only
  (sessionStorage; closing the tab restores it). ?veil=on restores it at once.
  The old ?preview=1 bypass was sticky per browser and is retired: any stored
  flag from it is cleared here so no browser stays veil-less by accident.
*/
(function () {
  var LIVE = [
    "/", "/index.html",
    "/intake.html", "/immersion-intake.html"   // participant intake notes already in use (phrase-gated / linked from invitations)
  ];
  var path = (location.pathname || "/").toLowerCase();
  var last = path.split("/").pop();
  if (last && last.indexOf(".") === -1) path += ".html";       // clean URLs: /about -> /about.html
  if (LIVE.indexOf(path) !== -1) return;
  var file = last || "index";                                    // for the signup note

  try { localStorage.removeItem("aap-preview"); } catch (e) {}  // retire the old sticky bypass
  try {
    var qs = new URLSearchParams(location.search);
    if (qs.get("veil") === "off") sessionStorage.setItem("aap-veil-off", "1");
    if (qs.get("veil") === "on") sessionStorage.removeItem("aap-veil-off");
    if (sessionStorage.getItem("aap-veil-off") === "1") return;
  } catch (e) {}

  var INTRANET_URL = "https://twmwqfmmfuwxvzkrwnui.supabase.co";
  var INTRANET_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bXdxZm1tZnV3eHZ6a3J3bnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNjQ5ODEsImV4cCI6MjA5NDc0MDk4MX0.sXjGyRuKg8yCNq_hlrhJU-UAV0XT5mBICtdlFNLEcRM";

  function build() {
    if (document.getElementById("aap-coming-soon")) return;

    var style = document.createElement("style");
    style.textContent =
      "#aap-coming-soon{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;" +
      "padding:2rem 1.25rem;background:rgba(247,245,240,0.975);-webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px);" +
      "font-family:'Cormorant Garamond',Georgia,serif;color:#2D2A26;text-align:center;overflow:auto;-webkit-overflow-scrolling:touch;}" +
      "#aap-coming-soon .acs-inner{max-width:620px;width:100%;margin:auto;}" +
      "#aap-coming-soon .acs-mark{font-size:1.7rem;line-height:1;color:#C9A84C;margin-bottom:1.5rem;}" +
      "#aap-coming-soon .acs-eyebrow{font-family:'Cinzel',serif;font-size:0.7rem;letter-spacing:0.3em;text-transform:uppercase;color:#C9A84C;display:block;margin-bottom:1.7rem;font-weight:600;}" +
      "#aap-coming-soon .acs-title{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:clamp(2rem,5vw,3rem);line-height:1.12;margin:0 0 1rem;color:#2D2A26;}" +
      "#aap-coming-soon .acs-title em{font-style:italic;color:#C9A84C;}" +
      "#aap-coming-soon .acs-sub{font-family:'Cinzel',serif;font-size:0.72rem;letter-spacing:0.22em;text-transform:uppercase;color:#886039;margin:0 0 2.1rem;}" +
      "#aap-coming-soon .acs-lead{font-size:1.28rem;line-height:1.7;color:#3a3530;margin:0 auto 2rem;max-width:30em;}" +
      "#aap-coming-soon form{display:grid;gap:0.7rem;text-align:left;max-width:480px;margin:0 auto;}" +
      "#aap-coming-soon .acs-names{display:grid;grid-template-columns:1fr 1fr;gap:0.7rem;}" +
      "#aap-coming-soon input,#aap-coming-soon select{width:100%;box-sizing:border-box;font-family:'Cormorant Garamond',Georgia,serif;font-size:1.08rem;color:#2D2A26;background:#fff;border:1px solid #D9D2C5;border-radius:2px;padding:0.8rem 0.95rem;outline:none;-webkit-appearance:none;appearance:none;}" +
      "#aap-coming-soon select{background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23886039' stroke-width='1.5'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 0.9rem center;padding-right:2.2rem;}" +
      "#aap-coming-soon select:invalid{color:#8a8278;}" +
      "#aap-coming-soon input::placeholder{color:#8a8278;}" +
      "#aap-coming-soon input:focus,#aap-coming-soon select:focus{border-color:#C9A84C;box-shadow:0 0 0 3px rgba(201,168,76,0.18);}" +
      "#aap-coming-soon .acs-btn{display:block;width:100%;cursor:pointer;font-family:'Cinzel',serif;font-size:0.82rem;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;padding:1.05rem 2.3rem;border-radius:2px;background:#2D2A26;color:#F7F5F0;border:1px solid #2D2A26;transition:all 0.3s ease;margin-top:0.2rem;}" +
      "#aap-coming-soon .acs-btn:hover{background:#C9A84C;border-color:#C9A84C;color:#2D2A26;}" +
      "#aap-coming-soon .acs-btn:disabled{opacity:0.6;cursor:default;}" +
      "#aap-coming-soon .acs-status{min-height:1.4em;margin:0.9rem 0 0;font-size:1.05rem;line-height:1.5;color:#886039;}" +
      "#aap-coming-soon .acs-status.is-success{color:#4f6b3a;}" +
      "#aap-coming-soon .acs-status.is-error{color:#9b3c2d;}" +
      "#aap-coming-soon .acs-trust{margin:0.8rem 0 0;font-size:0.98rem;color:#8a8278;}" +
      "#aap-coming-soon .acs-home{display:inline-block;margin-top:1.8rem;font-size:1.02rem;color:#886039;text-decoration:underline;text-underline-offset:3px;}" +
      "#aap-coming-soon .acs-home:hover{color:#C9A84C;}" +
      "@media(max-width:480px){#aap-coming-soon .acs-names{grid-template-columns:1fr;}}";
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
      '<p class="acs-lead">In the meantime, leave your name and email to join the list &mdash; newsletters and announcements will reach you as each door opens.</p>' +
      '<form id="acs-form" novalidate>' +
      '<div class="acs-names">' +
      '<input type="text" name="first_name" placeholder="First Name" required autocomplete="given-name" aria-label="First Name">' +
      '<input type="text" name="last_name" placeholder="Last Name" required autocomplete="family-name" aria-label="Last Name">' +
      "</div>" +
      '<input type="email" name="email" placeholder="Email Address" required autocomplete="email" aria-label="Email Address">' +
      '<input type="text" name="zip_code" placeholder="Zip Code" inputmode="numeric" autocomplete="postal-code" maxlength="10" aria-label="Zip Code">' +
      '<select name="referral_source" required aria-label="Where are you coming from?">' +
      '<option value="" disabled selected>Where are you coming from?</option>' +
      '<option value="Gathering">A gathering</option>' +
      '<option value="Event or workshop">An event or workshop</option>' +
      '<option value="Class">A class</option>' +
      '<option value="Ceremony">A ceremony</option>' +
      '<option value="Referral">A referral from someone</option>' +
      '<option value="Online">Online (social, search)</option>' +
      '<option value="Other">Other</option>' +
      "</select>" +
      '<input type="text" name="referral_detail" placeholder="Tell us more" aria-label="Tell us more" maxlength="200">' +
      '<button type="submit" class="acs-btn">Join the list</button>' +
      "</form>" +
      '<p class="acs-status" id="acs-status" aria-live="polite"></p>' +
      '<p class="acs-trust">Held with care, never shared.</p>' +
      '<a class="acs-home" href="/">Return to the home page</a>' +
      "</div>";
    document.body.appendChild(ov);
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    var form = ov.querySelector("#acs-form");
    var status = ov.querySelector("#acs-status");
    var btn = form.querySelector("button");
    function say(kind, msg) { status.textContent = msg; status.className = "acs-status" + (kind ? " is-" + kind : ""); }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var payload = {
        email: String(fd.get("email") || "").trim().toLowerCase(),
        first_name: String(fd.get("first_name") || "").trim(),
        last_name: String(fd.get("last_name") || "").trim(),
        zip: String(fd.get("zip_code") || "").trim(),
        referred_by: String(fd.get("referral_source") || "").trim(),
        notes: [String(fd.get("referral_source") || "").trim(), String(fd.get("referral_detail") || "").trim()].filter(Boolean).join(" — "),
        source_list: "veil:" + path.replace(/^\//, "").replace(/\.html$/, "").replace(/\/$/, "") || "veil",
        tags: ["Newsletter"],
        is_subscribed: true
      };
      if (!payload.first_name || !payload.last_name) return say("error", "Your full name, please — first and last — so the letters know who they are going to.");
      if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email)) return say("error", "That email address looks incomplete. One more look?");
      if (!payload.referred_by) return say("error", "One more thing: where are you coming from?");

      btn.disabled = true; btn.textContent = "Sending …"; say("", "");
      fetch(INTRANET_URL + "/rest/v1/rpc/contact_upsert_public", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: INTRANET_KEY, Authorization: "Bearer " + INTRANET_KEY, Prefer: "return=representation" },
        body: JSON.stringify({ p_payload: payload })
      }).then(function (r) {
        if (r.ok) {
          say("success", "Held with care. The next letter will arrive with the season.");
          form.querySelectorAll("input,select,button").forEach(function (el) { el.disabled = true; });
          btn.textContent = "✓ On the list";
          try { if (window.aapTrack) window.aapTrack("newsletter", { source: payload.source_list }); } catch (e) {}
        } else {
          return r.text().then(function (t) {
            var msg = "Something went wrong. Please try again, or write to its.adimarie@gmail.com.";
            try { var p = JSON.parse(t); if (p && (p.message || p.error)) msg = p.message || p.error; } catch (e) {}
            say("error", msg); btn.disabled = false; btn.textContent = "Join the list";
          });
        }
      }).catch(function () {
        say("error", "Network error. Please try again, or write to its.adimarie@gmail.com.");
        btn.disabled = false; btn.textContent = "Join the list";
      });
    });
  }

  if (document.body) build();
  else document.addEventListener("DOMContentLoaded", build);
})();
