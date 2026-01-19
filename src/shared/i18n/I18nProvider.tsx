'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import type { AbstractIntlMessages } from 'next-intl'

import koMessages from './messages/ko.json'
import enMessages from './messages/en.json'

export type AppLocale = 'ko' | 'en'

const STORAGE_KEY = 'classduo_locale'
const DEFAULT_LOCALE: AppLocale = 'ko'

const MESSAGES_BY_LOCALE: Record<AppLocale, AbstractIntlMessages> = {
  ko: koMessages,
  en: enMessages,
}

interface I18nContextValue {
  locale: AppLocale
  setLocale: (nextLocale: AppLocale) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

function isAppLocale(value: unknown): value is AppLocale {
  return value === 'ko' || value === 'en'
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(DEFAULT_LOCALE)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (isAppLocale(saved)) {
      setLocaleState(saved)
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((nextLocale: AppLocale) => {
    setLocaleState(nextLocale)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextLocale)
    }
  }, [])

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale])

  return (
    <I18nContext.Provider value={value}>
      <NextIntlClientProvider
        locale={locale}
        messages={MESSAGES_BY_LOCALE[locale]}
        timeZone="Asia/Seoul"
      >
        {children}
      </NextIntlClientProvider>
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}



