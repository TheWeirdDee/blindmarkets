import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)']
      },
      colors: {
        "bg-base": 'var(--bg-base)',
        "bg-surface": 'var(--bg-surface)',
        "bg-primary": 'var(--bg-primary)',
        "bg-secondary": 'var(--bg-secondary)',
        "bg-glass": 'var(--bg-glass)',
        "accent": 'var(--accent)',
        "accent-primary": 'var(--accent-primary)',
        "accent-success": 'var(--accent-success)',
        "accent-warning": 'var(--accent-warning)',
        "accent-danger": 'var(--accent-danger)',
        "accent-purple": 'var(--accent-purple)',
        "text-primary": 'var(--text-primary)',
        "text-secondary": 'var(--text-secondary)',
        "text-muted": 'var(--text-muted)',
        "privacy-high": 'var(--privacy-high)',
        "privacy-medium": 'var(--privacy-medium)',
        "privacy-public": 'var(--privacy-public)',
        "status-success": 'var(--status-success)',
        "status-pending": 'var(--status-pending)',
        "status-error": 'var(--status-error)',
        "status-cancelled": 'var(--status-cancelled)',
        "risk-low": 'var(--risk-low)',
        "risk-medium": 'var(--risk-medium)',
        "risk-high": 'var(--risk-high)',
        "mono": 'var(--mono)'
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)'
      },
      boxShadow: {
        glass: 'var(--glass-shadow)'
      }
    }
  },
  plugins: []
};

export default config;
