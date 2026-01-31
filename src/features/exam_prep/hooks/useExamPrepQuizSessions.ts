import { useCallback, useEffect, useState } from 'react'
import { examPrepService } from '../services/examPrepService'
import type { ExamPrepQuizSession } from '../types'

export function useExamPrepQuizSessions(materialId: string | null) {
  const [sessions, setSessions] = useState<ExamPrepQuizSession[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = useCallback(async (options?: { silent?: boolean }) => {
    if (!materialId) {
      setSessions([])
      return
    }

    if (!options?.silent) {
      setIsLoading(true)
      setError(null)
    }
    const result = await examPrepService.getQuizSessions(materialId)

    if (result.error || !result.data) {
      if (!options?.silent) {
        setError(result.error?.message ?? '퀴즈 세션을 불러오지 못했습니다')
      }
      setSessions([])
      if (!options?.silent) {
        setIsLoading(false)
      }
      return
    }

    setSessions(result.data.sessions)
    if (!options?.silent) {
      setIsLoading(false)
    }
  }, [materialId])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  return {
    sessions,
    isLoading,
    error,
    refresh: () => fetchSessions(),
    refreshSilently: () => fetchSessions({ silent: true }),
  }
}

