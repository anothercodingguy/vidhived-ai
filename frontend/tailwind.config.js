/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        surface: {
          DEFAULT: 'rgb(var(--color-surface))',
          hover: 'rgb(var(--color-surface-hover))',
        },
        border: {
          DEFAULT: 'rgb(var(--color-border))',
          light: 'rgb(var(--color-border-light))',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn .3s ease-out',
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
      },
      boxShadow: {
        'card': 'var(--shadow-sm)',
        'card-hover': 'var(--shadow-md)',
        'elevated': 'var(--shadow-lg)',
      },
      borderRadius: {
        'card': 'var(--radius-lg)',
        'button': 'var(--radius-md)',
      },
    },
  },
  plugins: [],
}