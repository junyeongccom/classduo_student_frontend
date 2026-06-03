/**
 * @file examPrepUnlock.ts
 * @description 기말대비학습 카드/페이지 잠금 해제 정책 — 단일 출처
 * @module features/course-dashboard/domain
 */

/** 기말대비학습 카드 자동 해제 시점 — KST 2026-06-10 00:00. */
export const EXAM_PREP_UNLOCK_DATE_MS = new Date(
  '2026-06-10T00:00:00+09:00',
).getTime()

/**
 * dev/로컬 환경 여부 — hostname 기준.
 * dev 사이트(dev-korea.aplus.io.kr)·localhost 는 날짜 게이트와 무관하게 항상 오픈.
 * prod(korea.aplus.io.kr)만 EXAM_PREP_UNLOCK_DATE_MS 게이트 적용.
 * 반드시 클라이언트 mount 후 호출(window 의존).
 */
function isDevOrLocalHost(): boolean {
  if (typeof window === 'undefined') return false // SSR: prod 취급(잠금)
  const host = window.location.hostname
  return (
    host === 'localhost' ||
    host.startsWith('127.') ||
    host.startsWith('dev-')
  )
}

/** 현재 시각 기준 잠금 여부. SSR/CSR 일관성을 위해 클라이언트 mount 후 호출. */
export function isExamPrepLockedNow(): boolean {
  if (isDevOrLocalHost()) return false // dev/로컬은 항상 오픈
  return Date.now() < EXAM_PREP_UNLOCK_DATE_MS
}
