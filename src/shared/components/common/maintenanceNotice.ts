/**
 * @file maintenanceNotice.ts
 * @description 장애 사과 공지 "오늘 하루 닫기" 상태 (localStorage, 당일 자정까지)
 * @module shared/components/common
 */

const KEY = 'aplus_maintenance_notice_dismissed_until'

/** 오늘 하루 닫기로 숨김 처리된 상태인지 (당일 자정 이전이면 true). */
export function isNoticeDismissedToday(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const until = window.localStorage.getItem(KEY)
    return until != null && Date.now() < Number(until)
  } catch {
    return false
  }
}

/** 오늘 하루(당일 23:59:59 까지) 공지를 숨김. */
export function dismissNoticeForToday(): void {
  if (typeof window === 'undefined') return
  try {
    const now = new Date()
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    )
    window.localStorage.setItem(KEY, String(endOfDay.getTime()))
  } catch {
    // localStorage 불가 환경 무시
  }
}
