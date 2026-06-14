// ============================================================
// Opus8 Platform — Shared Constants
// ============================================================

// --- Claude Branding Theme ---
export const THEME = {
  light: {
    background: '#FBF9F6',   // Warm cream
    surface: '#FFFFFF',
    text: '#191919',
    textSecondary: '#6B6B6B',
    border: '#E5E0D8',
  },
  dark: {
    background: '#191919',   // Charcoal
    surface: '#242424',
    text: '#FBF9F6',
    textSecondary: '#A0A0A0',
    border: '#333333',
  },
  accent: '#CC5A37',         // Terracotta orange
  accentHover: '#D47550',
  accentLight: '#E8A87C',
  error: '#DC2626',
  warning: '#F59E0B',
  success: '#10B981',
} as const;

// --- Model Rebrand Map ---
export const MODEL_BRANDS = {
  'deepseek-v4-pro': {
    displayName: 'Claude Opus 8 Pro',
    description: 'Most capable model for complex coding tasks',
    tier: 'pro' as const,
  },
  'deepseek-v4-flash': {
    displayName: 'Claude Opus 8 Flash',
    description: 'Fast and efficient for everyday coding',
    tier: 'flash' as const,
  },
  'pollinations-free': {
    displayName: 'Claude Opus 8 Research (Free)',
    description: 'Free research-grade model via Pollinations AI',
    tier: 'research' as const,
  },
} as const;

// --- Billing Rates (PHP per 1M tokens, with 2x markup) ---
// Base: DeepSeek pricing in USD → PHP at 60.77 PHP/USD → 2x markup
export const USD_TO_PHP = 60.77;
export const PROFIT_MARKUP = 2.0;

export const RATES = {
  pro: {
    inputPerMillion: 52.88,    // PHP
    outputPerMillion: 105.74,  // PHP
  },
  flash: {
    inputPerMillion: 17.02,    // PHP
    outputPerMillion: 34.04,   // PHP
  },
} as const;

export const MIN_DEPOSIT_PHP = 100;

// --- API Key Prefix ---
export const API_KEY_PREFIX = 'sk_opus8_';

// --- Pollinations Vision API ---
export const POLLINATIONS_VISION_URL = 'https://pollinations.ai/api/vision';

// --- Claude Logo SVG path ---
export const CLAUDE_LOGO_PATH = '/claude-logo.svg';

// --- Admin Credentials (hardcoded fallback) ---
export const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin1234',
};

// --- GCash Reference Number Length ---
export const GCASH_REF_LENGTH = 13;
