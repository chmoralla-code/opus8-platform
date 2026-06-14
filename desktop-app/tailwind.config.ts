import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        claude: {
          cream: '#FBF9F6',
          charcoal: '#191919',
          accent: '#CC5A37',
          'accent-hover': '#D47550',
          'accent-light': '#E8A87C',
          'surface-dark': '#242424',
          'text-primary-light': '#191919',
          'text-primary-dark': '#FBF9F6',
          'text-secondary-light': '#6B6B6B',
          'text-secondary-dark': '#A0A0A0',
          'border-light': '#E5E0D8',
          'border-dark': '#333333',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
