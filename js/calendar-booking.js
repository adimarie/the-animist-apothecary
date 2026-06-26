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
  };

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
      .then(function () { render(); })
      .catch(function (err) {
        renderFatal(
          "The booking calendar couldn't load right now. Please refresh, or write to Adi at hello@theanimistapothecary.com.",
          err
        );
      });
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
    var html = "";
    html += stepOffering();
    if (sel.service) html += stepDay();
    if (sel.service && sel.dayKey) html += stepHour();
    if (sel.slot) html += stepTier();
    if (sel.tier) html += stepDetails();
    root.innerHTML = '<div class="aap-bk-card">' + html + "</div>";
    bindShell();
    // Bring the newest revealed step into view (not on first paint).
    if (sel.service) {
      var active = root.querySelector(".aap-bk-step--active:last-of-type");
      if (active && sel._scroll) {
        active.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
    catalog.forEach(function (s) {
      var on = sel.service && sel.service.id === s.id;
      var range = priceRange(s.tiers);
      body +=
        '<button type="button" class="aap-bk-offering' + (on ? " is-on" : "") +
        '" data-svc="' + esc(s.slug) + '">' +
        '<span class="aap-bk-offering-name">' + esc(s.name) + "</span>" +
        '<span class="aap-bk-offering-meta">' + fmtDuration(s.duration_minutes) +
        (range ? ' &middot; ' + range : "") + "</span>" +
        (s.description ? '<span class="aap-bk-offering-desc">' + esc(s.description) + "</span>" : "") +
        "</button>";
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
    return '<div class="aap-bk-loadrow"><span class="aap-bk-spin"></span> Reading Adi’s calendar…</div>';
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

  // ---- Step 4: tier --------------------------------------------------------
  function stepTier() {
    var chosen = sel.tier ? sel.tier.tier_name + " · " + money(sel.tier.min_amount_cents) : "";
    var head = stepHeader(4, "Your reciprocity", chosen, !!sel.slot && !sel.tier);
    var body =
      '<p class="aap-bk-quiet aap-bk-tier-intro">A sliding scale, offered in trust. Choose what is true for you now.</p>' +
      '<div class="aap-bk-tiers">';
    (sel.service.tiers || []).forEach(function (t) {
      var on = sel.tier && sel.tier.id === t.id;
      body +=
        '<button type="button" class="aap-bk-tier' + (on ? " is-on" : "") +
        '" data-tier="' + esc(t.id) + '">' +
        (t.tier_eyebrow ? '<span class="aap-bk-tier-eyebrow">' + esc(t.tier_eyebrow) + "</span>" : "") +
        '<span class="aap-bk-tier-name">' + esc(t.tier_name) + "</span>" +
        '<span class="aap-bk-tier-amt">' + money(t.min_amount_cents) + "</span>" +
        "</button>";
    });
    body += "</div>";
    return section("tier", head + body, true);
  }

  // ---- Step 5: details + intake -------------------------------------------
  function stepDetails() {
    var head = stepHeader(5, "Your details", "", true);
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
      field(
        "What’s bringing you to this session?",
        '<textarea class="aap-bk-textarea" id="bk-carrying" rows="3" placeholder="Where you are, what you’re navigating, what you’re hoping to find. There is no wrong thing to say — only the true thing."></textarea>'
      ) +
      field(
        "Anything important to know to meet you with care? <em>(optional)</em>",
        '<textarea class="aap-bk-textarea" id="bk-care" rows="2"></textarea>'
      ) +
      field(
        "How did you find your way here? <em>(optional)</em>",
        '<input class="aap-bk-input" id="bk-referral" type="text" placeholder="Referral, social, search, word of mouth…">'
      ) +
      '<div class="aap-bk-summary">' + summaryLine() + "</div>" +
      '<div class="aap-bk-err" id="bk-error" hidden></div>' +
      '<button type="button" class="aap-bk-submit" id="bk-submit">Hold this hour &rarr;</button>' +
      '<p class="aap-bk-fineprint">Your hour is held the moment you confirm — reciprocity is sent by Venmo on the next screen. ' +
      "A confirmation lands in your inbox right away.</p>" +
      "</div>";
    return section("details", head + body, true);
  }

  function summaryLine() {
    return (
      '<div class="aap-bk-summary-row"><span>Offering</span><strong>' + esc(sel.service.name) + "</strong></div>" +
      '<div class="aap-bk-summary-row"><span>When</span><strong>' + esc(prettyDay(sel.dayKey)) + ", " + fmtTime(sel.slot.start, clientTz) +
      " &ndash; " + fmtTime(sel.slot.end, clientTz) + "</strong></div>" +
      '<div class="aap-bk-summary-row"><span>Length</span><strong>' + fmtDuration(sel.service.duration_minutes) + "</strong></div>" +
      '<div class="aap-bk-summary-row"><span>Reciprocity</span><strong>' + esc(sel.tier.tier_name) + " · " + money(sel.tier.min_amount_cents) + "</strong></div>"
    );
  }

  // ---- Submit + confirmation ----------------------------------------------
  function submit() {
    var first = val("bk-first"), last = val("bk-last"), email = val("bk-email");
    var phone = val("bk-phone"), carrying = val("bk-carrying"), care = val("bk-care"), referral = val("bk-referral");
    var errEl = document.getElementById("bk-error");

    function fail(msg) {
      if (errEl) { errEl.textContent = msg; errEl.hidden = false; }
    }
    if (errEl) errEl.hidden = true;

    if (!first || !last) return fail("Please share your first and last name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Please enter a valid email so Adi can reach you.");

    var noteParts = [];
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
    var amount = sel.tier.min_amount_cents / 100;
    var memo = who.first + " — " + sel.service.name + " " + shortDate(sel.slot.start, clientTz);
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
      '<div class="aap-bk-summary aap-bk-summary--confirm">' + summaryLine() + "</div>" +
      (res.google_event_created
        ? '<p class="aap-bk-quiet aap-bk-center">It’s on Adi’s calendar, and a confirmation with the meeting link is on its way to your inbox.</p>'
        : '<p class="aap-bk-quiet aap-bk-center">A confirmation with the meeting link is on its way to your inbox.</p>') +
      '<div class="aap-bk-pay">' +
      '<p class="aap-bk-pay-label">Complete your reciprocity</p>' +
      '<p class="aap-bk-pay-amount">' + money(sel.tier.min_amount_cents) + "</p>" +
      '<a class="aap-bk-pay-btn" href="' + payLink + '" target="_blank" rel="noopener">Pay with Venmo &nearr;</a>' +
      '<p class="aap-bk-pay-handle">to <strong>@' + esc(venmoUser) + "</strong></p>" +
      '<div class="aap-bk-pay-memo">' +
      '<span class="aap-bk-pay-memo-label">Please add this note:</span>' +
      '<span class="aap-bk-pay-memo-val" id="bk-memo">' + esc(memo) + "</span>" +
      '<button type="button" class="aap-bk-copy" data-copy="' + esc(memo) + '">Copy</button>' +
      "</div>" +
      '<details class="aap-bk-qr"><summary>Show QR code</summary>' +
      '<img src="' + qr + '" alt="Venmo QR code to pay @' + esc(venmoUser) + '" width="180" height="180"></details>' +
      '<p class="aap-bk-quiet aap-bk-center aap-bk-pay-fine">Your place is held now. Adi confirms reciprocity by hand once it arrives.</p>' +
      "</div>" +
      (manage ? '<a class="aap-bk-manage" href="' + manage + '">Need to change or cancel? Manage your booking</a>' : "") +
      "</div>";
    root.innerHTML = html;
    bindConfirm();
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---- Event binding -------------------------------------------------------
  function bindShell() {
    root.querySelectorAll("[data-svc]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = catalog.find(function (x) { return x.slug === b.dataset.svc; });
        if (!s) return;
        var changed = !sel.service || sel.service.id !== s.id;
        sel.service = s;
        if (changed) { sel.dayKey = null; sel.slot = null; sel.tier = null; }
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
    bindTierButtons();
    bindDetails();
  }

  function bindDayButtons() {
    root.querySelectorAll("[data-day]").forEach(function (b) {
      b.addEventListener("click", function () {
        sel.dayKey = b.dataset.day;
        sel.slot = null;
        sel.tier = null;
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
        sel.tier = null;
        sel._scroll = true;
        render();
      });
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
  function priceRange(tiers) {
    if (!tiers || !tiers.length) return "";
    var amts = tiers.map(function (t) { return t.min_amount_cents; });
    var lo = Math.min.apply(null, amts), hi = Math.max.apply(null, amts);
    return lo === hi ? money(lo) : money(lo) + "–" + money(hi);
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
      ".aap-bk-offerings{display:grid;grid-template-columns:1fr 1fr;gap:14px;}",
      ".aap-bk-offering{display:flex;flex-direction:column;gap:6px;text-align:left;padding:18px 18px;border:1px solid var(--bk-line);border-radius:11px;background:var(--bk-paper);cursor:pointer;transition:border-color .18s,box-shadow .18s,transform .18s;}",
      ".aap-bk-offering:hover{border-color:var(--bk-gold);transform:translateY(-1px);}",
      ".aap-bk-offering.is-on{border-color:var(--bk-gold);box-shadow:0 0 0 1px var(--bk-gold) inset;background:#fff;}",
      ".aap-bk-offering-name{font-family:'Cormorant Garamond',Georgia,serif;font-size:21px;font-weight:600;color:var(--bk-bark);line-height:1.15;}",
      ".aap-bk-offering-meta{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--bk-gold);font-weight:600;}",
      ".aap-bk-offering-desc{font-size:13.5px;color:var(--bk-quiet);line-height:1.5;}",
      ".aap-bk-cat-label{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--bk-gold);font-weight:600;margin:0 0 12px;}",
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
      ".aap-bk-tier-amt{font-size:20px;font-weight:600;color:var(--bk-bark);}",
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
