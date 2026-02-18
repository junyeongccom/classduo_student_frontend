'use client'

import { cn } from '@/shared/lib/utils'
import { useI18n, type AppLocale } from '@/shared/i18n/I18nProvider'

interface LanguageToggleProps {
  className?: string
  size?: 'sm' | 'md'
}

export function LanguageToggle({ className, size = 'md' }: LanguageToggleProps) {
  const { locale, setLocale } = useI18n()

  const base =
    size === 'sm'
      ? 'h-7 text-[11px] px-1.5'
      : 'h-9 text-sm px-3'

  const handleClick = (next: AppLocale) => setLocale(next)

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg bg-gray-100 border border-gray-500 p-1',
        className
      )}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => handleClick('ko')}
        className={cn(
          'rounded-md font-medium transition-all',
          base,
          locale === 'ko' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        )}
        aria-pressed={locale === 'ko'}
      >
        KO
      </button>
      <button
        type="button"
        onClick={() => handleClick('en')}
        className={cn(
          'rounded-md font-medium transition-all',
          base,
          locale === 'en' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        )}
        aria-pressed={locale === 'en'}
      >
        EN
      </button>
    </div>
  )
}



