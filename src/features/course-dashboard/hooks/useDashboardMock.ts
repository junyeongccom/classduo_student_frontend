/**
 * @file useDashboardMock.ts
 * @description 과목 대시보드 — XP/streak/캘린더/등급 실 데이터 fetch (이름 historical, mock 아님)
 * @module features/course-dashboard/hooks
 * @dependencies fetchMyCourseState, useAuthStore, getMonthTestCounts, domain/calendar
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  fetchMyCourseState,
  type StudentCourseStateDto,
} from '@/shared/services/gamificationService'
import { useAuthStore } from '@/features/auth/store/authStore'
import {
  deriveRankFromXp,
  getKstTodayIso,
  getMonthTestCounts,
} from '@/features/exam-prep-final/components/result-overlay/utils'
import { buildMonthGrid, type AttendanceRecord, type MonthGrid } from '../domain/calendar'

export interface DashboardData {
  user: { displayName: string; xp: number }
  streak: { currentStreak: number; lastStudyDate: string | null }
  monthGrid: MonthGrid
  todayIso: string
  /** 백엔드 등급 코드 (F~A+) — GradeProgressCard 가 진행 바 계산에 사용 */
  rankCode: string
  /** 로딩 상태 */
  isLoading: boolean
}

/**
 * 해당 일자의 streak 일차를 추정한다.
 *  - last_study_date 와 그 이전 (current_streak - 1) 일 까지: streakDay = currentStreak - diffDays
 *  - 그 외: streakDay = 1 (DAY 1 톤)
 *
 * 백엔드가 일자별 streak history 를 별도로 노출하지 않으므로 클라이언트 추정이 한계.
 * 정확한 색은 streak 안에 있는 최근 N일에만 적용된다.
 */
function estimateStreakDay(
  dateIso: string,
  lastStudyDateIso: string | null,
  currentStreak: number,
): number {
  if (!lastStudyDateIso || currentStreak <= 0) return 1
  const date = new Date(`${dateIso}T00:00:00Z`)
  const last = new Date(`${lastStudyDateIso}T00:00:00Z`)
  const diffDays = Math.round((last.getTime() - date.getTime()) / 86_400_000)
  if (diffDays >= 0 && diffDays < currentStreak) {
    return currentStreak - diffDays
  }
  return 1
}

export function useDashboardMock(courseId: string): DashboardData {
  // useAuthStore 의 user.full_name 을 표시명으로 사용 (없으면 fallback '학생').
  const fullName = useAuthStore((s) => s.user?.full_name ?? '학생')
  const [state, setState] = useState<StudentCourseStateDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    fetchMyCourseState(courseId).then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        console.warn('[Dashboard] gamification state fetch failed:', error)
      }
      setState(data)
      setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [courseId])

  return useMemo(() => {
    const today = new Date()
    const todayIso = getKstTodayIso()

    const currentStreak = state?.current_streak ?? 0
    const lastStudyDate = state?.last_study_date ?? null

    // localStorage 의 일자별 풀이수를 그대로 캘린더 책 권수로 사용 (Phase 2 와 동일 소스).
    const counts = getMonthTestCounts(today.getFullYear(), today.getMonth())
    const attendance: AttendanceRecord[] = []
    counts.forEach((count, dateIso) => {
      attendance.push({
        date: dateIso,
        books: count,
        streakDay: estimateStreakDay(dateIso, lastStudyDate, currentStreak),
      })
    })

    const monthGrid = buildMonthGrid({ today, attendance })

    // 등급은 xp 로부터 직접 derive — 백엔드 rank.code 가 stale/null 인 경우에도 일관성 보장.
    // 백엔드가 정상이고 같은 RANK_THRESHOLDS 면 결과 동일.
    const totalXp = state?.total_xp ?? 0
    const rankCode = deriveRankFromXp(totalXp)

    return {
      user: { displayName: fullName, xp: totalXp },
      streak: { currentStreak, lastStudyDate },
      monthGrid,
      todayIso,
      rankCode,
      isLoading,
    }
  }, [state, fullName, isLoading])
}
