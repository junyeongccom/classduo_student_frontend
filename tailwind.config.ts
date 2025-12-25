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
      },
    },
  },
  plugins: [],
}

export default config


