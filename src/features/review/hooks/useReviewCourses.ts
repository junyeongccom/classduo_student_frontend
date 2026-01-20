import { useState, useEffect } from 'react'
import { apiRequest } from '@/shared/lib/api'
import { useI18n } from '@/shared/i18n/I18nProvider'
import type { AppLocale } from '@/shared/i18n/I18nProvider'
import { useReviewStore, type ReviewCourse } from '@/features/review/store/useReviewStore'

export function useReviewCourses() {
  const { locale } = useI18n()
  const { coursesByLocale, setCoursesCache } = useReviewStore()
  const [courses, setCourses] = useState<ReviewCourse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCourses = async (targetLocale: AppLocale, updateState: boolean) => {
      if (updateState) {
        setIsLoading(true)
        setError(null)
      }
      
      try {
        const coursesResult = await apiRequest<{ courses: any[], total: number }>('/courses/all', {
          auth: true,
          headers: { 'Accept-Language': targetLocale },
        })
        
        const coursesList = coursesResult.data?.courses
        
        if (coursesResult.error || !coursesList || !Array.isArray(coursesList) || coursesList.length === 0) {
          if (updateState) {
            setError('강의 목록을 불러오는데 실패했습니다')
          }
          return
        }
        
        const coursesData: ReviewCourse[] = coursesList.map((course: any) => ({
          course_id: course.course_id,
          title: course.title,
          academic_year: course.academic_year,
          term_code: course.term_code,
          section: course.section,
        }))
        
        setCoursesCache(targetLocale, coursesData)
        if (updateState) {
          setCourses(coursesData)
        }
      } catch (err) {
        console.error('Failed to fetch courses:', err)
        if (updateState) {
          setError('강의 목록을 불러오는데 실패했습니다')
        }
      } finally {
        if (updateState) {
          setIsLoading(false)
        }
      }
    }
    
    const cached = coursesByLocale[locale]
    if (cached) {
      setCourses(cached)
      setIsLoading(false)
    } else {
      fetchCourses(locale, true)
    }

    const oppositeLocale: AppLocale = locale === 'ko' ? 'en' : 'ko'
    if (!coursesByLocale[oppositeLocale]) {
      fetchCourses(oppositeLocale, false)
    }
  }, [locale, coursesByLocale, setCoursesCache])

  return {
    courses,
    isLoading,
    error
  }
}

