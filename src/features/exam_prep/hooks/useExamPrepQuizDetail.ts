import { useCallback, useEffect, useState } from 'react'
import { examPrepService } from '../services/examPrepService'
import type { ExamPrepQuizItem } from '../types'

export function useExamPrepQuizDetail(sessionId: string | null, onlyWrong: boolean) {
  const [quizzes, setQuizzes] = useState<ExamPrepQuizItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDetail = useCallback(async (options?: { silent?: boolean }) => {
    if (!sessionId) {
      setQuizzes([])
      return
    }

    if (!options?.silent) {
      setIsLoading(true)
      setError(null)
    }
    const result = onlyWrong
      ? await examPrepService.getQuizSessionWrong(sessionId)
      : await examPrepService.getQuizSessionDetail(sessionId)

    if (result.error || !result.data) {
      if (!options?.silent) {
        setError(result.error?.message ?? '퀴즈를 불러오지 못했습니다')
      }
      setQuizzes([])
      if (!options?.silent) {
        setIsLoading(false)
      }
      return
    }

    setQuizzes(result.data.quizzes)
    if (!options?.silent) {
      setIsLoading(false)
    }
  }, [sessionId, onlyWrong])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  return {
    quizzes,
    isLoading,
    error,
    refresh: () => fetchDetail(),
    refreshSilently: () => fetchDetail({ silent: true }),
  }
}

