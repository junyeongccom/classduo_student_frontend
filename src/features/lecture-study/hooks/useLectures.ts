/**
 * @file useLectures.ts
 * @description 회차 목록 데이터 페칭 훅
 * @module features/lecture-study/hooks
 * @dependencies lectureService
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { lectureService } from '../services/lectureService'
import type { Lecture } from '../types'

interface UseLecturesResult {
  lectures: Lecture[]
  courseTitle: string | null
  isLoading: boolean
  error: string | null
  refresh: () => void
}

export function useLectures(courseId: string): UseLecturesResult {
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [courseTitle, setCourseTitle] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const fetchLectures = useCallback(async () => {
    isMountedRef.current = true
    setIsLoading(true)
    setError(null)

    const result = await lectureService.getLectures(courseId)

    if (!isMountedRef.current) return

    if (result.error || !result.data) {
      setError(result.error?.message ?? 'LOAD_LECTURES_FAILED')
      setIsLoading(false)
      return
    }

    setCourseTitle(result.data.course_title)

    const mapped: Lecture[] = (result.data.lectures ?? []).map(l => ({
      id: l.lecture_id,
      course_id: courseId,
      title: l.title,
      lecture_number: l.lecture_no,
      date: l.lecture_date,
      week_number: null,
      session_number: null,
      // TODO: 백엔드 API에 recordings_count/materials_count 필드 추가 후 정확한 값 매핑
      // 현재는 null로 설정하여 정확하지 않은 아이콘 표시 방지 (has_content만으로도 비활성 판단 가능)
      has_recordings: null,
      has_materials: null,
      has_content: !!(l.essence_7words),
      essence_7words: l.essence_7words ?? null,
    }))

    setLectures(mapped)
    setIsLoading(false)
  }, [courseId])

  useEffect(() => {
    fetchLectures()
    return () => {
      isMountedRef.current = false
    }
  }, [fetchLectures])

  return { lectures, courseTitle, isLoading, error, refresh: fetchLectures }
}
