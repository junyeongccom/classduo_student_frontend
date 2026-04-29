/**
 * @file computeWeekAndDday.ts
 * @description 학기 시작일·기말일로부터 현재 주차·D-day 계산 (라이브러리 무의존, KST 기준)
 * @module features/course-dashboard/domain
 */

/** YYYY-MM-DD 또는 ISO 문자열 → 자정 기준 Date */
function toMidnight(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
}

/** 두 날짜 사이의 일 수 차이 (b - a, 음수 가능) */
export function diffDays(a: Date, b: Date): number {
  const MS = 24 * 60 * 60 * 1000
  return Math.floor((b.getTime() - a.getTime()) / MS)
}

/**
 * 학기 시작일 기준 현재 주차 계산 (1-based)
 * - termStart 미지정 시 null 반환
 * - 학기 시작 전 → 1주차로 클램프
 * - 16주 초과 → 16주차로 클램프 (보호값)
 */
export function computeCurrentWeek(termStart: string | Date | null | undefined): number | null {
  const start = typeof termStart === 'string' ? toMidnight(termStart) : termStart ?? null
  if (!start) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = diffDays(start, today)
  const week = Math.floor(days / 7) + 1
  if (week < 1) return 1
  if (week > 16) return 16
  return week
}

/**
 * 기말일까지 남은 일수 (오늘 기준, 양수)
 * - examDate 미지정 또는 이미 지난 경우 null
 */
export function computeDdayToExam(examDate: string | Date | null | undefined): number | null {
  const exam = typeof examDate === 'string' ? toMidnight(examDate) : examDate ?? null
  if (!exam) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = diffDays(today, exam)
  if (days < 0) return null
  return days
}

/** 회차 목록에서 현재 주차에 해당하는 가장 큰 week_number 추정 (학기 시작일 미지정 시 fallback) */
export function inferCurrentWeekFromLectures(
  lectures: Array<{ week_number: number | null; has_content: boolean }>,
): number | null {
  const activeWeeks = lectures
    .filter((l) => l.has_content && typeof l.week_number === 'number')
    .map((l) => l.week_number as number)
  if (activeWeeks.length === 0) return null
  return Math.max(...activeWeeks)
}
