export interface ColorTokens {
  navy: string;
  brand: string;
  purple: string;
  teal: string;
  orange: string;
  green: string;
  danger: string;
  'brand-text': string;
  'accent-text-orange': string;
  'accent-text-teal': string;
  'accent-orange-strong': string;
  surface: string;
  muted: string;
  text: string;
  'on-accent': string;
  'disabled-text': string;
  'dark-bg': string;
  'dark-surface': string;
  [key: string]: string;
}

export interface TintTokens {
  'brand-tint': string;
  'purple-tint': string;
  'orange-tint': string;
  'green-tint': string;
  'danger-tint': string;
  'disabled-fill': string;
  'disabled-label': string;
  [key: string]: string;
}

export interface FontSizeTokens {
  label: string;
  body: string;
  'body-lg': string;
}

export interface RadiusTokens {
  chip: string;
  tile: string;
  panel: string;
}

export interface LayoutTokens {
  tutorDrawerWidth: number;
  tutorDrawerTransitionMs: number;
  tutorDrawerBreakpointPx: number;
}

export type PaletteTokens = Record<string, string | Record<string | number, string>>;

export declare const colors: ColorTokens;
export declare const tints: TintTokens;
export declare const palette: PaletteTokens;
export declare const fontSize: FontSizeTokens;
export declare const radius: RadiusTokens;
export declare const layout: LayoutTokens;
export declare function relativeLuminance(hex: string): number;
export declare function contrastRatio(foreground: string, background: string): number;

declare const tokens: {
  colors: ColorTokens;
  tints: TintTokens;
  palette: PaletteTokens;
  fontSize: FontSizeTokens;
  radius: RadiusTokens;
  layout: LayoutTokens;
  contrastRatio: typeof contrastRatio;
  relativeLuminance: typeof relativeLuminance;
};
export default tokens;