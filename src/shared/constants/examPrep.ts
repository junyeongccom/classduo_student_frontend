/**
 * @file examPrep.ts
 * @description 기말 대비 학습 관련 공통 상수 — 기말고사 일자, D-day 계산
 * @module shared/constants
 */

/** 기말고사 일자 (하드코딩 — 추후 courses 테이블에 컬럼 추가) */
export const EXAM_DATE_ISO = '2026-06-22'

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
