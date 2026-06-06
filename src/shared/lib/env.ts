/**
 * @file env.ts
 * @description 실행 환경(dev/로컬 vs prod) 판별 — hostname 기준 단일 출처
 * @module shared/lib
 * @dependencies 없음 (순수 window.location 읽기)
 */

/**
 * dev/로컬 환경 여부 — hostname 기준.
 * dev 사이트(dev-*)·localhost·127.* 은 prod 전용 게이트(날짜/잠금)와 무관하게 항상 오픈 취급.
 * 반드시 클라이언트 mount 후 호출(window 의존). SSR 에서는 false(=prod 취급).
 */
export function isDevOrLocalHost(): boolean {
  if (typeof window === 'undefined') return false // SSR: prod 취급
  const host = window.location.hostname
  return (
    host === 'localhost' ||
    host.startsWith('127.') ||
    host.startsWith('dev-')
  )
}
