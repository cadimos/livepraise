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
        },
      },
      fontFamily: {
        lp: 'var(--lp-font-family)',
      },
    },
  },
  plugins: [],
};
