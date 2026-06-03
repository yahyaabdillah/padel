// PadelHub — platform default settings / theme presets (dummy, no DB).

/**
 * A brand palette preset. Each preset carries a FULL token set (primary /
 * accent / secondary hexes). ThemeContext.applyPalette() reads these and writes
 * the corresponding CSS custom properties on :root at runtime, so switching a
 * preset recolors the whole app live. The default ("padelhub") reproduces the
 * stylesheet's stock Indigo / Lime / Teal — selecting it is a visual no-op.
 */
export interface BrandPreset {
  id: string;
  name: string;
  /** brand / CTA / active-nav colour */
  primary: string;
  /** highlight / ball-motif colour */
  accent: string;
  /** secondary actions / charts colour */
  secondary: string;
}

export const brandPresets: BrandPreset[] = [
  // Default — Electric Indigo / Padel Lime / Court Teal. MUST match globals.css.
  { id: "padelhub", name: "PadelHub (default)", primary: "#6D5BFF", accent: "#C6FF3D", secondary: "#14B8A6" },
  // On-brand indigo variant — punchier indigo, same lime/teal family.
  { id: "indigo-pop", name: "Indigo Pop", primary: "#5B3DF5", accent: "#D4FF4D", secondary: "#1FC8B4" },
  // Warm clay-court energy.
  { id: "clay", name: "Clay Court", primary: "#EA580C", accent: "#FACC15", secondary: "#16A34A" },
  // Deep violet smash.
  { id: "midnight", name: "Midnight Smash", primary: "#4F46E5", accent: "#A3E635", secondary: "#8B5CF6" },
  // Optional cool palettes (NOT the brand default — offered as choices only).
  { id: "court-night", name: "Court Night", primary: "#7C3AED", accent: "#22D3EE", secondary: "#0EA5E9" },
  { id: "ocean", name: "Ocean Glass", primary: "#2563EB", accent: "#38BDF8", secondary: "#0D9488" },
];

export interface PlatformDefaults {
  productName: string;
  tagline: string;
  supportEmail: string;
  defaultCurrency: string;
  defaultTimezone: string;
  defaultLocale: string;
  defaultTrialDays: number;
  brandPresetId: string;
  logoText: string;
  allowSelfSignup: boolean;
  requireCardOnTrial: boolean;
  enforce2fa: boolean;
  maintenanceMode: boolean;
}

export const platformDefaults: PlatformDefaults = {
  productName: "PadelHub",
  tagline: "Run your padel club like a pro.",
  supportEmail: "support@padelhub.io",
  defaultCurrency: "IDR",
  defaultTimezone: "Asia/Jakarta",
  defaultLocale: "id-ID",
  defaultTrialDays: 30,
  brandPresetId: "padelhub",
  logoText: "PadelHub",
  allowSelfSignup: true,
  requireCardOnTrial: false,
  enforce2fa: true,
  maintenanceMode: false,
};

export const currencyOptions = [
  { value: "IDR", label: "Indonesian Rupiah (IDR)" },
  { value: "USD", label: "US Dollar (USD)" },
  { value: "SGD", label: "Singapore Dollar (SGD)" },
  { value: "MYR", label: "Malaysian Ringgit (MYR)" },
  { value: "EUR", label: "Euro (EUR)" },
];

export const timezoneOptions = [
  { value: "Asia/Jakarta", label: "Asia/Jakarta (WIB, GMT+7)" },
  { value: "Asia/Makassar", label: "Asia/Makassar (WITA, GMT+8)" },
  { value: "Asia/Jayapura", label: "Asia/Jayapura (WIT, GMT+9)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (GMT+8)" },
  { value: "Asia/Kuala_Lumpur", label: "Asia/Kuala Lumpur (GMT+8)" },
];

export const localeOptions = [
  { value: "id-ID", label: "Bahasa Indonesia" },
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
];
