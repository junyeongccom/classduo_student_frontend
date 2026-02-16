/**
 * @file useLectures.ts
 * @description 회차 목록 데이터 페칭 훅 — 주차/차시 계산 포함
 * @module features/lecture-study/hooks
 * @dependencies lectureService, ai-tutor/lectureUtils
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { lectureService } from '../services/lectureService'
import {
  calculateWeekAndSession,
  estimateTermStartDate,
  type LectureInfo,
} from '@/features/ai-tutor'
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

    const rawLectures = result.data.lectures ?? []

    // 주차/차시 계산용 LectureInfo 배열
    const lectureInfos: LectureInfo[] = rawLectures.map(l => ({
      lecture_id: l.lecture_id,
      lecture_date: l.lecture_date,
      start_time: l.start_time ?? null,
    }))
    const termStartDate = estimateTermStartDate(lectureInfos)

    const mapped: Lecture[] = rawLectures.map(l => {
      const ws = calculateWeekAndSession(
        l.lecture_date,
        l.start_time ?? null,
        termStartDate,
        lectureInfos,
        l.lecture_id,
      )

      return {
        id: l.lecture_id,
        course_id: courseId,
        title: l.title,
        lecture_number: l.lecture_no,
        date: l.lecture_date,
        week_number: ws.weekNo,
        session_number: ws.sessionNo,
        has_recordings: null,
        has_materials: null,
        has_content: !!(l.essence_7words),
        essence_7words: l.essence_7words ?? null,
      }
    })

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
