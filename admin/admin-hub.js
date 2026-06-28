// Shared admin hub navigation + auth gate.
// Used by the satellite admin pages (seasonal-arcs, virtual-sessions, emails).
// admin/index.html keeps its own inline sidebar but mirrors this NAV order.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ICONS, paintIcons } from './hub-icons.js';

const SUPABASE_URL = 'https://wdecjlrfulsdklqeetqb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZWNqbHJmdWxzZGtscWVldHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODQwMTQsImV4cCI6MjA4ODY2MDAxNH0.mIBgkpU24IgxnzS8kR06FOL6_1Z9NmaEDe9z36CxtHs';
const ADMIN_EMAILS = ['adimarie@bodyworkandbotanicals.com', 'its.adimarie@gmail.com'];

const NAV = [
  { label: 'Dashboard',            icon: 'layout-grid',   href: '/admin/' },
  { label: 'Bookings',             icon: 'calendar',      href: '/admin/bookings.html' },
  { label: 'Ceremonies',           icon: 'flame',         href: '/admin/#ceremony-admin' },
  { label: 'Seasonal Arcs',        icon: 'sun',           href: '/admin/seasonal-arcs.html' },
  { label: 'Virtual Sessions',     icon: 'device-laptop', href: '/admin/virtual-sessions.html' },
  { label: 'In-Person Gatherings', icon: 'users',         href: '/admin/events.html' },
  { label: 'Contacts',             icon: 'address-book',  href: '/admin/#contacts' },
  { label: 'Emails',               icon: 'mail',          href: '/admin/emails.html' },
  { label: 'Site content',         icon: 'file-text',     href: '/studio/' },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Gate the page, render the sidebar, reveal content. Pass the active item's label.
export async function initHub(active) {
  const { data: { session } } = await supabase.auth.getSession();
  const email = (session?.user?.email || '').toLowerCase();
  if (!session || !ADMIN_EMAILS.includes(email)) {
    location.replace('/admin/');
    return;
  }

  const side = document.getElementById('hub-sidebar');
  if (side) {
    side.innerHTML =
      '<div class="brand"><h3>The Animist Apothecary</h3><span>Admin Portal</span></div>' +
      NAV.map(n =>
        `<a href="${n.href}" class="sidebar-item${n.label === active ? ' active' : ''}" style="text-decoration:none;">` +
        `<span class="sidebar-icon ti-svg">${ICONS[n.icon] || ''}</span> ${n.label}</a>`
      ).join('') +
      '<div class="sidebar-spacer"></div>' +
      `<button class="sidebar-item" id="hub-signout"><span class="sidebar-icon ti-svg">${ICONS['logout']}</span> Sign Out</button>`;
    const signout = document.getElementById('hub-signout');
    if (signout) signout.onclick = async () => { await supabase.auth.signOut(); location.replace('/admin/'); };
  }

  paintIcons(document);

  const app = document.getElementById('hub-app');
  if (app) app.style.display = 'flex';
}
