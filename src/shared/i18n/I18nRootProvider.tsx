import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import type { AbstractIntlMessages } from 'next-intl'
import koMessages from './messages/ko.json'
import enMessages from './messages/en.json'
import { I18nProvider, type AppLocale } from './I18nProvider'

const STORAGE_KEY = 'classduo_locale'

const resolveLocale = (value?: string): AppLocale => {
  return value === 'en' ? 'en' : 'ko'
}

const resolveMessages = (locale: AppLocale): AbstractIntlMessages => {
  return locale === 'en'
    ? (enMessages as unknown as AbstractIntlMessages)
    : (koMessages as unknown as AbstractIntlMessages)
}

export async function I18nRootProvider({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(STORAGE_KEY)?.value
  const initialLocale = resolveLocale(cookieLocale)
  const initialMessages = resolveMessages(initialLocale)

  return (
    <I18nProvider initialLocale={initialLocale} initialMessages={initialMessages}>
      {children}
    </I18nProvider>
  )
}

