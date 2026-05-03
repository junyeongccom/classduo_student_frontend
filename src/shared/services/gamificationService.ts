/**
 * @file gamificationService.ts
 * @description 백엔드 gamification API (학생 상태/리더보드) 호출 서비스
 * @module shared/services
 * @dependencies shared/lib/api
 */

import { apiRequest } from '@/shared/lib/api'

export interface RankEvaluationDto {
  code: string
  total_xp: number
  master_xp: number
  stamp_xp: number
}

export interface StudentCourseStateDto {
  student_id: string
  course_id: string
  master_xp: number
  stamp_xp: number
  total_xp: number
  mastered_problem_count: number
  current_streak: number
  total_study_days: number
  last_study_date: string | null
  rank: RankEvaluationDto
}

export interface LeaderboardEntryDto {
  student_id: string
  total_xp: number
  master_xp: number
  stamp_xp: number
  rank_code: string
}

export interface LeaderboardResponseDto {
  course_id: string
  entries: LeaderboardEntryDto[]
}

/** 현재 학생의 (과목) 누적 상태 + 계급 조회 */
export async function fetchMyCourseState(
  courseId: string,
): Promise<{ data: StudentCourseStateDto | null; error: string | null }> {
  const result = await apiRequest<StudentCourseStateDto>(
    `/gamification/me/courses/${courseId}`,
    { auth: true },
  )
  if (result.error) {
    return { data: null, error: result.error.message }
  }
  return { data: result.data ?? null, error: null }
}

/** 과목 리더보드 (총 XP desc) */
export async function fetchCourseLeaderboard(
  courseId: string,
  limit = 100,
): Promise<{ data: LeaderboardResponseDto | null; error: string | null }> {
  const result = await apiRequest<LeaderboardResponseDto>(
    `/gamification/courses/${courseId}/leaderboard?limit=${limit}`,
    { auth: true },
  )
  if (result.error) {
    return { data: null, error: result.error.message }
  }
  return { data: result.data ?? null, error: null }
}
