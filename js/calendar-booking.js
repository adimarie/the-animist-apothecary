/* ============================================================================
   calendar-booking.js — The Animist Apothecary
   Self-contained in-house booking widget. Drop into any page with:

     <div id="booking-calendar"
          data-services="intake-inquiry,divination"></div>
     <script src="js/calendar-booking.js" defer></script>

   It talks to three Supabase endpoints on project wdecjlrfulsdklqeetqb:
     - REST  /rest/v1/services         (public read)
     - REST  /rest/v1/service_tiers    (public read — sliding-scale prices)
     - FUNC  /functions/v1/get-availability   (reads Adi's Google Calendar)
     - FUNC  /functions/v1/create-booking     (writes the Google event + emails)

   Flow, all on one page:
     1. Choose the offering          4. Choose your reciprocity (tier)
     2. Choose the day               5. Your details + intake questions
     3. Choose the hour              → Confirm → booking is held → pay by Venmo

   Payment is a same-page Venmo handoff (manual reconciliation) per the
   locked v1 decision — personal Venmo cannot auto-confirm a payment.
   ========================================================================== */
(function () {
  "use strict";

  var MOUNT_ID = "booking-calendar";

  // ---- Config (overridable via data-* attributes on the mount) -------------
  var DEFAULTS = {
    supabaseUrl: "https://wdecjlrfulsdklqeetqb.supabase.co",
    supabaseKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZWNqbHJmdWxzZGtscWVldHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODQwMTQsImV4cCI6MjA4ODY2MDAxNH0.mIBgkpU24IgxnzS8kR06FOL6_1Z9NmaEDe9z36CxtHs",
    services: "intake-inquiry,guidance-counsel,divination",
    venmo: "TheAnimistApothecary",
    serviceTz: "America/Los_Angeles",
    categoryLabel: "One-on-One Virtual Sessions",
    comingSoon: "Virtual Group Sessions|In-Person Gatherings",
  };

  // ---- Module state --------------------------------------------------------
  var cfg = null;
  var root = null;
  var catalog = [];           // [{id,slug,name,duration_minutes,description,tiers:[...]}]
  var monthCache = {};        // "slug:YYYY-MM" -> { byDay: {YYYY-MM-DD:[slot]}, error }
  var clientTz = detectTz();

  var sel = {
    service: null,            // catalog entry
    viewYear: null,
    viewMonth: null,          // 0-indexed
    dayKey: null,             // "YYYY-MM-DD" in clientTz
    slot: null,               // {start,end}
    tier: null,               // tier object
    prepared: false,          // the before-your-session step confirmed
    applyingFor: null,        // "solo" | "group" | "training" when arriving from an apply link
    applyingLabel: null,      // what they chose, shown on the confirmation
  };

  // What someone has typed into the details step survives a re-render.
  var formMemo = {};
  var FORM_IDS = ["bk-first", "bk-last", "bk-email", "bk-phone", "bk-applying", "bk-carrying", "bk-care", "bk-referral"];
  function keepForm() {
    FORM_IDS.forEach(function (id) { var el = document.getElementById(id); if (el) formMemo[id] = el.value; });
  }
  function restoreForm() {
    FORM_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && formMemo[id] != null && formMemo[id] !== "") el.value = formMemo[id];
    });
  }

  // ---- Boot ----------------------------------------------------------------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    root = document.getElementById(MOUNT_ID);
    if (!root) return;
    cfg = readConfig(root);
    injectStyles();
    root.classList.add("aap-bk");
    var now = new Date();
    sel.viewYear = now.getFullYear();
    sel.viewMonth = now.getMonth();
    renderLoading();
    loadCatalog()
      .then(function () {
        render();
        fillPrepMount();
        openFromHash();
        window.addEventListener("hashchange", openFromHash);
        // A second click on the same link changes no hash, so answer the click itself.
        document.addEventListener("click", function (e) {
          var a = e.target && e.target.closest ? e.target.closest('a[href^="#apply-"],a[href^="#book-"]') : null;
          if (a && a.getAttribute("href") === location.hash) { e.preventDefault(); openFromHash(); }
        });
      })
      .catch(function (err) {
        renderFatal(
          "The booking calendar couldn't load right now. Please refresh, or write to Adi Marie at hello@theanimistapothecary.com.",
          err
        );
      });
  }

  // A link such as #book-intake-inquiry opens that card (same page or from elsewhere).
  // A link such as #apply-group opens the Intake & Inquiry with "Group Work" already chosen.
  var APPLY = { solo: "Solo Work", group: "Group Work", training: "The Training Grounds" };
  function openFromHash() {
    var hash = location.hash || "";
    var a = /^#apply-(solo|group|training)$/.exec(hash);
    var m = a ? [hash, "intake-inquiry"] : /^#book-([a-z0-9-]+)$/.exec(hash);
    if (!m) return;
    var s = catalog.find(function (x) { return x.slug === m[1]; });
    if (!s) return;
    var changed = !sel.service || sel.service.id !== s.id;
    sel.service = s;
    if (changed) { sel.dayKey = null; sel.slot = null; sel.tier = null; sel.prepared = false; }
    if (a) { sel.applyingFor = a[1]; formMemo["bk-applying"] = APPLY[a[1]]; }
    sel._scroll = false;
    render();
    paintMonthGrid();
    var card = document.getElementById("book-" + s.slug);
    if (card) {
      var header = document.querySelector(".site-header");
      var offset = (header ? header.offsetHeight : 90) + 16;
      window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - offset, behavior: "auto" });
    }
  }

  function readConfig(el) {
    var d = el.dataset || {};
    return {
      supabaseUrl: (d.supabaseUrl || DEFAULTS.supabaseUrl).replace(/\/$/, ""),
      supabaseKey: d.supabaseKey || DEFAULTS.supabaseKey,
      services: (d.services || DEFAULTS.services).split(",").map(trim).filter(Boolean),
      venmo: d.venmo || DEFAULTS.venmo,
      serviceTz: d.serviceTz || DEFAULTS.serviceTz,
      categoryLabel: d.categoryLabel != null ? d.categoryLabel : DEFAULTS.categoryLabel,
      slidingScale: (d.slidingScale != null ? d.slidingScale : "").split(",").map(trim).filter(Boolean),
      cardLayout: d.cardLayout || "",
      comingSoon: (d.comingSoon != null ? d.comingSoon : DEFAULTS.comingSoon).split("|").map(trim).filter(Boolean),
    };
  }

  // ---- Data ----------------------------------------------------------------
  function restHeaders() {
    return { apikey: cfg.supabaseKey, Authorization: "Bearer " + cfg.supabaseKey };
  }

  function loadCatalog() {
    var slugList = "(" + cfg.services.map(encodeURIComponent).join(",") + ")";
    var svcUrl =
      cfg.supabaseUrl +
      "/rest/v1/services?select=id,slug,name,duration_minutes,description_long,description" +
      "&slug=in." + slugList +
      "&is_publicly_bookable=eq.true&is_archived=eq.false";
    return fetch(svcUrl, { headers: restHeaders() })
      .then(okJson)
      .then(function (services) {
        if (!services.length) throw new Error("No publicly bookable services found");
        var ids = "(" + services.map(function (s) { return s.id; }).join(",") + ")";
        var tierUrl =
          cfg.supabaseUrl +
          "/rest/v1/service_tiers?select=id,service_id,tier_name,tier_eyebrow,tier_color,min_amount_cents,suggested_amount_cents,display_order,is_available" +
          "&service_id=in." + ids +
          "&is_available=eq.true&order=display_order.asc";
        return fetch(tierUrl, { headers: restHeaders() })
          .then(okJson)
          .then(function (tiers) {
            // Preserve the order the page asked for.
            catalog = cfg.services
              .map(function (slug) {
                return services.find(function (s) { return s.slug === slug; });
              })
              .filter(Boolean)
              .map(function (s) {
                s.tiers = tiers
                  .filter(function (t) { return t.service_id === s.id; })
                  .sort(function (a, b) { return a.display_order - b.display_order; });
                return s;
              });
          });
      });
  }

  function loadMonth(slug, year, month) {
    var key = slug + ":" + year + "-" + pad(month + 1);
    if (monthCache[key]) return Promise.resolve(monthCache[key]);

    // Request the whole visible month in service-local (PT) date terms,
    // but never before today.
    var first = new Date(year, month, 1);
    var last = new Date(year, month + 1, 0);
    var today = startOfDay(new Date());
    var startDate = isoDateLocal(first < today ? today : first);
    var endDate = isoDateLocal(last);

    var url =
      cfg.supabaseUrl +
      "/functions/v1/get-availability?service=" + encodeURIComponent(slug) +
      "&start_date=" + startDate + "&end_date=" + endDate +
      "&timezone=" + encodeURIComponent(clientTz);

    return fetch(url, { headers: restHeaders() })
      .then(okJson)
      .then(function (data) {
        var byDay = {};
        (data.slots || []).forEach(function (s) {
          var dk = dayKeyInTz(s.start, clientTz);
          (byDay[dk] = byDay[dk] || []).push(s);
        });
        Object.keys(byDay).forEach(function (dk) {
          byDay[dk].sort(function (a, b) {
            return new Date(a.start) - new Date(b.start);
          });
        });
        var entry = { byDay: byDay, error: null };
        monthCache[key] = entry;
        return entry;
      })
      .catch(function (err) {
        var entry = { byDay: {}, error: err };
        monthCache[key] = entry;
        return entry;
      });
  }

  function createBooking(payload) {
    return fetch(cfg.supabaseUrl + "/functions/v1/create-booking", {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, restHeaders()),
      body: JSON.stringify(payload),
    }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) throw new Error(body.error || "Booking failed (" + res.status + ")");
        return body;
      });
    });
  }

  // ---- Render: shell -------------------------------------------------------
  function render() {
    if (!sel.service && catalog.length === 1) sel.service = catalog[0];
    keepForm();
    var html = "";
    html += stepOffering();
    if (sel.service) {
      var schedUrl = schedulerUrlFor(sel.service);
      if (schedUrl) {
        // Sessions whose availability lives in a Google appointment schedule:
        // embed Google's scheduler + the sliding-scale Venmo reciprocity.
        html += stepScheduler(schedUrl);
      } else {
        html += stepDay();
        if (sel.dayKey) html += stepHour();
        if (sel.slot) html += stepPrepare();
        if (sel.slot && sel.prepared) html += stepTier();
        if (sel.tier) html += stepDetails();
      }
    }
    root.innerHTML = '<div class="aap-bk-card">' + html + "</div>";
    bindShell();
    restoreForm();
    // Bring the newest revealed step into view (not on first paint).
    if (sel.service) {
      var active = root.querySelector(".aap-bk-step--active:last-of-type");
      if (active && sel._scroll) {
        active.scrollIntoView({ behavior: "auto", block: "nearest" });
      }
    }
    sel._scroll = false;
  }

  function stepHeader(n, label, valueText, active) {
    return (
      '<div class="aap-bk-stephead">' +
      '<span class="aap-bk-num' + (active ? " is-on" : "") + '">' + n + "</span>" +
      '<span class="aap-bk-label">' + label + "</span>" +
      (valueText ? '<span class="aap-bk-chosen">' + esc(valueText) + "</span>" : "") +
      "</div>"
    );
  }

  // ---- Step 1: offering ----------------------------------------------------
  function stepOffering() {
    var chosen = sel.service ? sel.service.name : "";
    var body = "";
    if (cfg.categoryLabel) body += '<p class="aap-bk-cat-label">' + esc(cfg.categoryLabel) + "</p>";
    body += '<div class="aap-bk-offerings">';
    var wide = cfg.cardLayout === "wide";
    catalog.forEach(function (s) {
      var on = sel.service && sel.service.id === s.id;
      var inner =
        '<span class="aap-bk-offering-dur">' + fmtDuration(s.duration_minutes) + "</span>" +
        '<span class="aap-bk-offering-name">' + esc(s.name) + "</span>" +
        (s.description ? '<span class="aap-bk-offering-desc">' + esc(s.description) + "</span>" : "");
      if (wide) {
        body +=
          '<button type="button" id="book-' + esc(s.slug) + '" class="aap-bk-offering aap-bk-offering--wide' + (on ? " is-on" : "") +
          '" data-svc="' + esc(s.slug) + '">' +
          '<span class="aap-bk-offering-media" aria-hidden="true"></span>' +
          '<span class="aap-bk-offering-body">' + inner +
          '<span class="aap-bk-offering-go">Schedule your session &rarr;</span></span>' +
          "</button>";
      } else {
        body +=
          '<button type="button" id="book-' + esc(s.slug) + '" class="aap-bk-offering' + (on ? " is-on" : "") +
          '" data-svc="' + esc(s.slug) + '">' + inner + "</button>";
      }
    });
    body += "</div>";
    // Coming-soon categories (not yet bookable)
    if (cfg.comingSoon && cfg.comingSoon.length) {
      body += '<div class="aap-bk-soon">';
      cfg.comingSoon.forEach(function (name) {
        body +=
          '<div class="aap-bk-soon-card" aria-disabled="true">' +
          '<span class="aap-bk-soon-name">' + esc(name) + "</span>" +
          '<span class="aap-bk-soon-tag">Coming soon</span>' +
          "</div>";
      });
      body += "</div>";
    }
    return section("offering", stepHeader(1, "The offering", chosen, !chosen) + body, true);
  }

  // ---- Step 2: day ---------------------------------------------------------
  function stepDay() {
    var monthName = new Date(sel.viewYear, sel.viewMonth, 1).toLocaleDateString("en-US", {
      month: "long", year: "numeric",
    });
    var chosen = sel.dayKey ? prettyDay(sel.dayKey) : "";
    var canBack = !isViewBeforeOrAtCurrentMonth();
    var head = stepHeader(2, "The day", chosen, !!sel.service && !sel.dayKey);
    var grid =
      '<div class="aap-bk-cal">' +
      '<div class="aap-bk-cal-nav">' +
      '<button type="button" class="aap-bk-monthbtn" data-mo="-1"' + (canBack ? "" : " disabled") + ' aria-label="Previous month">&larr;</button>' +
      '<span class="aap-bk-month">' + esc(monthName) + "</span>" +
      '<button type="button" class="aap-bk-monthbtn" data-mo="1" aria-label="Next month">&rarr;</button>' +
      "</div>" +
      '<div class="aap-bk-cal-body" id="aap-bk-calbody">' + renderMonthGridLoading() + "</div>" +
      '<p class="aap-bk-cal-note">Times shown in <strong>' + esc(prettyTz(clientTz)) + "</strong>. Gold marks an open day.</p>" +
      "</div>";
    return section("day", head + grid, true);
  }

  function renderMonthGridLoading() {
    return '<div class="aap-bk-loadrow"><span class="aap-bk-spin"></span> Reading Adi Marie’s calendar…</div>';
  }

  function paintMonthGrid() {
    var body = document.getElementById("aap-bk-calbody");
    if (!body || !sel.service) return;
    var reqSlug = sel.service.slug, reqY = sel.viewYear, reqM = sel.viewMonth;
    loadMonth(reqSlug, reqY, reqM).then(function (entry) {
      // Guard: the selected service or month may have changed while loading —
      // if so, a later paint owns the grid; don't clobber it with stale data.
      if (!sel.service || sel.service.slug !== reqSlug || sel.viewYear !== reqY || sel.viewMonth !== reqM) return;
      var stillVisible = document.getElementById("aap-bk-calbody");
      if (!stillVisible) return;
      if (entry.error) {
        stillVisible.innerHTML =
          '<div class="aap-bk-err">Couldn’t load this month’s openings. Try another month or refresh.</div>';
        return;
      }
      stillVisible.innerHTML = buildMonthGrid(entry.byDay);
      bindDayButtons();
    });
  }

  function buildMonthGrid(byDay) {
    var dows = ["S", "M", "T", "W", "T", "F", "S"];
    var first = new Date(sel.viewYear, sel.viewMonth, 1);
    var startPad = first.getDay();
    var daysInMonth = new Date(sel.viewYear, sel.viewMonth + 1, 0).getDate();
    var todayKey = isoDateLocal(new Date());

    var html = '<div class="aap-bk-dow">';
    dows.forEach(function (d) { html += "<span>" + d + "</span>"; });
    html += '</div><div class="aap-bk-days">';

    for (var i = 0; i < startPad; i++) html += '<span class="aap-bk-day is-empty"></span>';

    for (var day = 1; day <= daysInMonth; day++) {
      var dk = sel.viewYear + "-" + pad(sel.viewMonth + 1) + "-" + pad(day);
      var slots = byDay[dk] || [];
      var isPast = dk < todayKey;
      var open = slots.length > 0 && !isPast;
      var isSel = sel.dayKey === dk;
      var cls = "aap-bk-day";
      if (isPast) cls += " is-past";
      if (open) cls += " is-open";
      if (isSel) cls += " is-sel";
      html +=
        '<button type="button" class="' + cls + '"' +
        (open ? ' data-day="' + dk + '"' : " disabled") +
        ' aria-label="' + esc(prettyDay(dk)) + (open ? ", " + slots.length + " open" : "") + '">' +
        '<span class="aap-bk-daynum">' + day + "</span>" +
        (open ? '<span class="aap-bk-dot"></span>' : "") +
        "</button>";
    }
    html += "</div>";
    return html;
  }

  // ---- Step 3: hour --------------------------------------------------------
  function stepHour() {
    var chosen = sel.slot ? fmtTime(sel.slot.start, clientTz) : "";
    var head = stepHeader(3, "The hour", chosen, !!sel.dayKey && !sel.slot);
    var entry = monthCache[sel.service.slug + ":" + sel.viewYear + "-" + pad(sel.viewMonth + 1)];
    var slots = (entry && entry.byDay[sel.dayKey]) || [];
    var body = '<div class="aap-bk-slots">';
    if (!slots.length) {
      body += '<p class="aap-bk-quiet">No open hours that day. Choose another.</p>';
    } else {
      var showPt = clientTz !== cfg.serviceTz;
      slots.forEach(function (s) {
        var on = sel.slot && sel.slot.start === s.start;
        body +=
          '<button type="button" class="aap-bk-slot' + (on ? " is-on" : "") +
          '" data-slot="' + esc(s.start) + '">' +
          fmtTime(s.start, clientTz) +
          (showPt ? '<span class="aap-bk-slot-pt">' + fmtTime(s.start, cfg.serviceTz) + " PT</span>" : "") +
          "</button>";
      });
    }
    body += "</div>";
    return section("hour", head + body, true);
  }

  // ---- Step 4: before your session ----------------------------------------
  // Her ask (2026-11-09): once the hour is chosen, show what must be completed
  // before the session, with a check mark to confirm, before reciprocity.
  // Every line below is in her own words: PREP_COMMON from her booking notes,
  // the Divination lines and the cancellation terms from her Divination page.
  // Intake & Inquiry and Guidance & Counsel have no lines of their own yet.
  var PREP_COMMON = [
    "Please find a space to be comfortable where we may sit and connect in the depth of what brings you to this work, without distraction. Also, it is highly recommended to attend these sessions on a laptop or desktop, and not on a cellular or tablet device.",
    "Please complete payment in full at the time of booking your session."
  ];
  var PREP = {
    "divination": [
      "Reflect on two to three areas of life where you seek clarity or support.",
      "Bring a quarter or .25 cent coin, perhaps a journal, a recording device (we can also record on Zoom), and get comfortable.",
      "You’re welcome to have nearby any sacred items (stones, photos, heirlooms, etc.) you’d like to keep close."
    ]
  };
  var PREP_DOCS = "Some of these sessions require follow-up, supplementary intake, or documents. All of it is sent by email once your hour is held.";
  // Her policy, 2026-11-12: no cancellations; reschedule up to 3 days before; inside that, message her (most likely forfeit).
  var TERMS = [
    ["Up to 3 days before", "Reschedule with the link in your confirmation email. There are no cancellations or refunds."],
    ["Less than 3 days before", "Please reply to your confirmation email. The session is most likely forfeit."]
  ];
  function prepItems(slug) { return (PREP[slug] || []).concat(PREP_COMMON); }
  function prepList(slug, cls) {
    return '<ul class="' + (cls || "aap-bk-prep") + '">' +
      prepItems(slug).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>";
  }
  function termsBlock() {
    return '<details class="aap-bk-terms"><summary>Rescheduling</summary>' +
      "<p>Life moves. Please give as much notice as you’re able.</p><dl>" +
      TERMS.map(function (t) { return "<dt>" + esc(t[0]) + "</dt><dd>" + esc(t[1]) + "</dd>"; }).join("") +
      "</dl></details>";
  }

  // On the page itself: one drop-down per session with what to complete beforehand.
  function fillPrepMount() {
    var mount = document.querySelector("[data-aap-prep]");
    if (!mount) return;
    mount.innerHTML = catalog.map(function (s) {
      return "<details><summary>" + esc(s.name) + "</summary>" + prepList(s.slug, "dr-prep-items") + "</details>";
    }).join("");
  }

  function stepPrepare() {
    var head = stepHeader(4, "Before your session", sel.prepared ? "Confirmed" : "", !!sel.slot && !sel.prepared);
    var body =
      '<p class="aap-bk-quiet aap-bk-prep-intro">Things you must complete before your ' + esc(sel.service.name) + ".</p>" +
      prepList(sel.service.slug) +
      '<p class="aap-bk-quiet aap-bk-prep-note">' + esc(PREP_DOCS) + "</p>" +
      termsBlock() +
      '<label class="aap-bk-checkrow' + (sel.prepared ? " is-on" : "") + '">' +
      '<input type="checkbox" id="bk-prepared"' + (sel.prepared ? " checked" : "") + ">" +
      "<span>I have read this, and I will complete it before my session.</span>" +
      "</label>";
    return section("prepare", head + body, true);
  }

  function fmtAmount(cents) {
    var n = Math.round((cents || 0) / 100);
    return "$" + n.toLocaleString("en-US");
  }

  // ---- Step 5: tier --------------------------------------------------------
  // Her ask (2026-11-09): the sliding scale shown with its amounts.
  function stepTier() {
    var chosen = sel.tier ? sel.tier.tier_name + " · " + fmtAmount(sel.tier.min_amount_cents) : "";
    var head = stepHeader(5, "Your reciprocity", chosen, sel.prepared && !sel.tier);
    var body =
      '<p class="aap-bk-quiet aap-bk-tier-intro">This work is offered through a sliding scale. Choose the tier that’s true for you — considering resources, stability, and the value you feel you’re receiving.</p>' +
      '<div class="aap-bk-tiers">';
    (sel.service.tiers || []).forEach(function (t) {
      var on = sel.tier && sel.tier.id === t.id;
      body +=
        '<button type="button" class="aap-bk-tier' + (on ? " is-on" : "") +
        '" data-tier="' + esc(t.id) + '">' +
        (t.tier_eyebrow ? '<span class="aap-bk-tier-eyebrow">' + esc(t.tier_eyebrow) + "</span>" : "") +
        '<span class="aap-bk-tier-name">' + esc(t.tier_name) + "</span>" +
        '<span class="aap-bk-tier-amt">' + fmtAmount(t.min_amount_cents) + "</span>" +
        "</button>";
    });
    body += "</div>" +
      '<div class="aap-bk-tier-notes">' +
      "<p>You’re welcome to offer within or beyond these rates as feels aligned — balancing accessibility, appreciation, and capacity.</p>" +
      "<p>Note: I hold a limited number of Accessibility and Community rate sessions each season. These are made possible through Patron and Abundance offerings.</p>" +
      '<p>If these tiers are currently beyond your means, please take a moment to review the <a href="/sacred-reciprocity.html" target="_blank" rel="noopener">Sacred Reciprocity</a> page, and then ' +
      (document.getElementById("note") ? '<a href="#note">reach out</a>' : "reach out") +
      " so we can find a sustainable path together.</p>" +
      "</div>";
    return section("tier", head + body, true);
  }

  // ---- Step 6: details + intake -------------------------------------------
  // The Intake & Inquiry is the application to what comes after it; ask which.
  function isGroupIntake() {
    if (!sel.service || sel.service.slug !== "intake-inquiry") return false;
    var chosen = (typeof formMemo !== "undefined" && formMemo["bk-applying"]) || (sel.applyingFor ? APPLY[sel.applyingFor] : "");
    return chosen === APPLY.group;
  }

  function applyingField() {
    if (!sel.service || sel.service.slug !== "intake-inquiry") return "";
    var chosen = sel.applyingFor ? APPLY[sel.applyingFor] : "";
    var opts = [APPLY.solo, APPLY.group, APPLY.training, "I’m not sure yet"];
    return field(
      "What are you applying for?",
      '<select class="aap-bk-input aap-bk-select" id="bk-applying">' +
      '<option value="">Choose one</option>' +
      opts.map(function (o) {
        return '<option value="' + esc(o) + '"' + (o === chosen ? " selected" : "") + ">" + esc(o) + "</option>";
      }).join("") +
      "</select>"
    );
  }

  function stepDetails() {
    var head = stepHeader(6, "Your details", "", true);
    var body =
      '<div class="aap-bk-form" id="aap-bk-form">' +
      row(
        field("First name", '<input class="aap-bk-input" id="bk-first" type="text" autocomplete="given-name" required>') +
        field("Last name", '<input class="aap-bk-input" id="bk-last" type="text" autocomplete="family-name" required>')
      ) +
      row(
        field("Email", '<input class="aap-bk-input" id="bk-email" type="email" autocomplete="email" required>') +
        field("Phone <em>(optional)</em>", '<input class="aap-bk-input" id="bk-phone" type="tel" autocomplete="tel">')
      ) +
      applyingField() +
      field(
        "What’s bringing you to this session?",
        '<textarea class="aap-bk-textarea" id="bk-carrying" rows="3" placeholder="Where you are, what you’re navigating, what you’re hoping to find. There is no wrong thing to say — only the true thing."></textarea>'
      ) +
      field(
        "Anything important to know to meet you with care? <em>(optional)</em>",
        '<textarea class="aap-bk-textarea" id="bk-care" rows="2"></textarea>'
      ) +
      // Group work is by referral (her ask, 2026-11-13): when the intake is for Group Work, the question becomes required.
      field(
        isGroupIntake()
          ? "Who referred you, or where did you come from? <em>(required for group work)</em>"
          : "How did you find your way here? <em>(optional)</em>",
        '<input class="aap-bk-input" id="bk-referral" type="text" placeholder="Referral, social, search, word of mouth…">'
      ) +
      '<div class="aap-bk-summary">' + summaryLine() + "</div>" +
      '<div class="aap-bk-err" id="bk-error" hidden></div>' +
      '<button type="button" class="aap-bk-submit" id="bk-submit">Hold this hour &rarr;</button>' +
      '<p class="aap-bk-fineprint">You must complete payment at the time of booking, as a personal transfer through Venmo, on the next screen. ' +
      "If payment is not received within an hour, your appointment is cancelled. A confirmation lands in your inbox right away.</p>" +
      "</div>";
    return section("details", head + body, true);
  }

  function summaryLine(withApplying) {
    return (
      '<div class="aap-bk-summary-row"><span>Offering</span><strong>' + esc(sel.service.name) + "</strong></div>" +
      '<div class="aap-bk-summary-row"><span>When</span><strong>' + esc(prettyDay(sel.dayKey)) + ", " + fmtTime(sel.slot.start, clientTz) +
      " &ndash; " + fmtTime(sel.slot.end, clientTz) + "</strong></div>" +
      '<div class="aap-bk-summary-row"><span>Length</span><strong>' + fmtDuration(sel.service.duration_minutes) + "</strong></div>" +
      '<div class="aap-bk-summary-row"><span>Reciprocity</span><strong>' + esc(sel.tier.tier_name) + " · " + fmtAmount(sel.tier.min_amount_cents) + "</strong></div>" +
      (withApplying && sel.applyingLabel
        ? '<div class="aap-bk-summary-row"><span>Applying for</span><strong>' + esc(sel.applyingLabel) + "</strong></div>"
        : "")
    );
  }

  // ---- Step 2 (alt): Google appointment scheduler -------------------------
  // For sessions whose availability is managed in a Google appointment
  // schedule, we embed Google's own booking page (so the open times come
  // straight from Adi's calendar and never clash with her personal schedule)
  // and offer the sliding-scale reciprocity by Venmo alongside.
  function schedulerUrlFor(s) {
    if (!s) return null;
    var map =
      (typeof window !== "undefined" && window.AAP_SCHEDULERS) ||
      (cfg && cfg.schedulers) || {};
    var url = map[s.slug];
    return url && /^https:\/\//.test(url) ? url : null;
  }

  function stepScheduler(url) {
    var head = stepHeader(2, "Choose your time", "", true);
    var venmoUser = cfg.venmo;
    var tiers = sel.service.tiers || [];
    var memo = sel.service.name + " — reciprocity";
    var pills = tiers
      .map(function (t) {
        var amt = t.min_amount_cents / 100;
        var link =
          "https://venmo.com/u/" + encodeURIComponent(venmoUser) +
          "?txn=pay&amount=" + encodeURIComponent(amt) +
          "&note=" + encodeURIComponent(memo);
        return (
          '<a class="aap-bk-tier aap-bk-tier--link" href="' + link + '" target="_blank" rel="noopener">' +
          (t.tier_eyebrow ? '<span class="aap-bk-tier-eyebrow">' + esc(t.tier_eyebrow) + "</span>" : "") +
          '<span class="aap-bk-tier-name">' + esc(t.tier_name) + "</span>" +
          "</a>"
        );
      })
      .join("");
    var body =
      '<p class="aap-bk-quiet aap-bk-sched-intro">Pick an open hour below — drawn live from Adi Marie’s calendar. A calendar invitation with the meeting link lands in your inbox the moment you confirm.</p>' +
      '<div class="aap-bk-sched-panel">' +
      '<div class="aap-bk-sched-bar"><span class="aap-bk-sched-dot" aria-hidden="true"></span>' +
      '<span class="aap-bk-sched-bar-label">Live availability</span>' +
      '<span class="aap-bk-sched-bar-name">' + esc(sel.service.name) + " · " + fmtDuration(sel.service.duration_minutes) + "</span></div>" +
      '<div class="aap-bk-sched-frame"><iframe title="' + esc(sel.service.name) +
      ' — choose a time" src="' + esc(url) + '" loading="lazy"></iframe></div>' +
      "</div>" +
      '<p class="aap-bk-quiet aap-bk-center aap-bk-sched-fallback">If the calendar does not appear, <a href="' + esc(url) +
      '" target="_blank" rel="noopener">open the booking page in a new tab &rarr;</a></p>' +
      (pills
        ? '<div class="aap-bk-sched-pay">' +
          '<p class="aap-bk-pay-label">Then complete your reciprocity</p>' +
          '<p class="aap-bk-quiet aap-bk-center aap-bk-sched-payintro">A sliding scale, offered in trust. Choose what is true for you, and send by Venmo to <strong>@' +
          esc(venmoUser) + "</strong>.</p>" +
          '<div class="aap-bk-tiers aap-bk-tiers--links">' + pills + "</div>" +
          "</div>"
        : "");
    return section("scheduler", head + body, true);
  }

  // ---- Submit + confirmation ----------------------------------------------
  function submit() {
    var first = val("bk-first"), last = val("bk-last"), email = val("bk-email");
    var phone = val("bk-phone"), carrying = val("bk-carrying"), care = val("bk-care"), referral = val("bk-referral");
    var applying = val("bk-applying");
    var errEl = document.getElementById("bk-error");

    function fail(msg) {
      if (errEl) { errEl.textContent = msg; errEl.hidden = false; }
    }
    if (errEl) errEl.hidden = true;

    if (!first || !last) return fail("Please share your first and last name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Please enter a valid email so Adi Marie can reach you.");
    if (applying === APPLY.group && !referral) return fail("Group work is by referral. Please tell us who referred you, or where you came from.");

    var noteParts = [];
    if (applying) noteParts.push("Applying for: " + applying);
    sel.applyingLabel = applying || null;
    if (carrying) noteParts.push("What’s bringing them:\n" + carrying);
    if (care) noteParts.push("To meet them with care:\n" + care);
    if (referral) noteParts.push("Found via: " + referral);
    var note = noteParts.join("\n\n");

    var payload = {
      session_slug: sel.service.slug,
      tier_id: sel.tier.id,
      scheduled_start: sel.slot.start,
      client_name: (first + " " + last).trim(),
      client_email: email,
      client_phone: phone || undefined,
      client_timezone: clientTz,
      pre_session_note: note || undefined,
    };

    var btn = document.getElementById("bk-submit");
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="aap-bk-spin"></span> Holding your hour…'; }

    createBooking(payload)
      .then(function (res) {
        renderConfirmation(res, { first: first, name: payload.client_name });
      })
      .catch(function (err) {
        if (btn) { btn.disabled = false; btn.innerHTML = "Hold this hour &rarr;"; }
        if (/just taken|409/.test(String(err.message))) {
          fail("That hour was just taken. Please choose another time.");
          // Bust the cache for this month so the grid refreshes.
          delete monthCache[sel.service.slug + ":" + sel.viewYear + "-" + pad(sel.viewMonth + 1)];
        } else {
          fail("Something went wrong holding your hour: " + err.message + " — please try again, or email hello@theanimistapothecary.com.");
        }
      });
  }

  function renderConfirmation(res, who) {
    // Analytics only; wrapped so it can never disturb the booking flow.
    try { if (window.aapTrack) window.aapTrack('booking', { service: sel.service && sel.service.name }); } catch (e) {}
    var amount = sel.tier.min_amount_cents / 100;
    // Her structure for the Venmo note: [Session] – [Date] – [Name]
    var memo = sel.service.name + " – " + shortDate(sel.slot.start, clientTz) + " – " + who.name;
    var venmoUser = cfg.venmo;
    var payLink =
      "https://venmo.com/u/" + encodeURIComponent(venmoUser) +
      "?txn=pay&amount=" + encodeURIComponent(amount) +
      "&note=" + encodeURIComponent(memo);
    var qr =
      "https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=" +
      encodeURIComponent(payLink);
    var manage = res.public_token
      ? "/manage-booking.html?token=" + encodeURIComponent(res.public_token)
      : null;

    var html =
      '<div class="aap-bk-card aap-bk-confirm">' +
      '<div class="aap-bk-confirm-mark">✓</div>' +
      '<p class="aap-bk-confirm-eyebrow">The hour is held</p>' +
      "<h3 class=\"aap-bk-confirm-title\">" + esc(who.first) + ", your <em>" + esc(sel.service.name) + "</em> is set.</h3>" +
      '<div class="aap-bk-summary aap-bk-summary--confirm">' + summaryLine(true) + "</div>" +
      (res.google_event_created
        ? '<p class="aap-bk-quiet aap-bk-center">It’s on Adi Marie’s calendar, and a confirmation with the meeting link is on its way to your inbox.</p>'
        : '<p class="aap-bk-quiet aap-bk-center">A confirmation with the meeting link is on its way to your inbox.</p>') +
      '<div class="aap-bk-pay">' +
      '<p class="aap-bk-pay-label">Complete your reciprocity</p>' +
      '<p class="aap-bk-pay-amount">' + fmtAmount(sel.tier.min_amount_cents) + '<span class="aap-bk-pay-tier">' + esc(sel.tier.tier_name) + "</span></p>" +
      '<p class="aap-bk-quiet aap-bk-center aap-bk-pay-rule">You must complete payment at the time of booking, as a personal transfer through Venmo. If payment is not received within an hour, your appointment is cancelled.</p>' +
      '<a class="aap-bk-pay-btn" href="' + payLink + '" target="_blank" rel="noopener">Pay with Venmo &nearr;</a>' +
      '<p class="aap-bk-pay-handle">to <strong>@' + esc(venmoUser) + "</strong></p>" +
      '<div class="aap-bk-pay-memo">' +
      '<span class="aap-bk-pay-memo-label">Please use this exact structure in your note &mdash; Session &ndash; Date &ndash; Your name:</span>' +
      '<span class="aap-bk-pay-memo-val" id="bk-memo">' + esc(memo) + "</span>" +
      '<button type="button" class="aap-bk-copy" data-copy="' + esc(memo) + '">Copy</button>' +
      "</div>" +
      '<details class="aap-bk-qr"><summary>Show QR code</summary>' +
      '<img src="' + qr + '" alt="Venmo QR code to pay @' + esc(venmoUser) + '" width="180" height="180"></details>' +
      '<p class="aap-bk-quiet aap-bk-center aap-bk-pay-fine">Your place is held now. Adi Marie confirms reciprocity by hand once it arrives.</p>' +
      "</div>" +
      '<div class="aap-bk-after">' +
      '<p class="aap-bk-after-label">Before your session</p>' +
      prepList(sel.service.slug) +
      '<p class="aap-bk-quiet aap-bk-prep-note">' + esc(PREP_DOCS) + "</p>" +
      "</div>" +
      (manage ? '<a class="aap-bk-manage" href="' + manage + '">Need to reschedule? Manage your booking</a>' : "") +
      "</div>";
    root.innerHTML = html;
    bindConfirm();
    formMemo = {};
    // The page may answer a booking (Begin Here shows its thank-you beneath).
    try { document.dispatchEvent(new CustomEvent("aap:booked", { detail: { service: sel.service.slug } })); } catch (e) {}
    var header = document.querySelector(".site-header");
    var offset = (header ? header.offsetHeight : 90) + 16;
    window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - offset, behavior: "auto" });
  }

  // ---- Event binding -------------------------------------------------------
  function bindShell() {
    root.querySelectorAll("[data-svc]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = catalog.find(function (x) { return x.slug === b.dataset.svc; });
        if (!s) return;
        var changed = !sel.service || sel.service.id !== s.id;
        sel.service = s;
        if (changed) { sel.dayKey = null; sel.slot = null; sel.tier = null; sel.prepared = false; }
        sel._scroll = true;
        render();
        paintMonthGrid();
      });
    });

    root.querySelectorAll(".aap-bk-monthbtn").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.disabled) return;
        var delta = parseInt(b.dataset.mo, 10);
        var d = new Date(sel.viewYear, sel.viewMonth + delta, 1);
        sel.viewYear = d.getFullYear();
        sel.viewMonth = d.getMonth();
        // Changing months doesn't clear an already-picked day/slot.
        var bodyEl = document.getElementById("aap-bk-calbody");
        var monthEl = root.querySelector(".aap-bk-month");
        if (monthEl) monthEl.textContent = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        if (bodyEl) bodyEl.innerHTML = renderMonthGridLoading();
        // toggle back button disabled state
        var backBtn = root.querySelector('.aap-bk-monthbtn[data-mo="-1"]');
        if (backBtn) backBtn.disabled = isViewBeforeOrAtCurrentMonth();
        paintMonthGrid();
      });
    });

    if (sel.service) paintMonthGrid();
    bindSlotButtons();
    bindPrepare();
    bindTierButtons();
    bindDetails();
  }

  function bindDayButtons() {
    root.querySelectorAll("[data-day]").forEach(function (b) {
      b.addEventListener("click", function () {
        sel.dayKey = b.dataset.day;
        sel.slot = null;
        sel.tier = null;
        sel.prepared = false;
        sel._scroll = true;
        render();
      });
    });
  }

  function bindSlotButtons() {
    root.querySelectorAll("[data-slot]").forEach(function (b) {
      b.addEventListener("click", function () {
        var entry = monthCache[sel.service.slug + ":" + sel.viewYear + "-" + pad(sel.viewMonth + 1)];
        var slots = (entry && entry.byDay[sel.dayKey]) || [];
        sel.slot = slots.find(function (s) { return s.start === b.dataset.slot; }) || null;
        sel.prepared = false;
        sel.tier = null;
        sel._scroll = true;
        render();
      });
    });
  }

  function bindPrepare() {
    var box = document.getElementById("bk-prepared");
    if (!box) return;
    box.addEventListener("change", function () {
      sel.prepared = !!box.checked;
      if (!sel.prepared) sel.tier = null;
      sel._scroll = sel.prepared;
      render();
    });
  }

  function bindTierButtons() {
    root.querySelectorAll("[data-tier]").forEach(function (b) {
      b.addEventListener("click", function () {
        sel.tier = (sel.service.tiers || []).find(function (t) { return t.id === b.dataset.tier; }) || null;
        sel._scroll = true;
        render();
      });
    });
  }

  function bindDetails() {
    var btn = document.getElementById("bk-submit");
    if (btn) btn.addEventListener("click", submit);
    // Choosing Group Work turns the referral question into the required one, in place.
    var ap = document.getElementById("bk-applying"), ref = document.getElementById("bk-referral");
    if (ap && ref) ap.addEventListener("change", function () {
      formMemo["bk-applying"] = ap.value;
      var lab = ref.closest("label");
      if (!lab) return;
      var txt = ap.value === APPLY.group
        ? "Who referred you, or where did you come from? <em>(required for group work)</em>"
        : "How did you find your way here? <em>(optional)</em>";
      while (lab.firstChild && lab.firstChild !== ref) lab.removeChild(lab.firstChild);
      lab.insertAdjacentHTML("afterbegin", txt);
    });
  }

  function bindConfirm() {
    root.querySelectorAll(".aap-bk-copy").forEach(function (b) {
      b.addEventListener("click", function () {
        var text = b.dataset.copy;
        var done = function () { b.textContent = "Copied ✓"; setTimeout(function () { b.textContent = "Copy"; }, 1800); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, done);
        } else {
          done();
        }
      });
    });
  }

  // ---- Small render helpers ------------------------------------------------
  function section(id, inner, active) {
    return '<section class="aap-bk-step aap-bk-step--' + id + (active ? " aap-bk-step--active" : "") + '">' + inner + "</section>";
  }
  function row(inner) { return '<div class="aap-bk-row">' + inner + "</div>"; }
  function field(label, control) {
    return '<label class="aap-bk-fieldlabel">' + label + control + "</label>";
  }
  function renderLoading() {
    root.innerHTML = '<div class="aap-bk-card"><div class="aap-bk-loadrow"><span class="aap-bk-spin"></span> Preparing the calendar…</div></div>';
  }
  function renderFatal(msg, err) {
    if (err) console.error("[calendar-booking]", err);
    root.innerHTML = '<div class="aap-bk-card"><div class="aap-bk-err">' + esc(msg) + "</div></div>";
  }

  // ---- Utilities -----------------------------------------------------------
  function okJson(res) {
    if (!res.ok) return res.text().then(function (t) { throw new Error(t || ("HTTP " + res.status)); });
    return res.json();
  }
  function detectTz() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles"; }
    catch (e) { return "America/Los_Angeles"; }
  }
  function prettyTz(tz) {
    try {
      var s = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
        .formatToParts(new Date()).find(function (p) { return p.type === "timeZoneName"; });
      return (s ? s.value : tz) + " (" + tz.split("/").pop().replace(/_/g, " ") + ")";
    } catch (e) { return tz; }
  }
  function dayKeyInTz(iso, tz) {
    var p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date(iso));
    var o = {};
    p.forEach(function (x) { o[x.type] = x.value; });
    return o.year + "-" + o.month + "-" + o.day;
  }
  function fmtTime(iso, tz) {
    return new Date(iso).toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true });
  }
  function shortDate(iso, tz) {
    return new Date(iso).toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric" });
  }
  function prettyDay(dk) {
    var p = dk.split("-");
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return d.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
  }
  function fmtDuration(min) {
    if (min % 60 === 0) { var h = min / 60; return h + (h === 1 ? " hour" : " hours"); }
    if (min > 60) return Math.floor(min / 60) + " hr " + (min % 60) + " min";
    return min + " min";
  }
  function money(cents) {
    var n = cents / 100;
    return "$" + (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2));
  }
  function isViewBeforeOrAtCurrentMonth() {
    var now = new Date();
    return sel.viewYear < now.getFullYear() ||
      (sel.viewYear === now.getFullYear() && sel.viewMonth <= now.getMonth());
  }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function isoDateLocal(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function trim(s) { return ("" + s).trim(); }
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function esc(s) {
    return ("" + s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---- Styles (scoped under .aap-bk) --------------------------------------
  function injectStyles() {
    if (document.getElementById("aap-bk-styles")) return;
    var css = [
      ".aap-bk{--bk-gold:var(--gold,#C9A84C);--bk-gold-pale:var(--gold-pale,#DCC178);--bk-bark:var(--bark,#2D2A26);--bk-bark-deep:var(--bark-deep,#1F1612);--bk-paper:var(--paper,#F7F5F0);--bk-parch:var(--parchment-warm,#F4EAD3);--bk-quiet:var(--ink-quiet,#5A554C);--bk-line:rgba(45,42,38,0.12);--bk-dark:#1F1A18;font-family:'Inter',system-ui,sans-serif;color:var(--bk-bark);display:block;max-width:720px;margin:0 auto;text-align:left;}",
      ".aap-bk *{box-sizing:border-box;}",
      ".aap-bk-card{background:#fff;border:1px solid var(--bk-line);border-radius:14px;box-shadow:0 14px 36px rgba(45,42,38,0.10);overflow:hidden;}",
      ".aap-bk-step{padding:26px 30px;border-top:1px solid var(--bk-line);}",
      ".aap-bk-step:first-child{border-top:none;}",
      ".aap-bk-stephead{display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap;}",
      ".aap-bk-num{flex:0 0 auto;width:26px;height:26px;border-radius:50%;border:1px solid var(--bk-gold);color:var(--bk-gold);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;}",
      ".aap-bk-num.is-on{background:var(--bk-gold);color:#fff;}",
      ".aap-bk-label{font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;font-weight:500;color:var(--bk-bark);line-height:1;}",
      ".aap-bk-chosen{margin-left:auto;font-size:13px;color:var(--bk-quiet);font-style:italic;text-align:right;}",
      // offerings
      ".aap-bk-offerings{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;align-items:stretch;}",
      ".aap-bk-offering{position:relative;display:flex;flex-direction:column;gap:9px;text-align:left;padding:24px 20px;border:1px solid var(--bk-line);border-radius:13px;background:var(--bk-paper);cursor:pointer;overflow:hidden;transition:border-color .2s,box-shadow .2s,transform .2s,background .2s;}",
      ".aap-bk-offering::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--bk-gold),var(--bk-gold-pale));transform:scaleX(0);transform-origin:left;transition:transform .25s ease;}",
      ".aap-bk-offering:hover{border-color:var(--bk-gold);transform:translateY(-3px);box-shadow:0 12px 26px rgba(45,42,38,0.10);background:#fff;}",
      ".aap-bk-offering:hover::before{transform:scaleX(1);}",
      ".aap-bk-offering.is-on{border-color:var(--bk-gold);box-shadow:0 0 0 1px var(--bk-gold) inset;background:#fff;}",
      ".aap-bk-offering.is-on::before{transform:scaleX(1);}",
      ".aap-bk-offering-dur{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--bk-gold);font-weight:600;}",
      ".aap-bk-offering-name{font-family:'Cormorant Garamond',Georgia,serif;font-size:23px;font-weight:600;color:var(--bk-bark);line-height:1.12;}",
      ".aap-bk-offering-desc{font-size:13px;color:var(--bk-quiet);line-height:1.55;flex:1 1 auto;}",
      ".aap-bk-offering-price{font-family:'Cormorant Garamond',Georgia,serif;font-size:21px;font-weight:600;color:var(--bk-bark);margin-top:4px;padding-top:12px;border-top:1px solid var(--bk-line);}",
      "@media(max-width:640px){.aap-bk-offerings{grid-template-columns:1fr;}}",
      ".aap-bk-cat-label{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--bk-gold);font-weight:600;margin:0 0 12px;}",
      ".aap-bk-scale{display:flex;flex-wrap:wrap;align-items:center;gap:9px 14px;margin:0 0 22px;padding:0 0 18px;border-bottom:1px solid var(--bk-line);}",
      ".aap-bk-scale-label{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--bk-gold);font-weight:600;}",
      ".aap-bk-scale-values{display:inline-flex;flex-wrap:wrap;gap:8px;}",
      ".aap-bk-scale-val{font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:600;color:var(--bk-bark);line-height:1;padding:5px 15px;border:1px solid var(--bk-line);border-radius:999px;background:#fff;}",
      ".aap-bk-soon{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;}",
      ".aap-bk-soon-card{display:flex;flex-direction:column;gap:5px;padding:16px 18px;border:1px dashed var(--bk-line);border-radius:11px;background:transparent;opacity:.8;}",
      ".aap-bk-soon-name{font-family:'Cormorant Garamond',Georgia,serif;font-size:19px;font-weight:600;color:var(--bk-quiet);}",
      ".aap-bk-soon-tag{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--bk-gold);font-weight:600;}",
      // calendar
      ".aap-bk-cal-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}",
      ".aap-bk-month{font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;font-weight:600;}",
      ".aap-bk-monthbtn{border:1px solid var(--bk-line);background:#fff;border-radius:8px;width:38px;height:34px;font-size:16px;color:var(--bk-bark);cursor:pointer;transition:border-color .15s;}",
      ".aap-bk-monthbtn:hover:not(:disabled){border-color:var(--bk-gold);}",
      ".aap-bk-monthbtn:disabled{opacity:.3;cursor:default;}",
      ".aap-bk-dow{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px;}",
      ".aap-bk-dow span{text-align:center;font-size:11px;letter-spacing:.08em;color:var(--bk-quiet);padding:4px 0;}",
      ".aap-bk-days{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}",
      ".aap-bk-day{position:relative;aspect-ratio:1/1;border:1px solid transparent;border-radius:9px;background:transparent;color:var(--bk-bark);cursor:default;display:flex;align-items:center;justify-content:center;font-size:14px;padding:0;}",
      ".aap-bk-day.is-empty{border:none;}",
      ".aap-bk-day.is-past{color:#c9c4ba;}",
      ".aap-bk-day.is-open{cursor:pointer;background:var(--bk-paper);border-color:var(--bk-line);color:var(--bk-bark);font-weight:600;}",
      ".aap-bk-day.is-open:hover{border-color:var(--bk-gold);background:#fff;}",
      ".aap-bk-day.is-sel{background:var(--bk-gold);color:#fff;border-color:var(--bk-gold);}",
      ".aap-bk-dot{position:absolute;bottom:6px;left:50%;transform:translateX(-50%);width:5px;height:5px;border-radius:50%;background:var(--bk-gold);}",
      ".aap-bk-day.is-sel .aap-bk-dot{background:#fff;}",
      ".aap-bk-cal-note{font-size:12px;color:var(--bk-quiet);margin:14px 0 0;}",
      // slots
      ".aap-bk-slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;}",
      ".aap-bk-slot{border:1px solid var(--bk-line);background:var(--bk-paper);border-radius:9px;padding:11px 8px;font-size:15px;font-weight:600;color:var(--bk-bark);cursor:pointer;display:flex;flex-direction:column;gap:2px;align-items:center;transition:border-color .15s,transform .15s;}",
      ".aap-bk-slot:hover{border-color:var(--bk-gold);transform:translateY(-1px);}",
      ".aap-bk-slot.is-on{background:var(--bk-gold);color:#fff;border-color:var(--bk-gold);}",
      ".aap-bk-slot-pt{font-size:11px;font-weight:400;opacity:.7;}",
      // tiers
      ".aap-bk-tier-intro{margin:0 0 14px;}",
      ".aap-bk-tiers{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;}",
      ".aap-bk-tier{display:flex;flex-direction:column;gap:3px;text-align:left;border:1px solid var(--bk-line);background:var(--bk-paper);border-radius:11px;padding:15px 16px;cursor:pointer;transition:border-color .15s,transform .15s;}",
      ".aap-bk-tier:hover{border-color:var(--bk-gold);transform:translateY(-1px);}",
      ".aap-bk-tier.is-on{border-color:var(--bk-gold);box-shadow:0 0 0 1px var(--bk-gold) inset;background:#fff;}",
      ".aap-bk-tier-eyebrow{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--bk-gold);font-weight:600;}",
      ".aap-bk-tier-name{font-family:'Cormorant Garamond',Georgia,serif;font-size:19px;font-weight:600;}",
      ".aap-bk-prep{margin:10px 0 0;padding:0 0 0 1.15em;font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;line-height:1.55;color:var(--bk-bark);}",
      ".aap-bk-prep li{margin:0 0 6px;}",
      ".aap-bk-checkrow{display:flex;align-items:flex-start;gap:12px;margin-top:16px;padding:14px 16px;border:1px solid var(--bk-line);border-radius:11px;background:var(--bk-paper);cursor:pointer;font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;line-height:1.45;}",
      ".aap-bk-checkrow.is-on{border-color:var(--bk-gold);box-shadow:0 0 0 1px var(--bk-gold) inset;}",
      ".aap-bk-checkrow input{width:18px;height:18px;margin:3px 0 0;accent-color:#C9A84C;flex:none;}",
      ".aap-bk-pay-tier{display:block;font-size:15px;letter-spacing:.08em;text-transform:uppercase;font-family:Inter,system-ui,sans-serif;font-weight:600;margin-top:6px;opacity:.85;}",
      ".aap-bk-pay-rule{margin:0 auto 14px;max-width:34em;color:var(--bk-gold-pale)!important;}",
      ".aap-bk-tier-amt{font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;font-weight:600;color:var(--bk-bark);margin-top:2px;}",
      ".aap-bk-prep-intro{margin:0;}",
      ".aap-bk-prep-note{margin:12px 0 0;}",
      ".aap-bk-terms{margin:14px 0 0;border-top:1px solid var(--bk-line);border-bottom:1px solid var(--bk-line);}",
      ".aap-bk-terms summary{cursor:pointer;padding:12px 0;font-size:12px;letter-spacing:.07em;text-transform:uppercase;font-weight:600;color:var(--bk-quiet);}",
      ".aap-bk-terms p{margin:0 0 10px;font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;line-height:1.5;color:var(--bk-bark);}",
      ".aap-bk-terms dl{margin:0 0 14px;display:grid;grid-template-columns:auto 1fr;gap:6px 18px;font-size:14px;line-height:1.45;}",
      ".aap-bk-terms dt{font-weight:600;color:var(--bk-bark);}",
      ".aap-bk-terms dd{margin:0;color:var(--bk-quiet);}",
      ".aap-bk-tier-notes{margin:16px 0 0;}",
      ".aap-bk-tier-notes p{margin:0 0 8px;font-size:14px;line-height:1.55;color:var(--bk-quiet);}",
      ".aap-bk-tier-notes a{color:var(--bk-bark);text-decoration:underline;text-underline-offset:3px;}",
      "select.aap-bk-select{appearance:auto;-webkit-appearance:menulist;height:auto;}",
      ".aap-bk-after{text-align:left;max-width:420px;margin:22px auto 0;padding:18px 20px;border:1px solid var(--bk-line);border-radius:13px;}",
      ".aap-bk-after-label{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--bk-gold);font-weight:600;margin:0 0 4px;}",
      "@media(max-width:560px){.aap-bk-terms dl{grid-template-columns:1fr;gap:0;}.aap-bk-terms dd{margin:0 0 9px;}}",
      // embedded Google appointment scheduler
      ".aap-bk-sched-intro{margin:2px 0 20px;}",
      ".aap-bk-sched-panel{border:1px solid var(--bk-line);border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 12px 38px rgba(45,42,38,0.11);}",
      ".aap-bk-sched-bar{display:flex;align-items:center;gap:10px;padding:13px 22px;background:linear-gradient(180deg,var(--bk-parch,#F4EAD3),#fbf7ee);border-bottom:1px solid var(--bk-line);}",
      ".aap-bk-sched-dot{flex:0 0 auto;width:8px;height:8px;border-radius:50%;background:var(--bk-gold,#C9A84C);animation:aapBkPulse 2.2s ease-out infinite;}",
      "@keyframes aapBkPulse{0%{box-shadow:0 0 0 0 rgba(201,168,76,0.5);}70%{box-shadow:0 0 0 8px rgba(201,168,76,0);}100%{box-shadow:0 0 0 0 rgba(201,168,76,0);}}",
      ".aap-bk-sched-bar-label{font-family:'Cinzel',serif;font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--bk-gold,#C9A84C);font-weight:600;}",
      ".aap-bk-sched-bar-name{margin-left:auto;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:var(--bk-quiet,#5A554C);}",
      ".aap-bk-sched-frame{position:relative;width:100%;background:#fff;}",
      ".aap-bk-sched-frame iframe{width:100%;height:680px;border:0;display:block;}",
      ".aap-bk-sched-fallback{margin:.7rem 0 0;font-size:.92rem;}",
      ".aap-bk-sched-pay{margin-top:30px;padding-top:26px;border-top:1px solid var(--bk-line);}",
      ".aap-bk-sched-payintro{margin:0 0 16px;}",
      ".aap-bk-tier--link{text-decoration:none;}",
      "@media(max-width:600px){.aap-bk-sched-frame iframe{height:600px;}.aap-bk-sched-bar-name{display:none;}}",
      // form
      ".aap-bk-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}",
      ".aap-bk-fieldlabel{display:block;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:var(--bk-quiet);font-weight:600;margin-bottom:14px;}",
      ".aap-bk-fieldlabel em{text-transform:none;letter-spacing:0;font-weight:400;font-style:italic;}",
      ".aap-bk-input,.aap-bk-textarea{display:block;width:100%;margin-top:6px;font-family:'Inter',sans-serif;font-size:15px;color:var(--bk-bark);background:var(--bk-paper);border:1px solid var(--bk-line);border-radius:9px;padding:11px 13px;outline:none;transition:border-color .15s;}",
      ".aap-bk-input:focus,.aap-bk-textarea:focus{border-color:var(--bk-gold);background:#fff;}",
      ".aap-bk-textarea{resize:vertical;line-height:1.5;}",
      ".aap-bk-summary{background:var(--bk-parch);border-radius:11px;padding:16px 18px;margin:6px 0 16px;}",
      ".aap-bk-summary-row{display:flex;justify-content:space-between;gap:14px;padding:4px 0;font-size:14px;}",
      ".aap-bk-summary-row span{color:var(--bk-quiet);text-transform:uppercase;font-size:11px;letter-spacing:.07em;font-weight:600;align-self:center;}",
      ".aap-bk-summary-row strong{font-weight:600;text-align:right;}",
      ".aap-bk-submit{display:block;width:100%;background:var(--bk-dark);color:var(--bk-parch);border:none;border-radius:10px;padding:15px;font-family:'Inter',sans-serif;font-size:13px;letter-spacing:.18em;text-transform:uppercase;font-weight:600;cursor:pointer;transition:background .18s;}",
      ".aap-bk-submit:hover:not(:disabled){background:#000;}",
      ".aap-bk-submit:disabled{opacity:.6;cursor:default;}",
      ".aap-bk-fineprint{font-size:12px;color:var(--bk-quiet);text-align:center;margin:14px 0 0;line-height:1.5;}",
      // misc
      ".aap-bk-quiet{color:var(--bk-quiet);font-size:14px;line-height:1.55;}",
      ".aap-bk-center{text-align:center;}",
      ".aap-bk-err{background:#f6ece6;color:#9a4a2f;border:1px solid #e6cdbf;border-radius:9px;padding:11px 14px;font-size:14px;margin-bottom:12px;}",
      ".aap-bk-loadrow{display:flex;align-items:center;gap:10px;color:var(--bk-quiet);font-size:14px;padding:30px;justify-content:center;}",
      ".aap-bk-spin{display:inline-block;width:15px;height:15px;border:2px solid rgba(201,168,76,.3);border-top-color:var(--bk-gold);border-radius:50%;animation:aapbkspin .7s linear infinite;vertical-align:middle;}",
      "@keyframes aapbkspin{to{transform:rotate(360deg);}}",
      // confirmation
      ".aap-bk-confirm{padding:36px 30px;text-align:center;}",
      ".aap-bk-confirm-mark{width:54px;height:54px;border-radius:50%;background:var(--bk-gold);color:#fff;font-size:26px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;}",
      ".aap-bk-confirm-eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--bk-gold);font-weight:600;margin:0 0 8px;}",
      ".aap-bk-confirm-title{font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:500;line-height:1.2;margin:0 0 22px;}",
      ".aap-bk-confirm-title em{font-style:italic;color:var(--bk-gold-pale);}",
      ".aap-bk-summary--confirm{text-align:left;max-width:420px;margin:0 auto 18px;}",
      ".aap-bk-pay{background:var(--bk-dark);border-radius:13px;padding:26px 24px;margin:22px auto 0;max-width:420px;}",
      ".aap-bk-pay-label{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--bk-gold-pale);font-weight:600;margin:0 0 6px;}",
      ".aap-bk-pay-amount{font-family:'Cormorant Garamond',Georgia,serif;font-size:42px;font-weight:600;color:var(--bk-paper);margin:0 0 16px;}",
      ".aap-bk-pay-btn{display:inline-block;background:var(--bk-gold);color:#1F1A18;text-decoration:none;border-radius:9px;padding:14px 30px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;transition:background .18s;}",
      ".aap-bk-pay-btn:hover{background:var(--bk-gold-pale);}",
      ".aap-bk-pay-handle{color:var(--bk-paper);font-size:14px;margin:10px 0 0;opacity:.85;}",
      ".aap-bk-pay-handle strong{color:var(--bk-gold-pale);}",
      ".aap-bk-pay-memo{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;margin:18px 0 0;padding:12px;background:rgba(247,245,240,.08);border-radius:9px;}",
      ".aap-bk-pay-memo-label{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--bk-gold-pale);width:100%;}",
      ".aap-bk-pay-memo-val{color:var(--bk-paper);font-size:14px;font-style:italic;}",
      ".aap-bk-copy{background:transparent;border:1px solid var(--bk-gold-pale);color:var(--bk-gold-pale);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:'Inter',sans-serif;}",
      ".aap-bk-copy:hover{background:var(--bk-gold-pale);color:#1F1A18;}",
      ".aap-bk-qr{margin:16px 0 0;color:var(--bk-gold-pale);font-size:12px;}",
      ".aap-bk-qr summary{cursor:pointer;letter-spacing:.08em;text-transform:uppercase;}",
      ".aap-bk-qr img{margin:14px auto 0;display:block;background:#fff;padding:8px;border-radius:8px;}",
      ".aap-bk-pay-fine{margin-top:16px;color:var(--bk-gold-pale)!important;opacity:.8;}",
      ".aap-bk-manage{display:block;text-align:center;padding:16px;font-size:13px;color:var(--bk-quiet);text-decoration:underline;text-underline-offset:3px;}",
      // responsive
      "@media(max-width:560px){.aap-bk-step{padding:22px 18px;}.aap-bk-offerings{grid-template-columns:1fr;}.aap-bk-soon{grid-template-columns:1fr;}.aap-bk-row{grid-template-columns:1fr;}.aap-bk-label{font-size:21px;}.aap-bk-chosen{margin-left:38px;width:100%;text-align:left;}.aap-bk-pay-amount{font-size:36px;}}",
    ].join("\n");
    var style = document.createElement("style");
    style.id = "aap-bk-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }
})();
