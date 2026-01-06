/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a5bbfc',
          400: '#8197f8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        executive: {
          navy: '#0A1929',
          charcoal: '#1A2332',
          slate: '#2D3748',
          muted: '#4A5568',
          steel: '#718096',
          silver: '#A0AEC0',
          pearl: '#CBD5E0',
          platinum: '#E2E8F0',
          cream: '#F7FAFC',
        },
        success: {
          light: '#D4EDDA',
          DEFAULT: '#28A745',
          dark: '#1E7E34',
        },
        warning: {
          light: '#FFF3CD',
          DEFAULT: '#FFC107',
          dark: '#FF8B00',
        },
        danger: {
          light: '#F8D7DA',
          DEFAULT: '#DC3545',
          dark: '#BD2130',
        },
        info: {
          light: '#D1ECF1',
          DEFAULT: '#17A2B8',
          dark: '#117A8B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['4.5rem', { lineHeight: '1', fontWeight: '700' }],
        'display-lg': ['3.75rem', { lineHeight: '1', fontWeight: '700' }],
        'display-md': ['3rem', { lineHeight: '1.1', fontWeight: '700' }],
        'display-sm': ['2.25rem', { lineHeight: '1.2', fontWeight: '600' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '104': '26rem',
        '112': '28rem',
        '128': '32rem',
      },
      boxShadow: {
        'executive': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'executive-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'executive-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
