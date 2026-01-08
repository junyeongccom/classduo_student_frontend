import { useState, useEffect } from 'react'
import { apiRequest } from '@/shared/lib/api'

export interface Course {
  course_id: string
  title: string
  academic_year: number
  term_code: string
  section: string | null
}

export function useReviewCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const coursesResult = await apiRequest<{ courses: any[], total: number }>('/courses/all', { auth: true })
        
        const coursesList = coursesResult.data?.courses
        
        if (coursesResult.error || !coursesList || !Array.isArray(coursesList) || coursesList.length === 0) {
          setError('강의 목록을 불러오는데 실패했습니다')
          return
        }
        
        const coursesData: Course[] = coursesList.map((course: any) => ({
          course_id: course.course_id,
          title: course.title,
          academic_year: course.academic_year,
          term_code: course.term_code,
          section: course.section,
        }))
        
        setCourses(coursesData)
      } catch (err) {
        console.error('Failed to fetch courses:', err)
        setError('강의 목록을 불러오는데 실패했습니다')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchCourses()
  }, [])

  return {
    courses,
    isLoading,
    error
  }
}

