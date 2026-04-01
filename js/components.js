// Shared UI components for The Animist Apothecary portals

const Components = {
  // Loading skeleton
  skeleton(lines = 3) {
    return Array(lines).fill('').map((_, i) =>
      `<div style="height: 14px; background: var(--cream-dark); border-radius: 4px; margin-bottom: 10px; width: ${80 + Math.random() * 20}%; animation: pulse 1.5s ease infinite;"></div>`
    ).join('') + '<style>@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }</style>';
  },

  // Metric card
  metricCard(label, value, sub = '') {
    return `<div class="metric-card"><div class="metric-label">${label}</div><div class="metric-value">${value}</div>${sub ? `<div class="metric-sub">${sub}</div>` : ''}</div>`;
  },

  // Status tag
  tag(text, type = 'active') {
    return `<span class="tag ${type}">${text}</span>`;
  },

  // Tier badge
  tierBadge(tier) {
    const colors = { patron: 'gold', abundance: 'green', community: 'blue', accessibility: 'purple' };
    const color = colors[tier.toLowerCase()] || 'gold';
    return `<span class="tier t-${color}">${tier}</span>`;
  },

  // Step dot for progression matrix
  stepDot(status, label = '', tooltip = '') {
    const classes = { done: 'done', current: 'current', pending: 'pending', flagged: 'flagged' };
    const cls = classes[status] || 'pending';
    const content = status === 'done' ? '&#10003;' : status === 'flagged' ? '!' : label;
    const tip = tooltip ? `<div class="step-tooltip">${tooltip}</div>` : '';
    return `<td class="step-cell"><span class="step-dot ${cls}">${content}</span>${tip}</td>`;
  },

  // Progress bar
  progressBar(pct, thin = false) {
    const h = thin ? '3px' : '6px';
    return `<div style="height: ${h}; background: var(--cream-dark); border-radius: 2px; overflow: hidden;"><div style="height: 100%; width: ${pct}%; background: linear-gradient(90deg, var(--sage-light), var(--sage)); border-radius: 2px; transition: width 0.6s ease;"></div></div>`;
  },

  // Toast notification
  toast(message, type = 'info') {
    const colors = { success: 'var(--sage)', error: '#c75a3a', info: 'var(--gold)' };
    const el = document.createElement('div');
    el.style.cssText = `position: fixed; bottom: 24px; right: 24px; padding: 14px 24px; background: ${colors[type] || colors.info}; color: white; border-radius: 6px; font-family: Inter, sans-serif; font-size: 13px; z-index: 9999; box-shadow: 0 4px 16px rgba(0,0,0,0.15); transition: opacity 0.3s;`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
  },

  // Empty state
  emptyState(message) {
    return `<div style="text-align: center; padding: 48px 24px; color: var(--earth-faint);"><p style="font-family: 'Cormorant Garamond', serif; font-size: 18px; font-style: italic;">${message}</p></div>`;
  },

  // Format date
  fmtDate(iso) {
    if (!iso) return '&mdash;';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  fmtDateTime(iso) {
    if (!iso) return '&mdash;';
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  },

  fmtCurrency(cents) {
    if (!cents) return '$0';
    return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 });
  },
};

window.Components = Components;
