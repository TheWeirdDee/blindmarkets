import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Sora"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      colors: {
        "bg-primary": '#050505',
        "bg-secondary": '#111111',
        "accent-primary": '#00d1ff',
        "accent-success": '#19d3a2',
        "accent-warning": '#ff9f1c',
        "accent-danger": '#ff4d6d',
        "accent-purple": '#8f7dff',
        "text-primary": '#f5f5f5',
        "text-secondary": '#c7c7c7',
        "text-muted": '#8e8e8e'
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.35)'
      }
    }
  },
  plugins: []
};

export default config;
