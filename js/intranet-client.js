// Supabase client for The Animist Apothecary INTRANET project.
// Separate from the public-site Supabase (wdecjlrfulsdklqeetqb).
// Used by public-facing forms that need to land data in the
// practitioner intranet (new.theanimistapothecary.com): inquiries,
// medical questionnaires, etc.
//
// NOTE: this file uses the ANON key, which is safe to expose in
// client-side code. All public-form writes go through SECURITY
// DEFINER RPC functions on the intranet DB (submit_inquiry, etc.)
// so RLS is enforced server-side.

const INTRANET_SUPABASE_URL  = 'https://twmwqfmmfuwxvzkrwnui.supabase.co';
const INTRANET_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bXdxZm1tZnV3eHZ6a3J3bnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNjQ5ODEsImV4cCI6MjA5NDc0MDk4MX0.sXjGyRuKg8yCNq_hlrhJU-UAV0XT5mBICtdlFNLEcRM';

let _intranet = null;

async function getIntranetSupabase() {
  if (_intranet) return _intranet;

  // Wait for the Supabase library that supabase-client.js already loads.
  if (!window.supabase?.createClient) {
    await new Promise((resolve, reject) => {
      let attempts = 0;
      const check = () => {
        if (window.supabase?.createClient) resolve();
        else if (attempts++ > 50) reject(new Error('Supabase failed to load'));
        else setTimeout(check, 100);
      };
      check();
    });
  }

  _intranet = window.supabase.createClient(INTRANET_SUPABASE_URL, INTRANET_SUPABASE_ANON, {
    auth: {
      // Public-form usage only. No session persistence needed.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return _intranet;
}

// ── Public inquiry submission ─────────────────────────
// Calls the submit_inquiry SECURITY DEFINER RPC on the intranet DB.
// Payload shape (all optional except name and email):
//   { name, email, phone, company, message, referred_by, services: [] }
// Returns: { ok: true, id } on success, { ok: false, error } on failure.
async function submitIntranetInquiry(payload) {
  try {
    const sb = await getIntranetSupabase();
    const { data, error } = await sb.rpc('submit_inquiry', { p_payload: payload });
    if (error) return { ok: false, error: error.message || 'rpc_error' };
    return data || { ok: false, error: 'empty_response' };
  } catch (err) {
    return { ok: false, error: (err && err.message) || String(err) };
  }
}

// Make available globally
window.aapIntranet = { getIntranetSupabase, submitIntranetInquiry };
