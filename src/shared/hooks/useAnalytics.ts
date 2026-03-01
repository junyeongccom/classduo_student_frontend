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
