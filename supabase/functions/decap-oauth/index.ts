// Decap CMS GitHub OAuth proxy.
// v7: redirect popup to /studio/auth.html on the main site for the postMessage step,
//     because Supabase Edge Functions inject CSP `sandbox` which blocks all scripts
//     and a text/plain Content-Type override that prevents HTML rendering.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SCOPE = "repo,user";
const PUBLIC_CALLBACK = "https://wdecjlrfulsdklqeetqb.supabase.co/functions/v1/decap-oauth";
const SUCCESS_PAGE = "https://theanimistapothecary.com/studio/auth.html";

Deno.serve(async (req: Request): Promise<Response> => {
  const CLIENT_ID = Deno.env.get("GITHUB_OAUTH_CLIENT_ID");
  const CLIENT_SECRET = Deno.env.get("GITHUB_OAUTH_CLIENT_SECRET");

  if (!CLIENT_ID || !CLIENT_SECRET) {
    const missing = [
      !CLIENT_ID ? "GITHUB_OAUTH_CLIENT_ID" : null,
      !CLIENT_SECRET ? "GITHUB_OAUTH_CLIENT_SECRET" : null,
    ].filter(Boolean).join(", ");
    return new Response(
      `Decap OAuth proxy is not configured. Missing Supabase function secret(s): ${missing}.`,
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return Response.redirect(
      `${SUCCESS_PAGE}#error=${encodeURIComponent(error + ": " + (url.searchParams.get("error_description") || ""))}`,
      302
    );
  }

  // Step 1: no code yet → redirect to GitHub.
  if (!code) {
    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.searchParams.set("client_id", CLIENT_ID);
    authorize.searchParams.set("redirect_uri", PUBLIC_CALLBACK);
    authorize.searchParams.set("scope", SCOPE);
    return Response.redirect(authorize.toString(), 302);
  }

  // Step 2: have code → exchange for token.
  let token: string | null = null;
  let exchangeError: string | null = null;
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
        redirect_uri: PUBLIC_CALLBACK,
      }),
    });

    const data = await tokenRes.json() as { access_token?: string; error?: string; error_description?: string };
    if (data.error) {
      exchangeError = `${data.error}: ${data.error_description || ""}`;
    } else {
      token = data.access_token ?? null;
    }
  } catch (e) {
    exchangeError = `Token exchange threw: ${e instanceof Error ? e.message : String(e)}`;
  }

  if (exchangeError) {
    return Response.redirect(`${SUCCESS_PAGE}#error=${encodeURIComponent(exchangeError)}`, 302);
  }
  if (!token) {
    return Response.redirect(`${SUCCESS_PAGE}#error=${encodeURIComponent("No access_token returned by GitHub")}`, 302);
  }

  // Step 3: redirect popup to the callback page on the main site, with token in fragment.
  // URL fragments are not sent to servers — they stay client-side.
  return Response.redirect(`${SUCCESS_PAGE}#token=${encodeURIComponent(token)}`, 302);
});
