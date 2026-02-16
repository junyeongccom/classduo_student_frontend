/**
 * @file courseService.ts
 * @description 과목 목록 API 서비스
 * @module features/home/services
 * @dependencies shared/lib/api
 */

import { apiRequest } from '@/shared/lib/api'

export interface CourseApiItem {
  course_id: string
  title: string
  professor_name?: string | null
  academic_year: number
  term_code: string
  section?: string | null
  updated_at?: string | null
}

interface CourseApiResponse {
  courses: CourseApiItem[]
}

export const courseService = {
  getCourses: () =>
    apiRequest<CourseApiResponse>('/courses/all', {
      method: 'GET',
      auth: true,
    }),
}
