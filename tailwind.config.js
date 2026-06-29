/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          primary: '#F9F8F5',
          secondary: '#F2F0EB',
          card: '#FFFFFF',
          overlay: 'rgba(249,248,245,0.94)',
        },
        ink: {
          primary: '#1C1917',
          secondary: '#78716C',
          muted: '#A8A29E',
          inverted: '#FAFAF9',
        },
        edge: {
          subtle: '#E8E4DF',
          medium: '#D6D1CB',
          strong: '#B5B0A8',
        },
        ember: {
          50:  '#FFF5EE',
          100: '#FFEAD8',
          200: '#FFD0A8',
          300: '#FFB373',
          400: '#FF8D3F',
          500: '#E07A45',
          600: '#C5601E',
          700: '#9E4714',
        },
        jade: {
          500: '#10B981',
          600: '#059669',
        },
        sky: {
          500: '#3B82F6',
          600: '#2563EB',
        },
      },
      boxShadow: {
        soft:     '0 1px 3px rgba(28,25,23,0.06)',
        card:     '0 0 0 1px rgba(28,25,23,0.06), 0 2px 6px rgba(28,25,23,0.04)',
        elevated: '0 4px 16px rgba(28,25,23,0.08), 0 1px 4px rgba(28,25,23,0.06)',
        glow:     '0 0 0 3px rgba(224,122,69,0.2)',
      },
      animation: {
        'fade-in':  'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                                    to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' },     to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.95)' },          to: { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
};
