/**
 * @file gamificationService.ts
 * @description /gamification/me/courses/{course_id} 학생-과목 상태 조회
 * @module features/exam-prep-final/services
 * @dependencies shared/lib/api
 */
import { apiRequest } from '@/shared/lib/api'

export interface RankEvaluation {
  code: string
  total_xp: number
  master_xp: number
  stamp_xp: number
}

export interface StudentCourseState {
  student_id: string
  course_id: string
  master_xp: number
  stamp_xp: number
  total_xp: number
  mastered_problem_count: number
  current_streak: number
  total_study_days: number
  /** ISO yyyy-mm-dd (KST) — 오늘과 같으면 오늘 도장을 받은 상태 */
  last_study_date: string | null
  rank: RankEvaluation
}

/** 학생-과목 누적 상태 + 계급 */
export async function getStudentCourseState(
  courseId: string,
): Promise<{ data: StudentCourseState | null; error: string | null }> {
  const result = await apiRequest<StudentCourseState>(
    `/gamification/me/courses/${courseId}`,
    { method: 'GET', auth: true },
  )
  if (result.error) {
    return { data: null, error: result.error.message }
  }
  return { data: result.data, error: null }
}
