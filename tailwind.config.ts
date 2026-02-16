import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
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
        // Gizmo 스타일 포인트 색상
        violet: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        indigo: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Noto Sans KR', 'Apple SD Gothic Neo', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
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
        'blank-shimmer': {
          '0%': {
            transform: 'translateX(-100%)',
          },
          '100%': {
            transform: 'translateX(200%)',
          },
        },
        'shard-fall': {
          '0%': {
            transform: 'translate(0, 0) rotate(0deg) scale(1)',
            opacity: '1',
          },
          '100%': {
            transform: 'translate(var(--shard-x), var(--shard-y)) rotate(var(--shard-rotate)) scale(0.3)',
            opacity: '0',
          },
        },
        'shimmer': {
          '0%': {
            backgroundPosition: '-200% 0',
          },
          '100%': {
            backgroundPosition: '200% 0',
          },
        },
        'bounce-slow': {
          '0%, 100%': {
            transform: 'translateY(-5%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
        'float': {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-10px)',
          },
        },
        'rotate-slow': {
          '0%': {
            transform: 'rotate(0deg)',
          },
          '100%': {
            transform: 'rotate(360deg)',
          },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'blank-break': {
          '0%': {
            transform: 'rotate(0deg) scale(1) translateY(0)',
            opacity: '1',
          },
          '10%': {
            transform: 'rotate(-3deg) scale(1.05) translateY(-2px)',
            opacity: '1',
          },
          '20%': {
            transform: 'rotate(3deg) scale(1.08) translateY(-4px)',
            opacity: '0.95',
          },
          '35%': {
            transform: 'rotate(-15deg) scale(0.9) translateY(10px)',
            opacity: '0.7',
          },
          '50%': {
            transform: 'rotate(20deg) scale(0.7) translateY(30px) translateX(15px)',
            opacity: '0.5',
          },
          '65%': {
            transform: 'rotate(-25deg) scale(0.5) translateY(60px) translateX(-10px)',
            opacity: '0.3',
          },
          '80%': {
            transform: 'rotate(30deg) scale(0.3) translateY(100px) translateX(20px)',
            opacity: '0.1',
          },
          '100%': {
            transform: 'rotate(45deg) scale(0.1) translateY(150px) translateX(30px)',
            opacity: '0',
          },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out',
        'pulse-scale': 'pulse-scale 2s ease-in-out',
        'blank-reveal': 'blank-reveal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'blank-hide': 'blank-hide 0.3s ease-out',
        'blank-shimmer': 'blank-shimmer 2s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'blank-break': 'blank-break 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards',
        'bounce-slow': 'bounce-slow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'rotate-slow': 'rotate-slow 3s linear infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [],
}

export default config


