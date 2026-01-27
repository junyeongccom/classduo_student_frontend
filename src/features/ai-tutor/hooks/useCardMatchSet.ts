import { useEffect, useState } from 'react'
import type { CardMatchSet } from '../types'
import { cardMatchService } from '../services/cardMatchService'
import { useI18n } from '@/shared/i18n/I18nProvider'

export function useCardMatchSet(lectureId: string | null) {
  const { locale } = useI18n()
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

    const fetchSet = async () => {
      setIsLoading(true)
      setError(null)
      const result = await cardMatchService.getCardMatchSet(lectureId, locale)
      if (!isMounted) return
      if (result.error || !result.data) {
        setError(result.error?.message ?? '카드 매칭 데이터를 불러오지 못했습니다')
        setData(null)
      } else {
        setData(result.data)
      }
      setIsLoading(false)
    }

    fetchSet()

    return () => {
      isMounted = false
    }
  }, [lectureId, locale])

  return { data, isLoading, error }
}

