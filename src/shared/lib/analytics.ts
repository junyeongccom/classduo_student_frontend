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
const IDLE_TIMEOUT_MS = 5 * 60 * 1_000  // 5분 비활동 → idle
const ACTIVITY_THROTTLE_MS = 1_000       // activity 감지 throttle

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
 * session_start 이벤트를 즉시 전송하여 DAU 누락 방지
 */
export function initAnalytics() {
  if (typeof window === 'undefined') return
  if (flushTimer) return

  // 접속 즉시 session_start 전송 → DAU 즉시 반영 (5초 대기 없음)
  trackEvent('session_start', 'app')
  flushEvents()

  flushTimer = setInterval(flushEvents, FLUSH_INTERVAL_MS)

  // 페이지 이탈 시 남은 이벤트 전송
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushEvents()
    }
  })

  // 브라우저 닫기 전 — 미정리 tracker flush + 남은 이벤트 전송
  window.addEventListener('beforeunload', () => {
    // 아직 열려있는 페이지의 tracker를 모두 flush
    for (const [source, tracker] of pageIdleTrackers) {
      const timing = finalizeTracker(tracker)
      trackEvent('page_leave', source, {
        data: {
          duration_ms: timing.duration_ms,
          idle_ms: timing.idle_ms,
          total_elapsed_ms: timing.total_elapsed_ms,
          auto_flush: true,
        },
      })
    }
    pageIdleTrackers.clear()

    if (eventQueue.length === 0) return
    const payload = JSON.stringify({
      events: eventQueue,
      session_id: getSessionId(),
    })
    eventQueue = []
    const blob = new Blob([payload], { type: 'application/json' })
    navigator.sendBeacon?.(`${API_BASE_URL}/analytics/events`, blob)
  })
}

// ─── 유휴 감지 기반 체류시간 ───

interface IdleTracker {
  enterTime: number
  activeTime: number          // 누적 활성 시간 (ms)
  lastActivityTime: number
  isIdle: boolean
  idleTimeout: ReturnType<typeof setTimeout> | null
  cleanupListeners: () => void
}

const pageIdleTrackers = new Map<string, IdleTracker>()

function createIdleTracker(): IdleTracker {
  const now = Date.now()
  const tracker: IdleTracker = {
    enterTime: now,
    activeTime: 0,
    lastActivityTime: now,
    isIdle: false,
    idleTimeout: null,
    cleanupListeners: () => {},
  }

  let lastThrottled = 0

  const onActivity = () => {
    const current = Date.now()
    if (current - lastThrottled < ACTIVITY_THROTTLE_MS) return
    lastThrottled = current

    if (tracker.isIdle) {
      // idle → active 복귀
      tracker.isIdle = false
      tracker.lastActivityTime = current
    }

    // 타임아웃 리셋
    if (tracker.idleTimeout) clearTimeout(tracker.idleTimeout)
    tracker.idleTimeout = setTimeout(() => {
      if (!tracker.isIdle) {
        // active → idle 전환: 활성 시간 누적
        tracker.activeTime += Date.now() - tracker.lastActivityTime
        tracker.isIdle = true
      }
    }, IDLE_TIMEOUT_MS)
  }

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      // 탭 숨김 → 즉시 idle 처리
      if (!tracker.isIdle) {
        tracker.activeTime += Date.now() - tracker.lastActivityTime
        tracker.isIdle = true
      }
      if (tracker.idleTimeout) {
        clearTimeout(tracker.idleTimeout)
        tracker.idleTimeout = null
      }
    } else {
      // 탭 복귀 → active 복귀
      tracker.isIdle = false
      tracker.lastActivityTime = Date.now()
      onActivity() // 타임아웃 재시작
    }
  }

  const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const
  events.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }))
  document.addEventListener('visibilitychange', onVisibility)

  // 최초 idle 타임아웃 시작
  tracker.idleTimeout = setTimeout(() => {
    if (!tracker.isIdle) {
      tracker.activeTime += Date.now() - tracker.lastActivityTime
      tracker.isIdle = true
    }
  }, IDLE_TIMEOUT_MS)

  tracker.cleanupListeners = () => {
    events.forEach((evt) => window.removeEventListener(evt, onActivity))
    document.removeEventListener('visibilitychange', onVisibility)
    if (tracker.idleTimeout) clearTimeout(tracker.idleTimeout)
  }

  return tracker
}

function finalizeTracker(tracker: IdleTracker): { duration_ms: number; idle_ms: number; total_elapsed_ms: number } {
  const now = Date.now()
  const totalElapsed = now - tracker.enterTime

  // 아직 active 상태면 마지막 활성 구간 누적
  let activeTime = tracker.activeTime
  if (!tracker.isIdle) {
    activeTime += now - tracker.lastActivityTime
  }

  tracker.cleanupListeners()

  return {
    duration_ms: activeTime,
    idle_ms: totalElapsed - activeTime,
    total_elapsed_ms: totalElapsed,
  }
}

// ─── 편의 함수 ───

/**
 * 페이지 진입 기록 — 이탈 시 trackPageLeave와 짝으로 사용
 * 유휴 감지 tracker를 자동 시작
 */
export function trackPageEnter(source: string, options?: { lectureId?: string; courseId?: string }) {
  // 기존 tracker가 있으면 정리
  const existing = pageIdleTrackers.get(source)
  if (existing) existing.cleanupListeners()

  pageIdleTrackers.set(source, createIdleTracker())
  trackEvent('page_view', source, { ...options, data: { action: 'enter' } })
}

/**
 * 페이지 이탈 기록 — 활성 체류시간 자동 계산 (유휴 시간 제외)
 */
export function trackPageLeave(source: string, options?: { lectureId?: string; courseId?: string; lastTab?: string }) {
  const tracker = pageIdleTrackers.get(source)
  const timing = tracker ? finalizeTracker(tracker) : { duration_ms: 0, idle_ms: 0, total_elapsed_ms: 0 }
  pageIdleTrackers.delete(source)

  const data: Record<string, unknown> = {
    duration_ms: timing.duration_ms,
    idle_ms: timing.idle_ms,
    total_elapsed_ms: timing.total_elapsed_ms,
  }
  if (options?.lastTab) data.last_tab = options.lastTab
  trackEvent('page_leave', source, { ...options, data })
}

/**
 * 퀴즈 이벤트 트래킹 헬퍼
 */
export const quizAnalytics = {
  start(lectureId: string, data: { quiz_type: string; question_count: number }) {
    trackEvent('quiz_start', 'quiz', { lectureId, data })
  },
  answer(lectureId: string, data: { question_index: number; correct: boolean; duration_ms: number; quiz_type?: string }) {
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
  start(lectureId: string, data: { game_type: string; access_source?: string; game_mode?: string }) {
    trackEvent('game_start', 'game', { lectureId, data })
  },
  complete(lectureId: string, data: { game_type: string; score: number; duration_ms: number; access_source?: string; game_mode?: string }) {
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
 * 대화형 학습 이벤트 트래킹 헬퍼
 */
export const chatAnalytics = {
  /** 사용자 직접 질문 */
  message(lectureId: string, data: { message_length: number; question_type?: string }) {
    trackEvent('chat_message', 'dialogue', { lectureId, data })
  },
  /** PQM/Hooking 클릭 */
  questionClick(lectureId: string, data: { question_type: 'hooking' | 'pqm'; question_id?: string }) {
    trackEvent('ai_question_click', 'dialogue', { lectureId, data })
  },
  /** 채팅 세션 생성 (PQM/Hooking 클릭 또는 직접 질문으로 새 세션이 생성될 때) */
  sessionCreate(lectureId: string, data: { trigger: 'hooking' | 'pqm' | 'direct_question'; session_id?: string }) {
    trackEvent('chat_session_create', 'dialogue', { lectureId, data })
  },
  /** 후속질문 클릭 */
  followupClick(lectureId: string, data: { question_text?: string }) {
    trackEvent('followup_click', 'dialogue', { lectureId, data })
  },
  /** simple/deep 모드 전환 */
  modeSwitch(data: { mode: 'simple' | 'deep' }) {
    trackEvent('chat_mode_switch', 'dialogue', { data })
  },
  /** 채팅 입력바 포커스 */
  inputFocus(lectureId?: string) {
    trackEvent('chat_input_focus', 'dialogue', { lectureId })
  },
  /** 핵심질문 유도 배너 클릭 */
  bannerClick(lectureId: string, data: { banner_type?: string }) {
    trackEvent('chat_banner_click', 'dialogue', { lectureId, data })
  },
  /** 대화형 학습 내 회차 선택 */
  lectureSelect(lectureId: string, courseId?: string) {
    trackEvent('lecture_select', 'dialogue', { lectureId, courseId })
  },
  /** PQM/Hooking API fetch 완료 시 자동 발화 — 노출 카운트 */
  exposure(lectureId: string, data: { question_type: 'hooking' | 'pqm'; count: number }) {
    trackEvent('ai_tutor_exposure', 'dialogue', { lectureId, data })
  },
}

/** lecture_study 탭 전환 트래킹 — 탭별 체류시간 포함 */
export const lectureStudyAnalytics = {
  tabSwitch(lectureId: string, data: { from_tab: string; to_tab: string; duration_ms: number }) {
    trackEvent('tab_switch', 'lecture_study', { lectureId, data })
  },
}

/** 출처 버튼 클릭 트래킹 */
export const sourceAnalytics = {
  click(lectureId: string, data: { source_type: 'material' | 'recording'; section_key: string }) {
    trackEvent('source_click', 'lecture_study', { lectureId, data })
  },
}

/** 대화형 학습 출처탭 트래킹 */
export const dialogueSourceAnalytics = {
  sourceTabView(lectureId: string, data: { tab: 'notes' | 'materials' }) {
    trackEvent('source_tab_view', 'dialogue', { lectureId, data })
  },
}

/** 퀴즈 즐겨찾기 토글 트래킹 */
export const bookmarkAnalytics = {
  toggle(lectureId: string, data: { quiz_id: string; bookmarked: boolean }) {
    trackEvent('quiz_bookmark_toggle', 'quiz', { lectureId, data })
  },
}

/** 자료 페이지 네비게이션 트래킹 (사용자가 prev/next 클릭) */
export const materialAnalytics = {
  pageNavigate(lectureId: string, data: { page: number; direction: 'prev' | 'next'; total_pages: number }) {
    trackEvent('material_page_navigate', 'lecture_study', { lectureId, data })
  },
}

/** 커스텀 퀴즈 생성 버튼 클릭 트래킹 */
export const customQuizAnalytics = {
  generate(data: { lecture_id: string; type_counts: Record<string, number>; course_id?: string }) {
    trackEvent('custom_quiz_generate', 'my_quizzes', { data })
  },
}

/** 마이페이지 이벤트 트래킹 */
export const mypageAnalytics = {
  logout() {
    trackEvent('logout', 'mypage')
  },
  passwordChangeAttempt(success: boolean) {
    trackEvent('password_change_attempt', 'mypage', { data: { success } })
  },
  errorReportSubmit(data: { error_type: string; page?: string }) {
    trackEvent('error_report_submit', 'mypage', { data })
  },
}

/** 과목·회차 선택 트래킹 */
export const navigationAnalytics = {
  courseSelect(courseId: string) {
    trackEvent('course_select', 'studyspace', { courseId })
  },
  lectureSelect(lectureId: string, courseId: string) {
    trackEvent('lecture_select', 'studyspace', { lectureId, courseId })
  },
}

/** 패널 열기/닫기 트래킹 */
export const panelAnalytics = {
  toggle(panel: 'left' | 'chat', isOpen: boolean, lectureId?: string) {
    trackEvent('panel_toggle', 'lecture_study', { lectureId, data: { panel, is_open: isOpen } })
  },
}

/** 게임 포기 트래킹 */
export const gameAbandonAnalytics = {
  abandon(lectureId: string, data: { game_type: string; elapsed_ms: number; progress_pct?: number }) {
    trackEvent('game_abandon', 'game', { lectureId, data })
  },
}

/** 대화형 학습 피드백 (좋아요/싫어요) 트래킹 */
export const aiFeedbackAnalytics = {
  feedback(lectureId: string, data: { feedback_type: 'like' | 'dislike' | 'cancel'; message_id: string; session_id?: string }) {
    trackEvent('ai_feedback', 'dialogue', { lectureId, data })
  },
}

/** 강의자료/녹음본 트래킹 */
export const materialViewAnalytics = {
  /** 강의자료 보기 아이콘 클릭 */
  iconClick(lectureId: string) {
    trackEvent('material_icon_click', 'lecture_study', { lectureId })
  },
  /** 녹음본 토글 열기/닫기 */
  recordingToggle(lectureId: string, data: { recording_index: number; action: 'open' | 'close' }) {
    trackEvent('recording_toggle', 'lecture_study', { lectureId, data })
  },
}

/** 게임 추가 트래킹 */
export const gameExtraAnalytics = {
  /** 랭크보기 클릭 */
  rankView(lectureId: string, data: { game_type: string }) {
    trackEvent('game_rank_view', 'game', { lectureId, data })
  },
  /** 일반플레이 단어 추가/편집/삭제 */
  wordEdit(lectureId: string, data: { action: 'add' | 'edit' | 'delete'; word?: string }) {
    trackEvent('game_word_edit', 'game', { lectureId, data })
  },
}

/** 내 퀴즈 세션 클릭 트래킹 */
export const myQuizSessionAnalytics = {
  sessionClick(data: { session_id: string; lecture_id?: string }) {
    trackEvent('myquiz_session_click', 'my_quizzes', { data })
  },
}

/** 스크롤 깊이 트래킹 — 25/50/75/100% 도달 시 발생 */
export const scrollAnalytics = {
  depth(source: string, depthPct: number, lectureId?: string) {
    trackEvent('scroll_depth', source, { lectureId, data: { depth_pct: depthPct } })
  },
}

/** 포커스 이탈 트래킹 — 탭 전환/최소화 감지 */
export const focusAnalytics = {
  loss(source: string, awayDurationMs: number, lectureId?: string) {
    trackEvent('focus_loss', source, { lectureId, data: { away_duration_ms: awayDurationMs } })
  },
}

/**
 * 스크롤 깊이 옵저버 — 컴포넌트에서 useEffect로 호출
 * 반환값의 cleanup 함수를 useEffect return에 전달
 */
export function createScrollDepthObserver(
  containerRef: { current: HTMLElement | null },
  source: string,
  lectureId?: string,
) {
  const reported = new Set<number>()
  const thresholds = [25, 50, 75, 100]

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const scrollPct = Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100)
    for (const t of thresholds) {
      if (scrollPct >= t && !reported.has(t)) {
        reported.add(t)
        scrollAnalytics.depth(source, t, lectureId)
      }
    }
  }

  const el = containerRef.current
  el?.addEventListener('scroll', handleScroll, { passive: true })

  return () => {
    el?.removeEventListener('scroll', handleScroll)
  }
}

/**
 * 포커스 이탈 감지 — initAnalytics에서 자동 등록되지 않으므로 별도 호출
 * 반환값의 cleanup 함수를 useEffect return에 전달
 */
export function createFocusLossTracker(source: string, lectureId?: string) {
  let hiddenAt: number | null = null

  const handleVisibility = () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now()
    } else if (hiddenAt !== null) {
      const awayMs = Date.now() - hiddenAt
      if (awayMs > 3000) {
        focusAnalytics.loss(source, awayMs, lectureId)
      }
      hiddenAt = null
    }
  }

  document.addEventListener('visibilitychange', handleVisibility)

  return () => {
    document.removeEventListener('visibilitychange', handleVisibility)
  }
}
