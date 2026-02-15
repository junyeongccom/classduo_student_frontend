/**
 * @file useLectureDetail.ts
 * @description 회차 상세 데이터 (녹음 목록) 페칭 훅
 * @module features/lecture-study/hooks
 * @dependencies lectureService
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { lectureService } from '../services/lectureService'
import type { Recording } from '../types'

interface UseLectureDetailResult {
  recordings: Recording[]
  isLoading: boolean
  error: string | null
}

export function useLectureDetail(lectureId: string): UseLectureDetailResult {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const fetchDetail = useCallback(async () => {
    isMountedRef.current = true
    setIsLoading(true)
    setError(null)

    const recResult = await lectureService.getRecordings(lectureId)

    if (!isMountedRef.current) return

    if (recResult.error) {
      setError(recResult.error.message ?? '데이터를 불러오지 못했습니다')
      setIsLoading(false)
      return
    }

    const mappedRecordings: Recording[] = (recResult.data?.recordings ?? []).map(r => ({
      id: r.recording_id,
      lecture_id: lectureId,
      summary: null,
      status: r.status,
    }))

    setRecordings(mappedRecordings)
    setIsLoading(false)
  }, [lectureId])

  useEffect(() => {
    fetchDetail()
    return () => {
      isMountedRef.current = false
    }
  }, [fetchDetail])

  return { recordings, isLoading, error }
}
