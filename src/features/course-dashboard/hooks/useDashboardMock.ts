/**
 * @file useDashboardMock.ts
 * @description 과목 대시보드 mock 데이터 — XP/streak/캘린더 출석 (백엔드 연동 전 임시)
 * @module features/course-dashboard/hooks
 * @dependencies domain/calendar
 */

'use client'

import { useMemo } from 'react'
import { buildMonthGrid, type AttendanceRecord, type MonthGrid } from '../domain/calendar'

export interface DashboardMock {
  user: { displayName: string; xp: number }
  streak: { currentStreak: number; lastStudyDate: string | null }
  monthGrid: MonthGrid
  /** 시안과 동일한 디스플레이 — 첨부 디자인의 "어쩌구 / 239 / 7일 연속" */
  todayIso: string
}

/**
 * 디자인 시안과 동일한 모양을 만들기 위해 today를 고정값(2026-05-07)으로 사용한다.
 * 추후 백엔드 연동 시 실제 sync 함수로 교체.
 */
export function useDashboardMock(courseId: string): DashboardMock {
  return useMemo(() => {
    const today = new Date(2026, 4, 7) // 2026-05-07 (KST 의미)
    const todayIso = '2026-05-07'

    // 7일 연속 학습 — 5월 1~7일 출석 (오늘은 책 0권으로 둠)
    const attendance: AttendanceRecord[] = [
      { date: '2026-05-01', books: 1, streakDay: 1 },
      { date: '2026-05-02', books: 2, streakDay: 2 },
      { date: '2026-05-03', books: 1, streakDay: 3 },
      { date: '2026-05-04', books: 3, streakDay: 4 },
      { date: '2026-05-05', books: 1, streakDay: 5 },
      { date: '2026-05-06', books: 1, streakDay: 6 },
      // 오늘은 아직 안 풂 — today 상태 + 책 0
    ]

    const monthGrid = buildMonthGrid({ today, attendance })

    return {
      user: { displayName: '어쩌구', xp: 239 },
      streak: { currentStreak: 7, lastStudyDate: '2026-05-06' },
      monthGrid,
      todayIso,
    }
    // courseId는 추후 실제 API 분기용 placeholder
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])
}
