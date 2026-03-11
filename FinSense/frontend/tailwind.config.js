/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Light theme colors (existing)
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        success: {
          500: '#10b981',
          600: '#059669',
        },
        warning: {
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          500: '#ef4444',
          600: '#dc2626',
        },
        // Dark theme colors
        dark: {
          bg: {
            primary: '#0f0f0f',
            secondary: '#1a1a1a',
            tertiary: '#252525',
            sidebar: '#141414',
          },
          border: {
            subtle: '#2a2a2a',
            focus: '#3a3a3a',
          },
          text: {
            primary: '#ffffff',
            secondary: '#a0a0a0',
            tertiary: '#666666',
          }
        },
        // Accent colors
        accent: {
          lime: '#d4ff00',
          gold: '#ffa726',
          blue: '#4a9eff',
        },
        // Chart colors
        chart: {
          green: '#00ff88',
          yellow: '#ffeb3b',
          red: '#ff4a6b',
          line: '#7ed321',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Space Grotesk', 'monospace'],
      },
      boxShadow: {
        'dark-sm': '0 2px 8px rgba(0, 0, 0, 0.4)',
        'dark-md': '0 4px 16px rgba(0, 0, 0, 0.5)',
        'dark-lg': '0 8px 32px rgba(0, 0, 0, 0.6)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
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
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(212, 255, 0, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(212, 255, 0, 0.5)' },
        }
      }
    },
  },
  plugins: [],
}