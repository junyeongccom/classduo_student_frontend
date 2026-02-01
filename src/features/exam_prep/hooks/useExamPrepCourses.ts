'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { examPrepService } from '../services/examPrepService'
import type { ExamPrepCourse } from '../types'

export function useExamPrepCourses() {
  const [courses, setCourses] = useState<ExamPrepCourse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const fetchCourses = useCallback(async () => {
    isMountedRef.current = true
    setIsLoading(true)
    setError(null)
    const result = await examPrepService.getCourses()

    if (!isMountedRef.current) return

    if (result.error || !result.data) {
      setError(result.error?.message ?? '강의 목록을 불러오지 못했습니다')
      setIsLoading(false)
      return
    }

    const mapped = (result.data.courses ?? []).map(course => ({
      id: course.course_id,
      title: course.title,
      professorName: course.professor_name ?? null,
      termLabel: course.academic_year && course.term_code ? `${course.academic_year}-${course.term_code}` : undefined,
      section: course.section ?? null,
    }))

    setCourses(mapped)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchCourses()

    return () => {
      isMountedRef.current = false
    }
  }, [fetchCourses])

  return {
    courses,
    isLoading,
    error,
    refresh: fetchCourses,
  }
}

