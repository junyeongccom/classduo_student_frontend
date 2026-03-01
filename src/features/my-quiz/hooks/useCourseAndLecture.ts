/**
 * @file useCourseAndLecture.ts
 * @description 수강 과목 + 회차 목록 조회 및 선택 상태 관리
 * @module features/my-quiz
 * @dependencies shared/lib/api
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { apiRequest } from '@/shared/lib/api'

interface LectureItem {
  lecture_id: string
  lecture_no: number
  title: string | null
  lecture_date: string
  is_available?: boolean
}

interface CourseItem {
  course_id: string
  title: string
  professor_name: string | null
  section: string | null
  academic_year: number
  term_code: string
  lectures: LectureItem[]
}

interface CoursesApiResponse {
  courses: CourseItem[]
}

export interface CourseOption {
  value: string
  label: string
}

export interface LectureOption {
  value: string
  label: string
}

export function useCourseAndLecture() {
  const t = useTranslations('myQuiz')
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null)
  const [selectedLectureIds, setSelectedLectureIds] = useState<string[]>([])

  const fetchCourses = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const result = await apiRequest<CoursesApiResponse>('/courses/all', {
      method: 'GET',
      auth: true,
    })

    if (result.error || !result.data) {
      if (process.env.NODE_ENV === 'development') console.error('[useCourseAndLecture] fetchCourses error:', result.error)
      setError(t('error.loadFailed'))
      setIsLoading(false)
      return
    }

    setCourses(result.data.courses ?? [])
    setIsLoading(false)
  }, [t])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  const courseOptions: CourseOption[] = courses.map(c => ({
    value: c.course_id,
    label: c.section ? `${c.title} (${c.section})` : c.title,
  }))

  const selectedCourse = courses.find(c => c.course_id === selectedCourseId)

  const lectureOptions: LectureOption[] = (selectedCourse?.lectures ?? [])
    .filter(l => l.is_available !== false)
    .sort((a, b) => a.lecture_no - b.lecture_no)
    .map(l => ({
      value: l.lecture_id,
      label: l.title
        ? t('selector.lectureLabelWithTitle', { no: l.lecture_no, title: l.title })
        : t('selector.lectureLabel', { no: l.lecture_no }),
    }))

  const handleCourseChange = useCallback((courseId: string) => {
    setSelectedCourseId(courseId)
    setSelectedLectureId(null)
    setSelectedLectureIds([])
  }, [])

  const handleLectureChange = useCallback((lectureId: string) => {
    setSelectedLectureId(lectureId)
  }, [])

  const toggleLectureId = useCallback((id: string) => {
    setSelectedLectureIds(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id],
    )
  }, [])

  const selectAllLectures = useCallback(() => {
    setSelectedLectureIds(lectureOptions.map(l => l.value))
  }, [lectureOptions])

  const clearLectureIds = useCallback(() => {
    setSelectedLectureIds([])
  }, [])

  return {
    isLoading,
    error,
    courseOptions,
    lectureOptions,
    selectedCourseId,
    selectedLectureId,
    selectedLectureIds,
    onCourseChange: handleCourseChange,
    onLectureChange: handleLectureChange,
    toggleLectureId,
    selectAllLectures,
    clearLectureIds,
    hasCourses: courses.length > 0,
  }
}
