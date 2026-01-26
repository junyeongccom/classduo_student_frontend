import { useCallback, useEffect, useState } from 'react'
import { examPrepService } from '../services/examPrepService'
import type { ExamPrepSummary } from '../types'

export function useExamPrepSummary(materialId: string | null, language: 'ko' | 'en') {
  const [summary, setSummary] = useState<ExamPrepSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    if (!materialId) {
      setSummary(null)
      return
    }

    setIsLoading(true)
    setError(null)
    const result = await examPrepService.getSummary(materialId, language)

    if (result.error || !result.data) {
      setError(result.error?.message ?? '요약을 불러오지 못했습니다')
      setSummary(null)
      setIsLoading(false)
      return
    }

    setSummary(result.data.summary)
    setIsLoading(false)
  }, [materialId, language])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return {
    summary,
    isLoading,
    error,
    refresh: fetchSummary,
  }
}

