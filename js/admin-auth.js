// Admin authentication guard — only Adi can access
const ADMIN_EMAILS = ['its.adimarie@gmail.com', 'adimarie@bodyworkandbotanicals.com'];

async function initAdminAuth() {
  const { getSupabase, getCurrentUser, signInWithGoogle, signOut } = window.aapSupabase;

  const user = await getCurrentUser();

  if (!user) {
    showAdminLogin();
    return null;
  }

  if (!ADMIN_EMAILS.includes(user.email)) {
    showAccessDenied();
    return null;
  }

  // Update header with user info
  const headerAuth = document.getElementById('adminUserInfo');
  if (headerAuth) {
    headerAuth.innerHTML = `
      <span style="font-size: 12px; color: var(--earth-faint);">${user.email}</span>
      <button onclick="window.aapSupabase.signOut()" style="margin-left: 12px; padding: 4px 12px; border: 1px solid var(--border-mid); background: none; border-radius: 4px; font-size: 11px; color: var(--earth-faint); cursor: pointer; font-family: Inter, sans-serif;">Sign Out</button>
    `;
  }

  return user;
}

function showAdminLogin() {
  const content = document.getElementById('appContent');
  const loading = document.getElementById('loadingState');
  if (loading) loading.style.display = 'none';
  if (content) content.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--cream);">
      <div style="text-align: center; max-width: 360px;">
        <h1 style="font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; color: var(--earth); margin-bottom: 8px;">Admin Portal</h1>
        <p style="font-size: 13px; color: var(--earth-faint); margin-bottom: 32px;">The Animist Apothecary</p>
        <button onclick="window.aapSupabase.signInWithGoogle()" style="display: flex; align-items: center; gap: 10px; margin: 0 auto; padding: 12px 24px; background: white; border: 1px solid var(--border-mid); border-radius: 6px; cursor: pointer; font-family: Inter, sans-serif; font-size: 14px; color: var(--earth); box-shadow: var(--shadow-soft); transition: all 0.2s;">
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
          Sign in with Google
        </button>
      </div>
    </div>
  `;
}

function showAccessDenied() {
  const content = document.getElementById('appContent');
  const loading = document.getElementById('loadingState');
  if (loading) loading.style.display = 'none';
  if (content) content.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--cream);">
      <div style="text-align: center; max-width: 360px;">
        <h1 style="font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; color: var(--earth); margin-bottom: 8px;">Access Denied</h1>
        <p style="font-size: 13px; color: var(--earth-faint); margin-bottom: 24px;">This portal is restricted to the practitioner.</p>
        <button onclick="window.aapSupabase.signOut()" style="padding: 10px 24px; background: none; border: 1px solid var(--border-mid); border-radius: 4px; cursor: pointer; font-family: Inter, sans-serif; font-size: 13px; color: var(--earth-faint);">Sign Out &amp; Return</button>
      </div>
    </div>
  `;
}

window.aapAdmin = { initAdminAuth, ADMIN_EMAILS };
