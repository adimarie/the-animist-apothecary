/**
 * Brand Configuration Module
 *
 * Single source of truth for all brand tokens (colors, fonts, logos, etc.).
 * Loads from Supabase `brand_config` table with hardcoded fallback.
 * Used by: email templates, style guide page, any new collateral.
 */

import { getSupabase } from './supabase.js';

// Hardcoded fallback (matches the DB seed exactly)
const FALLBACK_CONFIG = {
  brand: {
    primary_name: 'The Animist Apothecary',
    full_name: 'The Animist Apothecary',
    platform_name: 'Animist Apothecary',
    legal_name: 'The Animist Apothecary',
    tagline: 'All beings carry spirit',
    address: 'Los Angeles, CA',
    website: 'https://theanimistapothecary.com',
  },
  colors: {
    primary: {
      background: '#141210',
      background_muted: '#1e1a17',
      background_dark: '#0c0a09',
      text: '#e8e0d4',
      text_light: '#f5f0e8',
      text_muted: '#8a7e72',
      accent: '#c9a84c',
      accent_hover: '#d4aa4a',
      accent_light: 'rgba(201, 168, 76, 0.12)',
      border: '#2e2924',
    },
    status: {
      success: '#5a7c5a',
      success_light: 'rgba(90, 124, 90, 0.15)',
      error: '#8f3d4b',
      error_light: 'rgba(143, 61, 75, 0.15)',
      warning: '#c9a84c',
      warning_light: 'rgba(201, 168, 76, 0.15)',
      info: '#4a6b8a',
      info_light: 'rgba(74, 107, 138, 0.15)',
    },
    tiers: {
      patron: '#c4943a',
      abundance: '#5a7c5a',
      community: '#4a6b8a',
      accessibility: '#7c5a8a',
    },
  },
  typography: {
    font_family: 'Cormorant Garamond',
    font_family_body: 'Lora',
    font_import: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap",
    font_stack: "'Cormorant Garamond', Georgia, serif",
    font_stack_body: "'Lora', Georgia, serif",
    font_stack_mono: "'SF Mono', 'Menlo', monospace",
    scale: { h1: '3.25rem', h2: '2.5rem', h3: '1.875rem', h4: '1.375rem', body: '1rem', small: '0.875rem', tiny: '0.75rem' },
    weights: { light: 300, regular: 400, medium: 500, semibold: 600, bold: 700 },
  },
  logos: {
    base_url: 'https://wdecjlrfulsdklqeetqb.supabase.co/storage/v1/object/public/housephotos/logos',
    icon_dark: 'logo-black-transparent.png',
    icon_light: 'logo-white-transparent.png',
    wordmark_dark: 'wordmark-black-transparent.png',
    wordmark_light: 'wordmark-white-transparent.png',
    sizes: {
      header_icon: '30px',
      header_wordmark: '22px',
      footer_icon: '52px',
      footer_wordmark: '24px',
      email_icon: '40px',
      email_wordmark: '28px',
    },
  },
  visual: {
    border_radius: { small: '6px', standard: '8px', large: '16px', pill: '100px' },
    shadows: {
      small: '0 1px 2px rgba(42, 31, 35, 0.04)',
      standard: '0 2px 8px rgba(42, 31, 35, 0.06), 0 1px 2px rgba(42, 31, 35, 0.04)',
      large: '0 8px 24px rgba(42, 31, 35, 0.08), 0 2px 6px rgba(42, 31, 35, 0.04)',
      accent_glow: '0 2px 8px rgba(212, 136, 58, 0.30)',
    },
    transitions: { standard: '0.2s ease', slow: '0.4s cubic-bezier(0.16, 1, 0.3, 1)' },
  },
  email: {
    max_width: '600px',
    header: { background: '#141210', text_color: '#e8e0d4', padding: '32px', logo_height: '40px', wordmark_height: '20px' },
    body: { background: '#1e1a17', text_color: '#e8e0d4', text_muted: '#8a7e72', padding: '32px', line_height: '1.6' },
    callout: { background: '#262220', border_color: '#2e2924', border_radius: '4px', padding: '20px 24px' },
    button: { background: '#c9a84c', text_color: '#141210', border_radius: '4px', padding: '14px 36px', font_weight: '600', shadow: '0 2px 8px rgba(201, 168, 76, 0.30)' },
    footer: { background: '#0c0a09', text_color: '#8a7e72', border_top: '1px solid #2e2924', padding: '20px 32px' },
  },
};

let _cachedConfig = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load brand config from DB with fallback to hardcoded values.
 * Caches for 5 minutes.
 */
export async function getBrandConfig() {
  if (_cachedConfig && Date.now() - _cacheTime < CACHE_TTL) {
    return _cachedConfig;
  }

  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('brand_config')
      .select('config')
      .eq('id', 1)
      .single();

    if (data && !error) {
      _cachedConfig = data.config;
      _cacheTime = Date.now();
      return _cachedConfig;
    }
  } catch (e) {
    console.warn('Failed to load brand config from DB, using fallback:', e);
  }

  _cachedConfig = FALLBACK_CONFIG;
  _cacheTime = Date.now();
  return FALLBACK_CONFIG;
}

/**
 * Get the hardcoded fallback config (no DB call).
 * Useful for synchronous access or when Supabase isn't available.
 */
export function getBrandConfigSync() {
  return _cachedConfig || FALLBACK_CONFIG;
}

/**
 * Build a full logo URL from a filename.
 */
export function logoUrl(filename, config = null) {
  const c = config || getBrandConfigSync();
  return `${c.logos.base_url}/${filename}`;
}

/**
 * Invalidate the cache (e.g., after admin updates the config).
 */
export function invalidateBrandCache() {
  _cachedConfig = null;
  _cacheTime = 0;
}
