/**
 * @file analytics.ts
 * @description 프론트엔드 이벤트 트래킹 서비스 — 사용자 행동 데이터를 백엔드로 배치 전송
 * @module shared/lib
 * @dependencies api.ts
 */
import { apiRequest } from './api'
import { API_BASE_URL } from './utils'

// ─── 타입 ───

type AnalyticsEventData = Record<string, unknown>

interface AnalyticsEvent {
  event: string
  timestamp: string
  source: string
  lecture_id?: string
  course_id?: string
  data?: AnalyticsEventData
}

// ─── 설정 ───

const FLUSH_INTERVAL_MS = 5_000 // 5초마다 배치 전송
const MAX_QUEUE_SIZE = 50       // 큐가 이만큼 차면 즉시 전송

// ─── 상태 ───

let eventQueue: AnalyticsEvent[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null
let sessionId: string | null = null

function getSessionId(): string {
  if (sessionId) return sessionId
  if (typeof window === 'undefined') return 'ssr'
  const key = 'classduo_analytics_session'
  let stored = sessionStorage.getItem(key)
  if (!stored) {
    stored = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    sessionStorage.setItem(key, stored)
  }
  sessionId = stored
  return stored
}

// ─── 핵심 함수 ───

/**
 * 이벤트를 큐에 추가
 */
export function trackEvent(
  event: string,
  source: string,
  options?: {
    lectureId?: string
    courseId?: string
    data?: AnalyticsEventData
  }
) {
  const entry: AnalyticsEvent = {
    event,
    timestamp: new Date().toISOString(),
    source,
    ...(options?.lectureId && { lecture_id: options.lectureId }),
    ...(options?.courseId && { course_id: options.courseId }),
    ...(options?.data && { data: options.data }),
  }

  eventQueue.push(entry)

  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    flushEvents()
  }
}

/**
 * 큐에 쌓인 이벤트를 백엔드로 전송
 */
async function flushEvents() {
  if (eventQueue.length === 0) return

  const batch = [...eventQueue]
  eventQueue = []

  try {
    await apiRequest('/analytics/events', {
      method: 'POST',
      auth: true,
      body: {
        events: batch,
        session_id: getSessionId(),
      },
    })
  } catch {
    // 전송 실패 시 큐에 다시 넣되 무한 증가 방지
    if (eventQueue.length < MAX_QUEUE_SIZE * 2) {
      eventQueue = [...batch, ...eventQueue]
    }
  }
}

/**
 * 타이머 시작 (앱 마운트 시 1회 호출)
 */
export function initAnalytics() {
  if (typeof window === 'undefined') return
  if (flushTimer) return

  flushTimer = setInterval(flushEvents, FLUSH_INTERVAL_MS)

  // 페이지 이탈 시 남은 이벤트 전송
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushEvents()
    }
  })

  // 브라우저 닫기 전 전송 (sendBeacon fallback)
  window.addEventListener('beforeunload', () => {
    if (eventQueue.length === 0) return
    const payload = JSON.stringify({
      events: eventQueue,
      session_id: getSessionId(),
    })
    eventQueue = []
    navigator.sendBeacon?.(`${API_BASE_URL}/analytics/events`, payload)
  })
}

// ─── 편의 함수 ───

/** 페이지/탭 진입 시간 기록용 */
const pageEnterTimes = new Map<string, number>()

/**
 * 페이지 진입 기록 — 이탈 시 trackPageLeave와 짝으로 사용
 */
export function trackPageEnter(source: string, options?: { lectureId?: string; courseId?: string }) {
  pageEnterTimes.set(source, Date.now())
  trackEvent('page_view', source, { ...options, data: { action: 'enter' } })
}

/**
 * 페이지 이탈 기록 — 체류시간 자동 계산
 */
export function trackPageLeave(source: string, options?: { lectureId?: string; courseId?: string }) {
  const enterTime = pageEnterTimes.get(source)
  const durationMs = enterTime ? Date.now() - enterTime : 0
  pageEnterTimes.delete(source)
  trackEvent('page_leave', source, { ...options, data: { duration_ms: durationMs } })
}

/**
 * 퀴즈 이벤트 트래킹 헬퍼
 */
export const quizAnalytics = {
  start(lectureId: string, data: { quiz_type: string; question_count: number }) {
    trackEvent('quiz_start', 'quiz', { lectureId, data })
  },
  answer(lectureId: string, data: { question_index: number; correct: boolean; duration_ms: number }) {
    trackEvent('quiz_answer', 'quiz', { lectureId, data })
  },
  complete(lectureId: string, data: { total_duration_ms: number; accuracy: number; question_count: number }) {
    trackEvent('quiz_complete', 'quiz', { lectureId, data })
  },
  abandon(lectureId: string, data: { last_question_index: number; progress: number }) {
    trackEvent('quiz_abandon', 'quiz', { lectureId, data })
  },
}

/**
 * 게임 이벤트 트래킹 헬퍼
 */
export const gameAnalytics = {
  start(lectureId: string, data: { game_type: string; access_source?: string }) {
    trackEvent('game_start', 'game', { lectureId, data })
  },
  complete(lectureId: string, data: { game_type: string; score: number; duration_ms: number; access_source?: string }) {
    trackEvent('game_complete', 'game', { lectureId, data })
  },
}

/**
 * 내 퀴즈 탭 이벤트 트래킹 헬퍼
 */
export const myQuizAnalytics = {
  tabView(tab: string) {
    trackEvent('myquiz_tab_view', 'my_quizzes', { data: { tab } })
  },
}

/**
 * AI 튜터 이벤트 트래킹 헬퍼
 */
export const chatAnalytics = {
  message(lectureId: string, data: { message_length: number }) {
    trackEvent('chat_message', 'ai-tutor', { lectureId, data })
  },
}
