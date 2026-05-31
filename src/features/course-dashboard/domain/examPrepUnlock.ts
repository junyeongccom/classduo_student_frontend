/**
 * @file examPrepUnlock.ts
 * @description 기말대비학습 카드/페이지 잠금 해제 정책 — 단일 출처
 * @module features/course-dashboard/domain
 */

/** 기말대비학습 카드 자동 해제 시점 — KST 2026-06-10 00:00. */
export const EXAM_PREP_UNLOCK_DATE_MS = new Date(
  '2026-06-10T00:00:00+09:00',
).getTime()

/** 현재 시각 기준 잠금 여부. SSR/CSR 일관성을 위해 클라이언트 mount 후 호출. */
export function isExamPrepLockedNow(): boolean {
  return Date.now() < EXAM_PREP_UNLOCK_DATE_MS
}
