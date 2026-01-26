import { useCallback, useEffect, useState } from 'react'
import { examPrepService } from '../services/examPrepService'
import type { ExamPrepGlossaryTerm } from '../types'

export function useExamPrepGlossary(materialId: string | null, language: 'ko' | 'en') {
  const [terms, setTerms] = useState<ExamPrepGlossaryTerm[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGlossary = useCallback(async () => {
    if (!materialId) {
      setTerms([])
      return
    }

    setIsLoading(true)
    setError(null)
    const result = await examPrepService.getGlossary(materialId, language)

    if (result.error || !result.data) {
      setError(result.error?.message ?? '암기 데이터를 불러오지 못했습니다')
      setTerms([])
      setIsLoading(false)
      return
    }

    setTerms(result.data.terms)
    setIsLoading(false)
  }, [materialId, language])

  useEffect(() => {
    fetchGlossary()
  }, [fetchGlossary])

  return {
    terms,
    isLoading,
    error,
    refresh: fetchGlossary,
  }
}

