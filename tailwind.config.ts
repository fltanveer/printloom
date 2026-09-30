import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'color-mix(in srgb, var(--bg) calc(<alpha-value> * 100%), transparent)',
        surface: 'color-mix(in srgb, var(--surface) calc(<alpha-value> * 100%), transparent)',
        'surface-2': 'color-mix(in srgb, var(--surface-2) calc(<alpha-value> * 100%), transparent)',
        border: 'color-mix(in srgb, var(--border) calc(<alpha-value> * 100%), transparent)',
        text: 'color-mix(in srgb, var(--text) calc(<alpha-value> * 100%), transparent)',
        muted: 'color-mix(in srgb, var(--text-muted) calc(<alpha-value> * 100%), transparent)',
        accent: 'color-mix(in srgb, var(--accent) calc(<alpha-value> * 100%), transparent)',
        'accent-text': 'color-mix(in srgb, var(--accent-text) calc(<alpha-value> * 100%), transparent)',
        'accent-soft': 'color-mix(in srgb, var(--accent-soft) calc(<alpha-value> * 100%), transparent)',
        customer: '#6D4AFF',
        vendor: '#FF7A1A',
        designer: '#FF3D8B',
        admin: '#0FB5A6',
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
      },
      borderRadius: { input: '12px', card: '16px', sheet: '24px' },
      boxShadow: {
        s1: '0 1px 2px rgba(15,15,30,.06), 0 1px 3px rgba(15,15,30,.08)',
        s2: '0 4px 12px -2px rgba(15,15,30,.10), 0 2px 6px rgba(15,15,30,.06)',
        s3: '0 18px 40px -12px rgba(15,15,30,.25), 0 6px 16px rgba(15,15,30,.08)',
        glow: '0 10px 30px -10px var(--accent)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Space Grotesk', 'Noto Sans Bengali', 'system-ui', 'sans-serif'],
        sans: ['var(--font-inter)', 'Inter', 'Noto Sans Bengali', 'system-ui', 'sans-serif'],
      },
      screens: { xs: '375px' },
    },
  },
  plugins: [],
};
export default config;
