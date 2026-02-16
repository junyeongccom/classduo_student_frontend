/**
 * @file useCourses.ts
 * @description 과목 목록 데이터 페칭 훅
 * @module features/home/hooks
 * @dependencies courseService
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { courseService } from '../services/courseService'
import type { Course, TermCode } from '../types'

const VALID_TERM_CODES: TermCode[] = ['SPRING', 'SUMMER', 'FALL', 'WINTER']

function isValidTermCode(code: string): code is TermCode {
  return VALID_TERM_CODES.includes(code as TermCode)
}

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const fetchCourses = useCallback(async () => {
    isMountedRef.current = true
    setIsLoading(true)
    setError(null)

    const result = await courseService.getCourses()

    if (!isMountedRef.current) return

    if (result.error || !result.data) {
      setError(result.error?.message ?? '과목 목록을 불러오지 못했습니다')
      setIsLoading(false)
      return
    }

    const mapped: Course[] = (result.data.courses ?? []).map(c => {
      const year = typeof c.academic_year === 'number' ? c.academic_year : 0
      const termCode = c.term_code && isValidTermCode(c.term_code) ? c.term_code : null

      return {
        id: c.course_id,
        name: c.title,
        professor_name: c.professor_name ?? null,
        section: c.section ?? null,
        academic_term: year > 0 && termCode
          ? { key: `${year}-${termCode}`, year, termCode }
          : null,
        updated_at: c.updated_at ?? null,
        created_at: null,
      }
    })

    setCourses(mapped)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchCourses()
    return () => {
      isMountedRef.current = false
    }
  }, [fetchCourses])

  return { courses, isLoading, error, refresh: fetchCourses }
}
