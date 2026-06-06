/**
 * @file lectureUnlock.ts
 * @description 회차별 학습 — 특정 회차(28·29) 시간 게이트 정책 (단일 출처)
 * @module features/lecture-study/domain
 * @dependencies shared/lib/env (isDevOrLocalHost)
 */

import { isDevOrLocalHost } from '@/shared/lib/env'

/** 28·29회차 자동 활성화 시점 — KST 2026-06-08 00:00. */
export const LECTURE_28_29_UNLOCK_DATE_MS = new Date(
  '2026-06-08T00:00:00+09:00',
).getTime()

/** 시간 게이트가 걸린 회차 번호(lecture_number) 목록. */
export const TIME_GATED_LECTURE_NUMBERS: readonly number[] = [28, 29]

/**
 * 주어진 회차(lecture_number)가 현재 시각 기준 날짜 게이트로 잠겨 있는지.
 * - dev/로컬: 항상 오픈(false)
 * - prod: 28·29회차는 LECTURE_28_29_UNLOCK_DATE_MS(6/8) 이전이면 잠금(true)
 * - 그 외 회차: 게이트 없음(false)
 * 반드시 클라이언트 mount 후 호출(window 의존).
 */
export function isLectureDateLockedNow(
  lectureNumber: number | null | undefined,
): boolean {
  if (lectureNumber == null) return false
  if (!TIME_GATED_LECTURE_NUMBERS.includes(lectureNumber)) return false
  if (isDevOrLocalHost()) return false // dev/로컬은 항상 오픈
  return Date.now() < LECTURE_28_29_UNLOCK_DATE_MS
}
