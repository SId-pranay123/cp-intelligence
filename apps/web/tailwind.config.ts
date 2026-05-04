import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        base: '#06060a',
        surface: '#0d0d15',
        card: '#111119',
        'border-default': '#1a1a2a',
        'border-hover': '#2a2a3e',
        accent: '#818cf8',
        'accent-dim': '#1e1b4b',
      },
    },
  },
  plugins: [],
};

export default config;
