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
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        dark: {
          bg: '#000000',
          surface: '#0a0a0a',
          card: '#111111',
          border: '#1a1a1a',
          text: '#ffffff',
          'text-secondary': '#a3a3a3',
          'text-muted': '#737373',
        },
      },
    },
  },
  plugins: [],
}