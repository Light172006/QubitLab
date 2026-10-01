/** @type {import('tailwindcss').Config} */
import { palette } from './src/design/tokens.js';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Single source of truth: ./src/design/tokens.js
      colors: palette,
      fontSize: {
        // 13px is the floor for any label; body copy is 14-16px.
        label: ['13px', { lineHeight: '1.3' }],
        body: ['14px', { lineHeight: '1.5' }],
        'body-lg': ['16px', { lineHeight: '1.6' }],
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      maxWidth: {
        tutor: '420px',
      },
      width: {
        tutor: '420px',
      },
      transitionDuration: {
        drawer: '250ms',
      },
      animation: {
        'pulse-once': 'pulseOnce 500ms ease-out',
        'bloch-move': 'blochMove 400ms ease-out',
        'bar-grow': 'barGrow 250ms ease-out',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        pulseOnce: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        blochMove: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        barGrow: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--bar-width)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}