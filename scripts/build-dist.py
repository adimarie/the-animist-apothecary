#!/usr/bin/env python3
"""
build-dist.py — assemble the PUBLIC website into ./dist for Cloudflare Pages.

Why this exists: the GitHub Pages deploy serves the entire repository (admin tools,
template leftovers, Next.js source, internal docs, hundreds of megabytes of originals).
This build ships only the pages chosen below plus the assets they actually reference,
moves every inline <script> into a file so a strict Content-Security-Policy can be
enforced without per-page hashes, and writes _headers, _redirects, robots.txt and
sitemap.xml. Source files are never modified.

Usage:  python3 scripts/build-dist.py [--out dist]
Exit 1 if an included page links to a local page that is neither included nor redirected.
"""
import argparse, base64, hashlib, re, shutil, sys, datetime
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://theanimistapothecary.com"

# ---- what ships -------------------------------------------------------------------
# Every top-level *.html ships except these (internal tools, drafts, audits).
EXCLUDE_TOP = {
    "draft-index.html", "draft-what-i-do.html", "image-audit.html",
    "events-dashboard.html",          # internal marketing board (writes to the intranet DB)
}
# Pages in subfolders that are part of the public site.
SUBDIR_PAGES = [
    "portal/index.html", "portal/ceremony.html", "join/index.html",
    "gatherings/index.html", "pay/index.html", "ceremony/index.html",
    "letters/card.html", "letters/note.html", "letters/refer.html", "letters/welcome.html",
    "gated/ceremonial-arc/index.html", "gated/luminous-breath/index.html", "gated/otherworldly-elders/index.html",
]
# Folders copied whole (public by nature).
WHOLE_DIRS = ["js", "css", "_content", "_partials", "_next"]
EXTRA_FILES = ["favicon.ico", "apple-touch-icon.png", "icon.png", "version.json"]
# Old March-2026 site structure -> today's pages (clean URLs; Cloudflare serves /x for x.html).
OLD_DIR_REDIRECTS = [
    ("/offerings/*", "/public-offerings"), ("/practice/*", "/about"),
    ("/sacred-reciprocity/", "/sacred-reciprocity"), ("/events/*", "/public-offerings"),
    ("/contact/*", "/inquiry"), ("/apply-to-participate/*", "/join/"),
    ("/events-dashboard", "/"), ("/events-dashboard.html", "/"),
    ("/admin/*", "/"), ("/crm/*", "/"), ("/login/*", "/"), ("/studio/*", "/"), ("/clauded/*", "/"), ("/infra/*", "/"),
    ("/auth/*", "/"), ("/waiver/*", "/"), ("/experiences/*", "/"),
    ("/school-application", "/inquiry"), ("/school-application.html", "/inquiry"),   # linked from training-grounds, never built
]
# Surfaces search engines should not index (token-gated, personal, or transactional).
ROBOTS_DISALLOW = ["/portal/", "/join/", "/pay/", "/gated/", "/ceremony/", "/letters/", "/gatherings/",
                   "/manage-booking", "/intake", "/immersion-intake", "/proposals", "/js/", "/_next/", "/_content/"]
# CSP: hosts the pages legitimately talk to. Everything else is blocked by the browser.
SUPABASE_HOSTS = ["https://wdecjlrfulsdklqeetqb.supabase.co", "https://twmwqfmmfuwxvzkrwnui.supabase.co"]
FRAME_HOSTS = ["https://calendar.google.com", "https://calendar.app.google", "https://www.youtube-nocookie.com", "https://www.youtube.com"]
# -----------------------------------------------------------------------------------

STUB_RE = re.compile(r'http-equiv=["\']refresh["\'][^>]*content=["\'][^"\']*url=([^"\'>\s;]+)|location\.(?:replace|assign)\(\s*["\']([^"\']+)["\']|location\.href\s*=\s*["\']([^"\']+)["\']', re.I)
ATTR_RE = re.compile(r'\b(?:src|href|poster|data-src|data-bg|content)\s*=\s*["\']([^"\']+)["\']', re.I)
SRCSET_RE = re.compile(r'\bsrcset\s*=\s*["\']([^"\']+)["\']', re.I)
URL_RE = re.compile(r'url\(\s*["\']?([^"\')\s]+)["\']?\s*\)', re.I)
SCRIPT_RE = re.compile(r'<script\b([^>]*)>(.*?)</script>', re.S | re.I)
HANDLER_RE = re.compile(r'\son[a-z]+\s*=\s*"([^"]*)"', re.I)
HOST_RE = re.compile(r'https://[a-z0-9.-]+\.[a-z]{2,}', re.I)
ASSET_EXT = re.compile(r'\.(?:css|js|mjs|png|jpe?g|webp|svg|gif|avif|ico|json|ya?ml|woff2?|ttf|otf|mp4|webm|mp3|pdf|xml|txt|ics|vcf)$', re.I)

def clean_url(rel):
    """repo path -> clean site URL"""
    frag = ""
    if "#" in rel: rel, frag = rel.split("#", 1); frag = "#" + frag
    if rel.endswith("/index.html"): u = "/" + rel[:-len("index.html")]
    elif rel == "index.html": u = "/"
    elif rel.endswith(".html"): u = "/" + rel[:-5]
    else: u = "/" + rel
    return u + frag

def resolve(ref, base_dir):
    ref = ref.strip()
    if not ref or ref.startswith(("#", "data:", "mailto:", "tel:", "javascript:", "blob:", "sms:")): return None
    if len(ref) > 300 or re.search(r"[\s<>]", ref): return None   # meta text, not a path
    if ref.startswith(SITE): ref = ref[len(SITE):] or "/"
    elif ref.startswith(("http://", "https://", "//")): return None
    frag = ""
    if "#" in ref: ref, frag = ref.split("#", 1)
    ref = ref.split("?")[0]
    if not ref: return None
    p = ROOT / unquote(ref).lstrip("/") if ref.startswith("/") else ROOT / base_dir / unquote(ref)
    try:
        rel = p.resolve().relative_to(ROOT.resolve()).as_posix()
        if rel == ".": rel = ""
        if rel == "" or (ROOT / rel).is_dir(): rel = (rel + "/index.html").lstrip("/")
    except (ValueError, OSError): return None
    return rel

def refs_in_html(text):
    out = set(ATTR_RE.findall(text)) | set(URL_RE.findall(text))
    for s in SRCSET_RE.findall(text):
        for part in s.split(","):
            if part.strip(): out.add(part.strip().split()[0])
    return out

def is_stub(rel):
    p = ROOT / rel
    if p.stat().st_size > 2500: return None
    m = STUB_RE.search(p.read_text(encoding="utf-8", errors="replace"))
    return next((g for g in m.groups() if g), None) if m else None

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--out", default="dist"); args = ap.parse_args()
    out = ROOT / args.out
    if out.exists(): shutil.rmtree(out)
    out.mkdir()

    top = sorted(p.name for p in ROOT.glob("*.html") if p.name not in EXCLUDE_TOP)
    candidates = top + [s for s in SUBDIR_PAGES if (ROOT / s).is_file()]
    # redirect stubs become 301 rules instead of pages
    redirect_map, pages = {}, []
    for rel in candidates:
        target = is_stub(rel)
        if target: redirect_map[rel] = target
        else: pages.append(rel)
    # also sweep known stub folders (offerings/*, book/, apply/) that are not in the candidate list
    for rel in ["book/index.html", "apply/index.html"] + [p.relative_to(ROOT).as_posix() for p in ROOT.glob("offerings/*/index.html")]:
        if (ROOT / rel).is_file() and (t := is_stub(rel)): redirect_map[rel] = t

    def final_target(t, depth=0):
        r = resolve(t, "")
        if r and r in redirect_map and depth < 5: return final_target(redirect_map[r], depth + 1)
        return clean_url(r) if r else t   # external targets pass through unchanged
    redirects = []
    for rel, t in sorted(redirect_map.items()):
        dest = final_target(t)
        src = clean_url(rel)
        redirects.append((src, dest))
        if rel.endswith(".html") and not rel.endswith("/index.html"): redirects.append(("/" + rel, dest))
    redirects += OLD_DIR_REDIRECTS

    included = set(pages)
    rule_exact = {src for src, _ in OLD_DIR_REDIRECTS if not src.endswith("*")}
    rule_prefix = tuple(src[:-1] for src, _ in OLD_DIR_REDIRECTS if src.endswith("*"))
    def redirected(r):
        u = clean_url(r)
        return r in redirect_map or u in rule_exact or u.startswith(rule_prefix) or ("/" + r) in rule_exact
    assets, broken, missing, handlers = set(), [], [], {}
    ext = {"script": set(), "style": set(), "img": set(), "frame": set(), "font": set(), "connect": set()}

    def note_hosts(text, kind):
        for h in HOST_RE.findall(text): ext[kind].add(h.lower())

    for rel in pages:
        text = (ROOT / rel).read_text(encoding="utf-8", errors="replace")
        base = str(Path(rel).parent)
        for ref in refs_in_html(text):
            r = resolve(ref, base)
            if r is None: continue
            if r.endswith(".html"):
                if r not in included and not redirected(r): broken.append((rel, r + "   (ref: " + ref + ")"))
                continue
            if (ROOT / r).is_file(): assets.add(r)
            elif ASSET_EXT.search(r) and not r.startswith(("_content/", "js/", "css/")): missing.append((rel, ref))
        for m in re.finditer(r'<script[^>]+src=["\'](https://[^"\']+)', text, re.I): ext["script"].add(HOST_RE.match(m.group(1)).group(0).lower())
        for m in re.finditer(r'<link[^>]+href=["\'](https://[^"\']+)[^>]*>', text, re.I):
            tag = m.group(0).lower()
            if "stylesheet" in tag: ext["style"].add(HOST_RE.match(m.group(1)).group(0).lower())
        for m in re.finditer(r'<(?:img|source|video|audio)[^>]+(?:src|srcset|poster)=["\'](https://[^"\'\s]+)', text, re.I): ext["img"].add(HOST_RE.match(m.group(1)).group(0).lower())
        for m in re.finditer(r'url\(\s*["\']?(https://[^"\')\s]+)', text, re.I): ext["img"].add(HOST_RE.match(m.group(1)).group(0).lower())
        for m in re.finditer(r'<iframe[^>]+src=["\'](https://[^"\']+)', text, re.I): ext["frame"].add(HOST_RE.match(m.group(1)).group(0).lower())
        hs = HANDLER_RE.findall(text)
        if hs: handlers[rel] = hs

    # assets referenced from css / yml / js
    for d in WHOLE_DIRS:
        for f in (ROOT / d).rglob("*"):
            if not f.is_file(): continue
            if f.suffix in (".css", ".yml", ".yaml", ".js", ".html"):
                t = f.read_text(encoding="utf-8", errors="replace")
                base = str(f.parent.relative_to(ROOT))
                for ref in (URL_RE.findall(t) if f.suffix == ".css" else re.findall(r'(?:/)?images/[A-Za-z0-9_./ -]+\.(?:png|jpe?g|webp|svg|gif|avif)', t)):
                    r = resolve(ref, base)
                    if r and (ROOT / r).is_file(): assets.add(r)
                if f.suffix == ".css":
                    for m in re.finditer(r'@import\s+(?:url\()?["\']?(https://[^"\')\s]+)', t): ext["style"].add(HOST_RE.match(m.group(1)).group(0).lower())
                    for m in re.finditer(r'url\(\s*["\']?(https://[^"\')\s]+)', t): ext["font" if ".woff" in m.group(1) else "img"].add(HOST_RE.match(m.group(1)).group(0).lower())
    for e in EXTRA_FILES:
        if (ROOT / e).is_file(): assets.add(e)

    # ---- copy ---------------------------------------------------------------------
    for d in WHOLE_DIRS:
        if (ROOT / d).is_dir(): shutil.copytree(ROOT / d, out / d, ignore=shutil.ignore_patterns(".DS_Store"))
    for a in sorted(assets):
        (out / a).parent.mkdir(parents=True, exist_ok=True); shutil.copy2(ROOT / a, out / a)

    # ---- pages: externalize inline scripts ---------------------------------------
    inline_dir = out / "js" / "inline"; inline_dir.mkdir(parents=True, exist_ok=True)
    n_inline = 0
    for rel in pages:
        text = (ROOT / rel).read_text(encoding="utf-8", errors="replace")
        stem = rel[:-5].replace("/", "_")
        def repl(m):
            nonlocal n_inline
            attrs, body = m.group(1), m.group(2)
            if re.search(r'\ssrc\s*=', attrs, re.I) or not body.strip(): return m.group(0)
            t = re.search(r'type\s*=\s*["\']([^"\']+)', attrs, re.I)
            typ = (t.group(1).strip().lower() if t else "text/javascript")
            if typ not in ("text/javascript", "application/javascript", "module"): return m.group(0)
            name = f"{stem}-{hashlib.sha256(body.encode()).hexdigest()[:10]}.js"
            (inline_dir / name).write_text(body, encoding="utf-8"); n_inline += 1
            mod = ' type="module"' if typ == "module" else ""
            return f'<script src="/js/inline/{name}"{mod}></script>'
        text = SCRIPT_RE.sub(repl, text)
        (out / rel).parent.mkdir(parents=True, exist_ok=True)
        (out / rel).write_text(text, encoding="utf-8")

    # ---- _headers ----------------------------------------------------------------
    handler_hashes = sorted({"'sha256-" + base64.b64encode(hashlib.sha256(h.encode()).digest()).decode() + "'" for hs in handlers.values() for h in hs})
    script_src = ["'self'"] + sorted(ext["script"]) + (["'unsafe-hashes'"] + handler_hashes if handler_hashes else [])
    csp = "; ".join([
        "default-src 'self'",
        "script-src " + " ".join(script_src),
        "style-src 'self' 'unsafe-inline' " + " ".join(sorted(ext["style"] | {"https://fonts.googleapis.com"})),
        "font-src 'self' data: " + " ".join(sorted(ext["font"] | {"https://fonts.gstatic.com"})),
        "img-src 'self' data: blob: " + " ".join(sorted(ext["img"] | set(SUPABASE_HOSTS))),
        "connect-src 'self' " + " ".join(SUPABASE_HOSTS),
        "frame-src " + " ".join(sorted(ext["frame"] | set(FRAME_HOSTS))),
        "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'",
        "upgrade-insecure-requests",
    ])
    (out / "_headers").write_text(
        "/*\n"
        f"  Content-Security-Policy: {csp}\n"
        "  Strict-Transport-Security: max-age=31536000; includeSubDomains\n"
        "  X-Content-Type-Options: nosniff\n"
        "  X-Frame-Options: DENY\n"
        "  Referrer-Policy: strict-origin-when-cross-origin\n"
        "  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()\n"
        "  Cross-Origin-Opener-Policy: same-origin-allow-popups\n"
        "/_next/static/*\n  Cache-Control: public, max-age=31536000, immutable\n"
        "/images/*\n  Cache-Control: public, max-age=604800\n"
        "/css/*\n  Cache-Control: public, max-age=86400\n"
        "/js/*\n  Cache-Control: public, max-age=3600\n", encoding="utf-8")

    # ---- _redirects, robots, sitemap ----------------------------------------------
    seen, lines = set(), []
    for s, d in redirects:
        if s in seen or s == d: continue
        seen.add(s); lines.append(f"{s} {d} 301")
    (out / "_redirects").write_text("\n".join(lines) + "\n", encoding="utf-8")
    (out / "robots.txt").write_text("User-agent: *\nAllow: /\n" + "".join(f"Disallow: {p}\n" for p in ROBOTS_DISALLOW) + f"\nSitemap: {SITE}/sitemap.xml\n", encoding="utf-8")
    live = []
    for rel in pages:
        if "/" in rel: continue
        t = (ROOT / rel).read_text(encoding="utf-8", errors="replace")
        if "coming-soon.js" in t or re.search(r'name=["\']robots["\'][^>]*noindex', t, re.I) or rel == "404.html": continue
        live.append(rel)
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for rel in live:
        mod = datetime.date.fromtimestamp((ROOT / rel).stat().st_mtime).isoformat()
        sm.append(f"  <url><loc>{SITE}{clean_url(rel)}</loc><lastmod>{mod}</lastmod></url>")
    sm.append("</urlset>")
    (out / "sitemap.xml").write_text("\n".join(sm) + "\n", encoding="utf-8")

    # ---- report ------------------------------------------------------------------
    size = sum(f.stat().st_size for f in out.rglob("*") if f.is_file())
    print(f"dist: {len(pages)} pages, {len(assets)} referenced assets, {n_inline} inline scripts externalized, "
          f"{len(lines)} redirects, {len(live)} pages in sitemap, {size/1e6:.1f} MB total")
    print("sitemap:", ", ".join(live))
    print("external script hosts:", ", ".join(sorted(ext['script'])) or "none")
    print("external style hosts:", ", ".join(sorted(ext['style'])) or "none")
    print("external img hosts:", ", ".join(sorted(ext['img'])) or "none")
    print("external frame hosts:", ", ".join(sorted(ext['frame'])) or "none")
    if handlers: print("inline event handlers (allowed by hash):", {k: len(v) for k, v in handlers.items()})
    for k, v in redirect_map.items(): pass
    if missing:
        print(f"\nMISSING ASSETS ({len(missing)}):"); [print(f"  {p} -> {r}") for p, r in sorted(set(missing))]
    if broken:
        print(f"\nBROKEN PAGE LINKS ({len(broken)}): page -> target not shipped and not redirected"); [print(f"  {p} -> {r}") for p, r in sorted(set(broken))]
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
