// Supabase client for The Animist Apothecary portals
const SUPABASE_URL = 'https://wdecjlrfulsdklqeetqb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZWNqbHJmdWxzZGtscWVldHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODQwMTQsImV4cCI6MjA4ODY2MDAxNH0.mIBgkpU24IgxnzS8kR06FOL6_1Z9NmaEDe9z36CxtHs';

let _supabase = null;

async function getSupabase() {
  if (_supabase) return _supabase;

  // Wait for Supabase library to load
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

  _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'animist-portal-auth',
      flowType: 'pkce',
    },
  });
  return _supabase;
}

async function getCurrentUser() {
  const sb = await getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

async function signInWithGoogle() {
  const sb = await getSupabase();
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) throw error;
  return data;
}

async function signOut() {
  const sb = await getSupabase();
  await sb.auth.signOut();
  window.location.href = '/';
}

// Make available globally
window.aapSupabase = { getSupabase, getCurrentUser, signInWithGoogle, signOut, SUPABASE_URL };
