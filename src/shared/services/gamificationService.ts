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

/* ── 주간 미션 (2026-2 성장 시스템) ── */

export interface MissionItemDto {
  type: 'quiz' | 'days' | 'games' | 'all_clear' | 'incorrect_review'
  progress: number
  target: number
  completed: boolean
  /** 보너스 수령 여부 — completed && !claimed 면 수령 가능(행 흔들림) */
  claimed: boolean
  bonus_xp: number
}

export interface MissionTargetLectureDto {
  lecture_id: string
  title: string
  lecture_no: number | null
  lecture_date: string
}

export interface MissionsResponseDto {
  week: string
  missions: MissionItemDto[]
  quiz_target_lecture: MissionTargetLectureDto | null
}

/** 주간 미션 진행도·수령 상태 조회 (지급은 claimMission이 담당) */
export async function fetchMyMissions(
  courseId: string,
): Promise<{ data: MissionsResponseDto | null; error: string | null }> {
  const result = await apiRequest<MissionsResponseDto>(
    `/gamification/me/courses/${courseId}/missions`,
    { auth: true },
  )
  if (result.error) {
    return { data: null, error: result.error.message }
  }
  return { data: result.data ?? null, error: null }
}

/** 완료된 미션 보너스 수령 — 미완료/기수령이면 xp_granted 0 (멱등) */
export async function claimMission(
  courseId: string,
  missionType: MissionItemDto['type'],
): Promise<{ data: { xp_granted: number; reason: string | null } | null; error: string | null }> {
  const result = await apiRequest<{ xp_granted: number; reason: string | null }>(
    `/gamification/me/courses/${courseId}/missions/${missionType}/claim`,
    { method: 'POST', auth: true },
  )
  if (result.error) {
    return { data: null, error: result.error.message }
  }
  return { data: result.data ?? null, error: null }
}
