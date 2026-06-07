/**
 * @file examPrepUnlock.ts
 * @description 기말대비학습 카드/페이지 잠금 해제 정책 — 단일 출처
 * @module features/course-dashboard/domain
 * @dependencies shared/lib/env (isDevOrLocalHost)
 */

import { isDevOrLocalHost } from '@/shared/lib/env'

/** 기말대비학습 카드 자동 해제 시점 — KST 2026-06-10 00:00. */
export const EXAM_PREP_UNLOCK_DATE_MS = new Date(
  '2026-06-10T00:00:00+09:00',
).getTime()

/**
 * prod 잠금 기간에도 기말대비학습 접근을 허용하는 사용자(full_name) allowlist.
 * 내부 시연/검수용 — dev/로컬은 어차피 항상 오픈이므로 이 목록은 prod 에서만 의미가 있다.
 */
export const EXAM_PREP_ALLOWLIST_NAMES: readonly string[] = [
  '천준영',
  '윤건재',
  '테스트계정',
  '테스트',
]

/** 주어진 full_name 이 allowlist 에 포함되는지 (앞뒤 공백 무시). */
export function isExamPrepAllowedUser(fullName?: string | null): boolean {
  if (!fullName) return false
  return EXAM_PREP_ALLOWLIST_NAMES.includes(fullName.trim())
}

/**
 * 현재 시각·사용자 기준 잠금 여부. SSR/CSR 일관성을 위해 클라이언트 mount 후 호출.
 * - dev/로컬: 항상 오픈
 * - allowlist 사용자: prod 에서도 항상 오픈
 * - 그 외 prod: EXAM_PREP_UNLOCK_DATE_MS(6/10) 이전이면 잠금
 */
export function isExamPrepLockedNow(fullName?: string | null): boolean {
  if (isDevOrLocalHost()) return false // dev/로컬은 항상 오픈
  if (isExamPrepAllowedUser(fullName)) return false // allowlist 는 prod 에서도 오픈
  return Date.now() < EXAM_PREP_UNLOCK_DATE_MS
}
