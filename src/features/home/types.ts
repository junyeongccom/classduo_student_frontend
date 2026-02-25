/**
 * @file types.ts
 * @description 홈 도메인 타입 정의
 * @module features/home
 * @dependencies 없음
 */

export type TermCode = 'SPRING' | 'SUMMER' | 'FALL' | 'WINTER'

export interface AcademicTerm {
  /** 그룹 키: "2026-SPRING" */
  key: string
  year: number
  termCode: TermCode
}

export interface Course {
  id: string
  name: string
  professor_name: string | null
  section: string | null
  academic_term: AcademicTerm | null
  updated_at: string | null
  created_at: string | null
  totalLectures: number
  activeLectures: number
}

export interface CourseGroup {
  term: AcademicTerm | null
  courses: Course[]
}
