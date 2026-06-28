// Inline SVG icons for the admin hub — no external font/CDN dependency, always renders.
// Usage: put <span class="ti-svg" data-ic="calendar"></span> in markup, then call paintIcons().
const W = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">';

export const ICONS = {
  'layout-grid': W + '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
  'calendar': W + '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M16 3v4M8 3v4M4 11h16"/></svg>',
  'flame': W + '<path d="M12 3c1 3-1 5-2.5 6.5S7 13 7 15a5 5 0 0 0 10 0c0-1.5-.5-3-1.5-4 .2 1.2-.8 2-1.5 2 .8-2.2-.5-4.8-2-6z"/></svg>',
  'sun': W + '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>',
  'device-laptop': W + '<rect x="5" y="6" width="14" height="10" rx="1"/><path d="M3 19h18"/></svg>',
  'users': W + '<circle cx="9" cy="8" r="3"/><path d="M4 20v-1a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v1"/><path d="M16 5.5a3 3 0 0 1 0 5"/><path d="M20 20v-1a4 4 0 0 0-2.5-3.7"/></svg>',
  'address-book': W + '<rect x="6" y="3" width="13" height="18" rx="2"/><circle cx="12.5" cy="10" r="2"/><path d="M9.5 16a3 3 0 0 1 6 0"/><path d="M3 8h3M3 12h3M3 16h3"/></svg>',
  'mail': W + '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  'file-text': W + '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><path d="M9 13h6M9 17h4"/></svg>',
  'logout': W + '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>',
};

export function paintIcons(root) {
  (root || document).querySelectorAll('[data-ic]').forEach(el => {
    const svg = ICONS[el.dataset.ic];
    if (svg) el.innerHTML = svg;
  });
}
