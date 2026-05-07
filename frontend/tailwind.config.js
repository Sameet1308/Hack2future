/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef4ff',
          100: '#dbe6ff',
          500: '#3a6ff7',
          600: '#1f54e6',
          700: '#1741b8',
          900: '#0a2540'
        },
        elite: {
          deep: '#0b1733',
          accent: '#7c5cff'
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      boxShadow: {
        phone: '0 30px 80px -20px rgba(0,0,0,.45), 0 8px 24px -8px rgba(0,0,0,.25)',
        card: '0 4px 18px -8px rgba(15,23,42,.12)'
      }
    }
  },
  plugins: []
};
