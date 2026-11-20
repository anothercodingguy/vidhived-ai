/*
 * Colours come from the CSS variables in app/globals.css (the single source
 * of truth). This file only gives them Tailwind class names:
 *
 *   --color-bg                 bg-canvas
 *   --color-surface*           bg-surface, bg-surface-raised, bg-surface-hover
 *   --color-border*            border-line, border-line-strong
 *   --color-text*              text-ink, text-ink-secondary, text-ink-muted
 *   --color-primary            text-primary, bg-primary/10   (text-safe blue)
 *   --color-primary-solid      bg-primary-solid              (filled buttons)
 *   --color-risk-*             text-risk-high, bg-risk-medium, ...
 *
 * Because the variables change between :root (dark) and .light, these
 * classes follow the theme on their own. No `dark:` variants are needed.
 */
const token = (name) => `rgb(var(${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: token('--color-bg'),
        surface: {
          DEFAULT: token('--color-surface'),
          raised: token('--color-surface-raised'),
          hover: token('--color-surface-hover'),
        },
        line: {
          DEFAULT: token('--color-border'),
          strong: token('--color-border-strong'),
        },
        ink: {
          DEFAULT: token('--color-text'),
          secondary: token('--color-text-secondary'),
          muted: token('--color-text-muted'),
        },
        primary: {
          DEFAULT: token('--color-primary'),
          solid: token('--color-primary-solid'),
          'solid-hover': token('--color-primary-solid-hover'),
        },
        'on-primary': token('--color-on-primary'),
        risk: {
          high: token('--color-risk-high'),
          medium: token('--color-risk-medium'),
          low: token('--color-risk-low'),
        },
      },
      fontFamily: {
        // Both fonts are loaded with next/font in app/layout.tsx, which exposes them as CSS variables.
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['var(--font-display)', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      boxShadow: {
        card: 'var(--shadow-sm)',
        elevated: 'var(--shadow-lg)',
      },
      borderRadius: {
        card: 'var(--radius-lg)',
      },
    },
  },
  plugins: [],
}
