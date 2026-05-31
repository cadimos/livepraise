/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './apps/**/*.{html,vue,ts,tsx,js}',
    './web/**/*.{html,vue,ts,tsx,js}',
  ],
  theme: {
    extend: {
      colors: {
        lp: {
          primary: 'var(--lp-color-primary)',
          'action-bar': 'var(--lp-color-action-bar)',
          background: 'var(--lp-color-background)',
          surface: 'var(--lp-color-surface)',
          text: 'var(--lp-color-text)',
          muted: 'var(--lp-color-muted)',
          accent: 'var(--lp-color-accent)',
          'selection-list': {
            DEFAULT: 'var(--lp-selection-list-bg)',
            text: 'var(--lp-selection-list-text)',
            hover: 'var(--lp-selection-list-hover)',
            ring: 'var(--lp-selection-list-ring)',
          },
          'selection-nav': {
            DEFAULT: 'var(--lp-selection-nav-bg)',
            text: 'var(--lp-selection-nav-text)',
            hover: 'var(--lp-selection-nav-hover)',
            'chip-bg': 'var(--lp-selection-nav-chip-bg)',
            'chip-border': 'var(--lp-selection-nav-chip-border)',
            'chip-hover': 'var(--lp-selection-nav-chip-hover)',
          },
          'selection-active': {
            DEFAULT: 'var(--lp-selection-active-bg)',
            text: 'var(--lp-selection-active-text)',
            hover: 'var(--lp-selection-active-hover)',
            ring: 'var(--lp-selection-active-ring)',
          },
        },
      },
      fontFamily: {
        lp: 'var(--lp-font-family)',
      },
    },
  },
  plugins: [],
};
