/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Coral / orange brand on white — warm, clean, on-brand.
        brand: {
          50:  '#fff4ef',
          100: '#ffe2d6',
          500: '#ff6a3d',
          600: '#f4501c',
          700: '#c93e12',
          900: '#7c2a0e'
        },
        elite: {
          deep: '#15171c',   // neutral charcoal for the adjuster/live console
          accent: '#ff6a3d'  // coral accent
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      boxShadow: {
        phone: '0 30px 80px -20px rgba(0,0,0,.45), 0 8px 24px -8px rgba(0,0,0,.25)',
        // Soft, layered enterprise shadows
        card: '0 1px 2px rgba(16,24,40,.04), 0 4px 12px -2px rgba(16,24,40,.08)',
        soft: '0 1px 3px rgba(16,24,40,.06), 0 1px 2px rgba(16,24,40,.04)'
      }
    }
  },
  plugins: []
};
