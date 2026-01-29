'use client'

import { useCallback, useEffect, useState } from 'react'
import { reviewService } from '@/features/review/services/reviewService'
import type { DefinitionBuilderGameResponse } from '@/features/review/types'

export function useDefinitionBuilderGame(lectureId: string | null, enabled: boolean) {
  const [data, setData] = useState<DefinitionBuilderGameResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOnce = useCallback(async () => {
    if (!lectureId) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await reviewService.getDefinitionBuilderGame(lectureId)
      if (result.error) {
        setError(result.error.message || '게임 데이터를 불러오지 못했습니다')
        setData(null)
        return
      }
      if (result.data) {
        setData(result.data)
      } else {
        setData(null)
      }
    } catch {
      setError('게임 데이터를 불러오지 못했습니다')
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [lectureId])

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      setError(null)
      return
    }
    fetchOnce()
  }, [enabled, fetchOnce])

  return {
    data,
    isLoading,
    error,
    refetch: fetchOnce,
  }
}

