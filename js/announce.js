/*
  announce.js — the announcement band.
  Reads Site → Announcement from the intranet. When it is on, a single
  quiet band appears at the top of every public page. Dismissing it hides
  that particular message for the rest of the browser session.
*/
(function () {
  var URL_ = "https://twmwqfmmfuwxvzkrwnui.supabase.co/rest/v1/site_announcement_public?select=message,link_url,link_label";
  var KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bXdxZm1tZnV3eHZ6a3J3bnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNjQ5ODEsImV4cCI6MjA5NDc0MDk4MX0.sXjGyRuKg8yCNq_hlrhJU-UAV0XT5mBICtdlFNLEcRM";

  function hashOf(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
    return String(h);
  }

  function render(row) {
    if (!row || !row.message) return;
    var dismissed = null;
    try { dismissed = sessionStorage.getItem("aap-announce-dismissed"); } catch (e) {}
    var h = hashOf(row.message);
    if (dismissed === h) return;
    if (document.getElementById("aap-announce")) return;

    var style = document.createElement("style");
    style.textContent =
      "#aap-announce{position:relative;z-index:2147483000;background:#2D2A26;color:#F5F3ED;" +
      "font-family:'Cormorant Garamond',Georgia,serif;font-size:1.02rem;line-height:1.5;text-align:center;" +
      "padding:0.65rem 2.6rem;}" +
      "#aap-announce a{color:#E8CE84;text-decoration:underline;text-underline-offset:3px;margin-left:0.5rem;}" +
      "#aap-announce a:hover{color:#F5F3ED;}" +
      "#aap-announce .aap-announce-x{position:absolute;right:0.9rem;top:50%;transform:translateY(-50%);" +
      "background:none;border:none;color:#B8B0A4;font-size:1.1rem;cursor:pointer;padding:0.2rem 0.4rem;}" +
      "#aap-announce .aap-announce-x:hover{color:#F5F3ED;}";
    document.head.appendChild(style);

    var bar = document.createElement("div");
    bar.id = "aap-announce";
    bar.setAttribute("role", "status");

    var text = document.createElement("span");
    text.textContent = row.message;
    bar.appendChild(text);

    if (row.link_url) {
      var a = document.createElement("a");
      a.textContent = row.link_label || "Read more";
      var href = String(row.link_url);
      if (/^https?:\/\//.test(href) || /^[a-z0-9-]+\.html/.test(href)) {
        a.href = href;
        bar.appendChild(a);
      }
    }

    var x = document.createElement("button");
    x.className = "aap-announce-x";
    x.setAttribute("aria-label", "Dismiss announcement");
    x.textContent = "×";
    x.addEventListener("click", function () {
      try { sessionStorage.setItem("aap-announce-dismissed", h); } catch (e) {}
      if (bar.parentNode) bar.parentNode.removeChild(bar);
    });
    bar.appendChild(x);

    function mount() { document.body.insertBefore(bar, document.body.firstChild); }
    if (document.body) mount();
    else document.addEventListener("DOMContentLoaded", mount);
  }

  try {
    fetch(URL_, { headers: { apikey: KEY, Authorization: "Bearer " + KEY } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) { if (rows && rows.length) render(rows[0]); })
      .catch(function () {});
  } catch (e) {}
})();
