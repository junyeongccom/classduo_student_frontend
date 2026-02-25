import { useEffect, useRef, useState } from 'react'
import type { CardMatchPair, CardMatchSet } from '../types'
import { cardMatchService } from '../services/cardMatchService'
import { useAITutorStore } from '@/features/ai-tutor/store/useAITutorStore'
import { useI18n } from '@/shared/i18n/I18nProvider'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1500

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
  const setCardMatchCache = useAITutorStore(state => state.setCardMatchCache)
  const [data, setData] = useState<CardMatchSet | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // 이전 요청 취소
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    if (!lectureId) {
      setData(null)
      setError(null)
      setIsLoading(false)
      return
    }

    // 캐시 확인 (null은 캐시 히트로 취급하지 않음 — 에러였던 것이므로 재시도)
    const cached = useAITutorStore.getState().cardMatchByLocale[locale]?.[lectureId]
    if (cached) {
      setData(cached)
      setError(null)
      setIsLoading(false)
      return
    }

    const fetchWithRetry = async (attempt: number) => {
      if (controller.signal.aborted) return

      if (attempt === 1) {
        setIsLoading(true)
        setError(null)
      }

      const result = await cardMatchService.getCardMatchSet(lectureId, locale, true)
      if (controller.signal.aborted) return

      if (result.error || !result.data) {
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt))
          if (!controller.signal.aborted) {
            return fetchWithRetry(attempt + 1)
          }
          return
        }
        // 최대 재시도 후에도 실패 — 에러 표시, 캐시에 null 저장 안 함
        setError(result.error?.message ?? '카드 매칭 데이터를 불러오지 못했습니다.')
        setData(null)
        setIsLoading(false)
        return
      }

      // 성공
      const localizedKo = localizeSet(result.data, 'ko')
      const localizedEn = localizeSet(result.data, 'en')
      setCardMatchCache('ko', lectureId, localizedKo)
      setCardMatchCache('en', lectureId, localizedEn)
      setData(locale === 'en' ? localizedEn : localizedKo)
      setError(null)
      setIsLoading(false)
    }

    fetchWithRetry(1)

    return () => {
      controller.abort()
    }
  }, [lectureId, locale, setCardMatchCache])

  return { data, isLoading, error }
}
