/**
 * lecture_review items hook
 * - Fetches user-specific review items for a lecture via backend API.
 */
'use client'

import { useCallback, useEffect, useState } from 'react'
import { reviewService } from '@/features/review/services/reviewService'
import { useReviewStore } from '@/features/review/store/useReviewStore'
import type { LectureReviewListResponse } from '@/features/review/types'

export function useLectureReviewItems(lectureId: string | null) {
  const { lectureReviewItemsByLectureId, setLectureReviewItemsCache } = useReviewStore()
  const [data, setData] = useState<LectureReviewListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOnce = useCallback(async () => {
    if (!lectureId) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await reviewService.getLectureReviewItems(lectureId)
      if (result.error) {
        setError(result.error.message || '복습 단어 목록을 불러오는데 실패했습니다')
        setData(null)
        return
      }
      if (result.data) {
        setLectureReviewItemsCache(lectureId, result.data)
        setData(result.data)
      } else {
        setData({ lecture_id: lectureId, items: [], total_count: 0 })
      }
    } catch {
      setError('복습 단어 목록을 불러오는데 실패했습니다')
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [lectureId, setLectureReviewItemsCache])

  useEffect(() => {
    if (!lectureId) {
      setData(null)
      setIsLoading(false)
      setError(null)
      return
    }

    const cached = lectureReviewItemsByLectureId[lectureId]
    if (cached) {
      setData(cached)
      setIsLoading(false)
      setError(null)
      return
    }

    fetchOnce()
  }, [lectureId, lectureReviewItemsByLectureId, fetchOnce])

  return {
    data,
    isLoading,
    error,
    refetch: fetchOnce,
  }
}
