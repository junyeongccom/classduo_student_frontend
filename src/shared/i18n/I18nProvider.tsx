'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import type { AbstractIntlMessages } from 'next-intl'

import koMessages from './messages/ko.json'
import enMessages from './messages/en.json'

export type AppLocale = 'ko' | 'en'

const STORAGE_KEY = 'classduo_locale'
const DEFAULT_LOCALE: AppLocale = 'ko'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

const MESSAGES_BY_LOCALE: Record<AppLocale, AbstractIntlMessages> = {
  ko: koMessages as unknown as AbstractIntlMessages,
  en: enMessages as unknown as AbstractIntlMessages,
}

interface I18nContextValue {
  locale: AppLocale
  setLocale: (nextLocale: AppLocale) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

function isAppLocale(value: unknown): value is AppLocale {
  return value === 'ko' || value === 'en'
}

interface I18nProviderProps {
  children: React.ReactNode
  initialLocale?: AppLocale
  initialMessages?: AbstractIntlMessages
}

export function I18nProvider({ children, initialLocale, initialMessages }: I18nProviderProps) {
  const resolvedInitialLocale = initialLocale ?? DEFAULT_LOCALE
  const [locale, setLocaleState] = useState<AppLocale>(resolvedInitialLocale)
  const [messages, setMessages] = useState<AbstractIntlMessages>(
    initialMessages ?? MESSAGES_BY_LOCALE[resolvedInitialLocale]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (isAppLocale(saved)) {
      setLocaleState(saved)
      document.cookie = `${STORAGE_KEY}=${saved}; path=/; max-age=${COOKIE_MAX_AGE}`
      return
    }
    if (initialLocale) {
      window.localStorage.setItem(STORAGE_KEY, initialLocale)
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
      document.cookie = `${STORAGE_KEY}=${nextLocale}; path=/; max-age=${COOKIE_MAX_AGE}`
    }
  }, [])

  useEffect(() => {
    setMessages(MESSAGES_BY_LOCALE[locale])
  }, [locale])

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale])

  return (
    <I18nContext.Provider value={value}>
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
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



