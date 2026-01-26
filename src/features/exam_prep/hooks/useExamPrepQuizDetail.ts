import { useCallback, useEffect, useState } from 'react'
import { examPrepService } from '../services/examPrepService'
import type { ExamPrepQuizItem } from '../types'

export function useExamPrepQuizDetail(sessionId: string | null, onlyWrong: boolean) {
  const [quizzes, setQuizzes] = useState<ExamPrepQuizItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDetail = useCallback(async () => {
    if (!sessionId) {
      setQuizzes([])
      return
    }

    setIsLoading(true)
    setError(null)
    const result = onlyWrong
      ? await examPrepService.getQuizSessionWrong(sessionId)
      : await examPrepService.getQuizSessionDetail(sessionId)

    if (result.error || !result.data) {
      setError(result.error?.message ?? '퀴즈를 불러오지 못했습니다')
      setQuizzes([])
      setIsLoading(false)
      return
    }

    setQuizzes(result.data.quizzes)
    setIsLoading(false)
  }, [sessionId, onlyWrong])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  return {
    quizzes,
    isLoading,
    error,
    refresh: fetchDetail,
  }
}

