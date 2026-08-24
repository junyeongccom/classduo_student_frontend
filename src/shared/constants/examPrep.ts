/**
 * @file examPrep.ts
 * @description 기말 대비 학습 관련 공통 상수 — 기말고사 일자, D-day 계산
 * @module shared/constants
 */

/** 기말고사 일자 (하드코딩 — 추후 courses/academic_terms 에서 조회하도록 이전).
 *
 *  ⚠️ 학기마다 반드시 갱신할 것. 지난 학기 값이 남으면 학생 화면에 이미 지나간 날짜가
 *  "D-0" 으로 고정 표시된다 (2026-08-25 실측: 2학기 강좌에 1학기 값 2026-06-22 노출).
 *  현재 값 = 2026-2학기 종료일(academic_terms FALL end_date). 실제 시험일 확정 시 교체. */
export const EXAM_DATE_ISO = '2026-12-18'

/** EXAM_DATE_ISO 기준 오늘부터 남은 일수 (자정 기준, 음수 보호 → 0) */
export function computeDdaysToExam(targetIso: string = EXAM_DATE_ISO): number {
  const target = new Date(targetIso)
  if (Number.isNaN(target.getTime())) return 0
  target.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const ms = target.getTime() - today.getTime()
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  return Math.max(0, days)
}
