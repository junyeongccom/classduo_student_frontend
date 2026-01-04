import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/shared/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ClassDuo 브랜드 컬러
        primary: {
          DEFAULT: '#46CD74', // 메인 그린
          50: '#EDFDF4',
          100: '#D4FBDF',
          200: '#ABF5C4',
          300: '#73EBA3',
          400: '#46CD74',
          500: '#46CD74',
          600: '#2FB35F',
          700: '#248F4D',
          800: '#1F713F',
          900: '#1B5D35',
        },
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },
      keyframes: {
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'pulse-scale': {
          '0%': {
            transform: 'scale(1)',
          },
          '25%': {
            transform: 'scale(1.05)',
          },
          '50%': {
            transform: 'scale(1)',
          },
          '75%': {
            transform: 'scale(1.05)',
          },
          '100%': {
            transform: 'scale(1)',
          },
        },
        'blank-reveal': {
          '0%': {
            opacity: '0',
            transform: 'scale(0.8) translateY(-10px)',
          },
          '50%': {
            transform: 'scale(1.1) translateY(0)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1) translateY(0)',
          },
        },
        'blank-hide': {
          '0%': {
            opacity: '1',
            transform: 'scale(1)',
          },
          '100%': {
            opacity: '0.3',
            transform: 'scale(0.95)',
          },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out',
        'pulse-scale': 'pulse-scale 2s ease-in-out',
        'blank-reveal': 'blank-reveal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'blank-hide': 'blank-hide 0.3s ease-out',
      },
    },
  },
  plugins: [],
}

export default config


