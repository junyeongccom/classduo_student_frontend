/**
 * @file useCoreTestDetail.ts
 * @description 단일 core test 상세(메타+15문항) fetch 훅
 * @module features/exam-prep-final/hooks
 * @dependencies examPrepService
 */

'use client'

import { useEffect, useState } from 'react'
import {
  fetchCoreTestDetail,
  type CoreTestDetailDto,
} from '../services/examPrepService'

interface UseCoreTestDetailResult {
  data: CoreTestDetailDto | null
  isLoading: boolean
  error: string | null
}

export function useCoreTestDetail(testId: string): UseCoreTestDetailResult {
  const [data, setData] = useState<CoreTestDetailDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setIsLoading(true)
    setError(null)
    fetchCoreTestDetail(testId).then((res) => {
      if (!alive) return
      if (res.error) {
        setError(res.error)
      } else {
        setData(res.data)
      }
      setIsLoading(false)
    })
    return () => {
      alive = false
    }
  }, [testId])

  return { data, isLoading, error }
}
