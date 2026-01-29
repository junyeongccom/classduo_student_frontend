import { useEffect, useState } from 'react'
import type { CardMatchPair, CardMatchSet } from '../types'
import { cardMatchService } from '../services/cardMatchService'
import { useAITutorStore } from '@/features/ai-tutor/store/useAITutorStore'
import { useI18n } from '@/shared/i18n/I18nProvider'

const localizePairs = (pairs: CardMatchPair[], locale: 'ko' | 'en') =>
  pairs.map(pair => {
    if (locale === 'en') {
      const term = pair.term_eng?.trim() || pair.term
      const description = pair.description_eng?.trim() || pair.description
      return {
        ...pair,
        term,
        description,
      }
    }
    return {
      ...pair,
      term: pair.term,
      description: pair.description,
    }
  })

const localizeSet = (set: CardMatchSet, locale: 'ko' | 'en'): CardMatchSet => ({
  ...set,
  pairs: localizePairs(set.pairs ?? [], locale),
})

export function useCardMatchSet(lectureId: string | null) {
  const { locale } = useI18n()
  const { cardMatchByLocale, setCardMatchCache } = useAITutorStore(state => ({
    cardMatchByLocale: state.cardMatchByLocale,
    setCardMatchCache: state.setCardMatchCache,
  }))
  const [data, setData] = useState<CardMatchSet | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    if (!lectureId) {
      setData(null)
      setError(null)
      setIsLoading(false)
      return
    }

    const cached = cardMatchByLocale[locale]?.[lectureId]
    if (cached !== undefined) {
      setData(cached)
      setError(null)
      setIsLoading(false)
      return
    }

    const fetchSet = async () => {
      setIsLoading(true)
      setError(null)
      const result = await cardMatchService.getCardMatchSet(lectureId, locale, true)
      if (!isMounted) return
      if (result.error || !result.data) {
        setError(result.error?.message ?? '카드 매칭 데이터를 불러오지 못했습니다')
        setData(null)
        setCardMatchCache('ko', lectureId, null)
        setCardMatchCache('en', lectureId, null)
      } else {
        const localizedKo = localizeSet(result.data, 'ko')
        const localizedEn = localizeSet(result.data, 'en')
        setCardMatchCache('ko', lectureId, localizedKo)
        setCardMatchCache('en', lectureId, localizedEn)
        setData(locale === 'en' ? localizedEn : localizedKo)
      }
      setIsLoading(false)
    }

    fetchSet()

    return () => {
      isMounted = false
    }
  }, [lectureId, locale, cardMatchByLocale, setCardMatchCache])

  return { data, isLoading, error }
}

