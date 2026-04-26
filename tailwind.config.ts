import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0E0C0A',
          2: '#1C1A17',
        },
        parchment: {
          DEFAULT: '#F5F0E8',
          2: '#EDE8DC',
        },
        cream: '#FAF8F3',
        gold: {
          DEFAULT: '#B8860B',
          light: '#D4A017',
          bright: '#EEC900',
        },
        teal: {
          DEFAULT: '#0D7377',
          light: '#14A0A5',
        },
        rust: '#C0392B',
        'law-green': '#1A6B3A',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display': ['58px', { lineHeight: '1.1', fontWeight: '600' }],
        'display-md': ['42px', { lineHeight: '1.15', fontWeight: '600' }],
        'heading-xl': ['36px', { lineHeight: '1.2', fontWeight: '600' }],
        'heading-lg': ['28px', { lineHeight: '1.25', fontWeight: '600' }],
        'heading-md': ['22px', { lineHeight: '1.3', fontWeight: '600' }],
      },
      boxShadow: {
        card: '0 1px 3px rgba(14,12,10,0.06), 0 1px 2px rgba(14,12,10,0.04)',
        'card-hover': '0 4px 12px rgba(14,12,10,0.08)',
        gold: '0 0 0 2px rgba(184,134,11,0.3)',
      },
      borderColor: {
        subtle: 'rgba(14,12,10,0.08)',
        DEFAULT: 'rgba(14,12,10,0.12)',
      },
      animation: {
        'fade-up': 'fadeUp 0.3s ease forwards',
        'float': 'float 4s ease-in-out infinite',
        'float-delay': 'float 4s ease-in-out 1.5s infinite',
        'float-delay-2': 'float 4s ease-in-out 3s infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
