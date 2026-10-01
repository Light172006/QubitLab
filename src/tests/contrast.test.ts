import { describe, it, expect } from 'vitest';
import { colors, tints, fontSize, contrastRatio } from '../design/tokens.js';

/**
 * WCAG 2.1 AA guard rails for the QubitLab palette.
 *
 * Any readable text pair below 4.5:1 fails this suite, so contrast has to be
 * fixed in `src/design/tokens.js` rather than patched at the call site.
 */

/** Text pairs that must clear AA for normal-size text (4.5:1). */
const READABLE_TEXT_PAIRS: Array<[string, string, string]> = [
  ['body text on white', colors.text, '#FFFFFF'],
  ['body text on surface', colors.text, colors.surface],
  ['body text on gray-50', colors.text, '#F9FAFB'],

  ['secondary text on white', colors.muted, '#FFFFFF'],
  ['secondary text on surface', colors.muted, colors.surface],
  ['secondary text on gray-50', colors.muted, '#F9FAFB'],
  ['secondary text on gray-100', colors.muted, '#F3F4F6'],
  ['secondary text on blue-50', colors.muted, '#EFF6FF'],

  ['brand text on white', colors.brand, '#FFFFFF'],
  ['brand text on brand tint', colors['brand-text'], tints['brand-tint']],

  ['purple text on white', colors.purple, '#FFFFFF'],
  ['purple text on purple tint', colors.purple, tints['purple-tint']],

  ['success text on white', colors.green, '#FFFFFF'],
  ['success text on green tint', colors.green, tints['green-tint']],

  ['danger text on white', colors.danger, '#FFFFFF'],
  ['danger text on danger tint', colors.danger, tints['danger-tint']],

  ['orange accent text on white', colors['accent-text-orange'], '#FFFFFF'],
  ['orange accent text on orange tint', colors['accent-text-orange'], tints['orange-tint']],
  ['teal accent text on white', colors['accent-text-teal'], '#FFFFFF'],
  ['orange status dot on white', colors['accent-orange-strong'], '#FFFFFF'],

  ['white on navy', '#FFFFFF', colors.navy],
  ['white on brand', '#FFFFFF', colors.brand],
  ['white on purple', '#FFFFFF', colors.purple],
  ['white on measure fill', '#FFFFFF', colors.muted],

  ['dark text on orange gate', colors['on-accent'], colors.orange],
  ['dark text on teal gate', colors['on-accent'], colors.teal],

  ['disabled label on disabled fill', colors['disabled-text'], tints['disabled-fill']],
];

/** Non-text UI (icons, borders, marks) only needs 3:1. */
const NON_TEXT_PAIRS: Array<[string, string, string]> = [
  ['brand mark on white', colors.brand, '#FFFFFF'],
  ['purple mark on white', colors.purple, '#FFFFFF'],
  ['success mark on white', colors.green, '#FFFFFF'],
  ['danger mark on white', colors.danger, '#FFFFFF'],
];

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

describe('WCAG contrast of design tokens', () => {
  it.each(READABLE_TEXT_PAIRS)('%s is at least %s:1', (_label, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(NON_TEXT_PAIRS)('%s is at least %s:1', (_label, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it('never uses an accent fill as readable text colour', () => {
    // orange/teal/purple fills are for gate marks; text uses the darkened tokens.
    expect(contrastRatio(colors.orange, '#FFFFFF')).toBeLessThan(AA_TEXT);
    expect(contrastRatio(colors.teal, '#FFFFFF')).toBeLessThan(AA_TEXT);
  });

  it('keeps secondary text at or above the muted token luminance', () => {
    // Guards against a lighter grey sneaking back in (e.g. #9CA3AF).
    const lightGreys = ['#9CA3AF', '#A0AEC0', '#D1D5DB', '#E5E7EB'];
    for (const grey of lightGreys) {
      expect(contrastRatio(grey, '#FFFFFF')).toBeLessThan(contrastRatio(colors.muted, '#FFFFFF'));
    }
  });
});

describe('typography scale', () => {
  it('never goes below 13px for labels', () => {
    const sizes = Object.values(fontSize).map((value) => parseInt(value, 10));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(13);
  });
});