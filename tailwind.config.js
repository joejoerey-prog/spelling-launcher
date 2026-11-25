/** @type {import('tailwindcss').Config} */
// Graphite neutrals, one ochre accent (accent-*), muted green for "fixed", default amber/rose for warning/error.
const graphite = {
  50: '#f7f7f8', 100: '#ededed', 200: '#dcdcdf', 300: '#c4c4c8', 400: '#a1a1a6',
  500: '#85858b', 600: '#4a4a4e', 700: '#2f2f32', 800: '#232325', 850: '#19191b',
  900: '#141415', 950: '#0f0f10',
};
const accent = {
  50: '#faf5e8', 100: '#f3e8c8', 200: '#ecd9a6', 300: '#e3c783', 400: '#d8b25c',
  500: '#c99a3c', 600: '#a07f35', 700: '#78602a', 800: '#54421f', 900: '#3a2e18', 950: '#241c0e',
};
const green = {
  50: '#eefaf3', 100: '#d2f3e3', 200: '#a8e6c8', 300: '#7fd9ab', 400: '#4cc38a',
  500: '#3aa874', 600: '#2f8f64', 700: '#256f4e', 800: '#1b3a2c', 900: '#14291f', 950: '#0f1f18',
};
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: graphite,
        accent,
        emerald: green,
        teal: green,
      },
      fontFamily: {
        sans: ['Geist Variable', 'Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Geist Mono Variable', 'Geist Mono', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        serif: ['Newsreader Variable', 'Newsreader', 'Iowan Old Style', 'New York', 'Georgia', 'serif'],
      },
      // tailwindcss-animate is not installed, so the old `animate-in` classes did nothing.
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'modal-in': { from: { opacity: '0', transform: 'scale(0.97)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'toast-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms cubic-bezier(0.23, 1, 0.32, 1)',
        'modal-in': 'modal-in 180ms cubic-bezier(0.23, 1, 0.32, 1)',
        'toast-in': 'toast-in 200ms cubic-bezier(0.23, 1, 0.32, 1)',
      },
      transitionTimingFunction: { DEFAULT: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  plugins: [],
}
