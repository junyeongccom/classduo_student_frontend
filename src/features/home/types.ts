/**
 * @file types.ts
 * @description 홈 도메인 타입 정의
 * @module features/home
 * @dependencies 없음
 */

export interface AcademicTerm {
  id: string
  name: string
  year: number
  semester: number
}

export interface Course {
  id: string
  name: string
  professor_name: string | null
  academic_term_id: string | null
  academic_term?: AcademicTerm | null
  updated_at: string | null
  created_at: string | null
}

export interface CourseGroup {
  term: AcademicTerm | null
  courses: Course[]
}
