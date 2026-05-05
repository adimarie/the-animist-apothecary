// Decap CMS GitHub OAuth proxy.
//
// Decap CMS (running at theanimistapothecary.com/studio/) needs a server-side
// OAuth handshake to exchange a GitHub authorization code for an access token —
// because the client_secret can never be exposed in the browser.
//
// This function handles BOTH legs of the OAuth flow at the same URL:
//   1. First call (no `code` query param): redirects user to GitHub's authorize page.
//   2. Callback from GitHub (with `code` query param): exchanges code → token,
//      then returns an HTML page that postMessages the token back to the
//      Decap CMS popup-opener window.
//
// Required Supabase function secrets:
//   GITHUB_OAUTH_CLIENT_ID     — from your GitHub OAuth App
//   GITHUB_OAUTH_CLIENT_SECRET — from your GitHub OAuth App
//
// In the GitHub OAuth App settings, set:
//   Homepage URL:              https://theanimistapothecary.com
//   Authorization callback URL: https://wdecjlrfulsdklqeetqb.supabase.co/functions/v1/decap-oauth
//
// Deployed with verify_jwt: false (Decap doesn't send a Supabase JWT).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CLIENT_ID = Deno.env.get("GITHUB_OAUTH_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("GITHUB_OAUTH_CLIENT_SECRET");
const SCOPE = "repo,user";

Deno.serve(async (req: Request): Promise<Response> => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return new Response(
      "Decap OAuth proxy is not configured. Set GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET as Supabase function secrets.",
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const selfUrl = `${url.origin}${url.pathname}`;

  // GitHub returned an error from the consent screen.
  if (error) {
    return errorPage(`GitHub OAuth error: ${error} (${url.searchParams.get("error_description") || "no description"})`);
  }

  // Step 1: no code yet → redirect to GitHub.
  if (!code) {
    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.searchParams.set("client_id", CLIENT_ID);
    authorize.searchParams.set("redirect_uri", selfUrl);
    authorize.searchParams.set("scope", SCOPE);
    return Response.redirect(authorize.toString(), 302);
  }

  // Step 2: have code → exchange for token.
  let token: string | null = null;
  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "decap-oauth-proxy",
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: selfUrl,
      }),
    });

    const data = await tokenRes.json() as { access_token?: string; error?: string; error_description?: string };
    if (data.error) {
      return errorPage(`Token exchange failed: ${data.error} — ${data.error_description || ""}`);
    }
    token = data.access_token ?? null;
  } catch (e) {
    return errorPage(`Token exchange threw: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (!token) {
    return errorPage("No access_token returned by GitHub.");
  }

  // Build the postMessage Decap expects:
  //   "authorization:github:success:{\"token\":\"...\",\"provider\":\"github\"}"
  const payload = JSON.stringify({ token, provider: "github" });
  const successMessage = `authorization:github:success:${payload}`;

  // Return a page that posts the message to the opener (the Decap admin popup parent).
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Authentication complete</title></head>
<body style="font-family: system-ui; padding: 2rem; text-align: center; color: #444;">
  <p>Authentication successful. You can close this window.</p>
  <script>
    (function () {
      var message = ${JSON.stringify(successMessage)};
      var notify = function () {
        if (window.opener) {
          window.opener.postMessage(message, '*');
        }
      };
      // Decap's popup handshake: it listens for 'authorizing:github' first,
      // then expects the success message in response.
      window.addEventListener('message', function (e) {
        if (typeof e.data === 'string' && e.data.indexOf('authorizing:github') === 0) notify();
      }, false);
      // Fire immediately as well (covers the case where opener is already listening).
      notify();
      setTimeout(function () { try { window.close(); } catch (e) {} }, 1500);
    })();
  </script>
</body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
});

function errorPage(message: string): Response {
  const html = `<!DOCTYPE html><html><body style="font-family: system-ui; padding: 2rem; color: #c53030;">
<h2>OAuth error</h2><pre style="white-space: pre-wrap;">${escapeHtml(message)}</pre>
</body></html>`;
  return new Response(html, { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
