/**
 * @file featureFlags.ts
 * @description Feature flag 관리 — 새 학습 공간 UI 전환 제어
 * @module shared/lib
 * @dependencies 없음 (순수 환경변수 읽기)
 */

/**
 * 새로운 학습 공간 UI 사용 여부
 * 환경변수 NEXT_PUBLIC_USE_NEW_STUDYSPACE로 제어
 * 기본값: false (기존 UI)
 */
export function useNewStudyspace(): boolean {
  return process.env.NEXT_PUBLIC_USE_NEW_STUDYSPACE === 'true'
}
