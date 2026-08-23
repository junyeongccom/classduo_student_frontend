/**
 * @file featureFlags.ts
 * @description 학생앱 기능 노출 플래그 — 백엔드는 유지한 채 UI 노출만 끄고 켠다
 * @module shared/constants
 */

/**
 * 소크라 문답 학생 노출 여부 (2026-08-23 지시: 추후 오픈 예정).
 * false 면 모드 토글에서 숨고, 과거 소크라 세션도 일반 대화로만 열리며
 * 소크라 관련 요청(fetchState/fetchTopics/leaderboard)이 나가지 않는다.
 */
export const SOCRATIC_ENABLED = false
