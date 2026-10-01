/**
 * Single source of truth for the QubitLab colour + type scale.
 *
 * Consumed by:
 *  - tailwind.config.js (theme.extend.colors)
 *  - src/tests/contrast.test.ts (WCAG assertions)
 *  - components that need a raw hex for inline styles (canvas/SVG marks)
 *
 * `src/index.css` mirrors these values in CSS custom properties; keep both in step.
 * Every "readable text" pair asserted in the contrast test must be >= 4.5:1.
 */

export const colors = {
  // Brand
  navy: '#1F497D', // 9.10:1 with white
  brand: '#0070C0', // 5.15:1 with white

  // Gate / accent fills
  purple: '#6B4E8E', // 6.76:1 with white
  teal: '#4BACC6', // needs dark text: 6.77:1 with #111827
  orange: '#F79646', // needs dark text: 7.95:1 with #111827
  green: '#3F6212', // 7.08:1 with white
  danger: '#A93A37', // 6.27:1 with white

  // Text-safe variants of the accent fills (never use the fill itself as text)
  'brand-text': '#00629F', // 6.47:1 with white, 5.60:1 on the brand tint
  'accent-text-orange': '#9A4E00', // 6.06:1 with white
  'accent-text-teal': '#1F6E82', // 5.82:1 with white
  'accent-orange-strong': '#C2410C', // 4.83:1 with white - status dots that must read as orange

  // Surfaces + text
  surface: '#F5F7FA',
  muted: '#4B5563', // 7.56:1 with white - minimum for any readable text
  text: '#111827', // 17.4:1 with white - body copy
  'on-accent': '#111827', // text used on top of orange/teal fills
  'disabled-text': '#4B5563', // 6.10:1 on the disabled gray-200 fill

  // Dark surfaces
  'dark-bg': '#0F172A',
  'dark-surface': '#1E293B',
};

/** Tints used behind status chips and callouts (backgrounds only, never text). */
export const tints = {
  'brand-tint': '#E6F0F8',
  'purple-tint': '#F0EEF4',
  'orange-tint': '#FEF5EB',
  'green-tint': '#F1F5EC',
  'danger-tint': '#F7ECEC',
  'disabled-fill': '#E5E7EB',
  'disabled-label': '#E5E7EB',
};

export const fontSize = {
  /** Smallest size allowed for any label. */
  label: '13px',
  /** Body copy. */
  body: '14px',
  'body-lg': '16px',
};

export const radius = {
  chip: '6px',
  tile: '8px',
  panel: '12px',
};

/** Layout constants shared by the tutor drawer. */
export const layout = {
  tutorDrawerWidth: 420,
  tutorDrawerTransitionMs: 250,
  tutorDrawerBreakpointPx: 1024,
};

/**
 * Green keeps a full shade scale: several pages use `bg-green-50` /
 * `border-green-200`, and flattening `green` to a single hex silently drops
 * those classes from the build. DEFAULT is the accessible #3F6212.
 */
const greenScale = {
  50: '#F7FAF1',
  100: '#ECF3E0',
  200: '#D8E6C2',
  300: '#BBD097',
  400: '#97B468',
  500: '#77933C',
  600: '#55702C',
  700: '#3F6212',
  800: '#334E10',
  900: '#2A3F0E',
};

/** Tailwind theme colours, derived from `colors` so there is one source of truth. */
export const palette = {
  navy: colors.navy,
  brand: colors.brand,
  purple: colors.purple,
  teal: colors.teal,
  orange: colors.orange,
  green: { DEFAULT: colors.green, ...greenScale },
  danger: colors.danger,
  surface: colors.surface,
  muted: colors.muted,
  text: colors.text,
  'brand-text': colors['brand-text'],
  'accent-text-orange': colors['accent-text-orange'],
  'accent-text-teal': colors['accent-text-teal'],
  'accent-orange-strong': colors['accent-orange-strong'],
  'on-accent': colors['on-accent'],
  'disabled-text': colors['disabled-text'],
  'brand-tint': tints['brand-tint'],
  'purple-tint': tints['purple-tint'],
  'orange-tint': tints['orange-tint'],
  'green-tint': tints['green-tint'],
  'danger-tint': tints['danger-tint'],
  'disabled-fill': tints['disabled-fill'],
  'dark-bg': colors['dark-bg'],
  'dark-surface': colors['dark-surface'],
};

/** Relative luminance per WCAG 2.1. */
export function relativeLuminance(hex) {
  const clean = hex.trim().replace('#', '');
  const channel = (offset) => {
    const raw = parseInt(clean.slice(offset, offset + 2), 16) / 255;
    return raw <= 0.03928 ? raw / 12.92 : Math.pow((raw + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

/** WCAG 2.1 contrast ratio between two hex colours (1 - 21). */
export function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

export default { colors, tints, palette, fontSize, radius, layout, contrastRatio, relativeLuminance };