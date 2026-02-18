import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'hsl(var(--bg))',
        fg: 'hsl(var(--fg))',
        panel: 'hsl(var(--panel))',
        accent: 'hsl(var(--accent))'
      },
      boxShadow: {
        glow: '0 0 20px hsl(var(--accent) / 0.4)'
      }
    }
  },
  plugins: []
};
export default config;
