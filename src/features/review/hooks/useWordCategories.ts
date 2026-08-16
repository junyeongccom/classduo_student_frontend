/**
 * @file useWordCategories.ts
 * @description 단어 솔리테어 회차 콘텐츠(카테고리·단어) 로딩 훅 — 비활성 회차는 오류가 아니라 정상 상태다
 * @module features/review/hooks
 * @dependencies reviewService, features/review/types
 */
'use client'

import { useCallback, useEffect, useState } from 'react'
import { reviewService } from '@/features/review/services/reviewService'
import type { LectureWordCategoriesResponse } from '@/features/review/types'

/**
 * 실패는 **불리언으로만** 알린다 — 화면 문구는 호출자가 i18n 으로 고르고,
 * 훅은 사용자 노출 문구를 들고 있지 않는다.
 */
export function useWordCategories(lectureId: string | null, enabled: boolean) {
  const [data, setData] = useState<LectureWordCategoriesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

  const fetchOnce = useCallback(async () => {
    if (!lectureId) return
    setIsLoading(true)
    setHasError(false)
    try {
      const result = await reviewService.getLectureWordCategories(lectureId)
      if (result.error || !result.data) {
        setHasError(true)
        setData(null)
        return
      }
      setData(result.data)
    } catch {
      setHasError(true)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [lectureId])

  // 회차가 바뀌면 이전 회차의 콘텐츠가 잠깐이라도 보이지 않도록 먼저 비운다.
  useEffect(() => {
    setData(null)
    setHasError(false)
  }, [lectureId])

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      setHasError(false)
      return
    }
    fetchOnce()
  }, [enabled, fetchOnce])

  return { data, isLoading, hasError, refetch: fetchOnce }
}
