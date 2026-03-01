/**
 * @file useAnalytics.ts
 * @description GA4 dataLayer 이벤트 전송 유틸리티
 * @module shared/hooks
 * @dependencies none (window.dataLayer 직접 사용)
 */

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[]
  }
}

/** dataLayer에 이벤트 push */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
) {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event: eventName, ...params })
}

/** 로그인 후 user_id 설정 */
export function setAnalyticsUser(userId: string) {
  trackEvent('set_user_id', { user_id: userId })
}

/** 로그아웃 시 user_id 초기화 */
export function clearAnalyticsUser() {
  trackEvent('set_user_id', { user_id: undefined })
}

// ── GA4 커스텀 이벤트 헬퍼 (타입 안전) ──

export function trackGameStart(params: {
  game_type: string
  lecture_id: string
  course_id: string
  game_mode: string
}) {
  trackEvent('game_start', params)
}

export function trackGameComplete(params: {
  game_type: string
  game_score: number
  correct: number
  wrong: number
  elapsed_ms: number
  lecture_id: string
  course_id: string
  game_mode: string
  obstacle_hit?: number
  skipped?: number
}) {
  trackEvent('game_complete', params)
}

export function trackInGameQuizAttempt(params: {
  correct: boolean
  lecture_id: string
  course_id: string
}) {
  trackEvent('in_game_quiz_attempt', params)
}

export function trackTabView(params: {
  tab: string
  lecture_id: string
  course_id: string
}) {
  trackEvent('tab_view', params)
}

export function trackAiTutorQuestion(params: {
  chat_session_id: string
  lecture_count: number
  question_length: number
  chat_mode: string
  course_id: string
}) {
  trackEvent('ai_tutor_question', params)
}

export function trackSummaryViewed(params: {
  lecture_id: string
  course_id: string
}) {
  trackEvent('summary_viewed', params)
}

export function trackQuizAttempt(params: {
  quiz_id: string
  correct: boolean
  quiz_type: string
  lecture_id: string
  course_id: string
}) {
  trackEvent('quiz_attempt', params)
}

export function trackQuizSelfStart(params: {
  lecture_id: string
  course_id: string
  entry_source: string
  tab: string
}) {
  trackEvent('quiz_self_start', params)
}

export function setUserProperties(props: {
  user_group?: string
  ges_score?: number
  lis_score?: number
}) {
  trackEvent('set_user_properties', props)
}
