/**
 * @file useDialogueFeedbackStore.ts
 * @description 대화형 학습 만족도 평가 모달 트리거를 위한 zustand store.
 * @module features/ai-tutor/store
 * @dependencies zustand, sessionStorage (dismissed / rated 영속화)
 *
 * 트리거 조건:
 *   - 채팅 세션 변경 (새 채팅 클릭 / 다른 세션 클릭) — ChatInterface 가 호출
 *   - dialogue 페이지 이탈 — layout 의 useDialogueFeedbackPopup 이 호출
 *
 * 멱등 가드:
 *   - dismissedSessions / ratedSessions 는 sessionStorage 에 저장 → 같은 탭 동안 재표시 안 함
 *   - pendingFeedbackSessionId 가 이미 세팅되어 있으면 추가 trigger 무시 (모달 중복 방지)
 */
import { create } from 'zustand'

const STORAGE_DISMISSED_KEY = 'dialogueFeedback_dismissedSessions'
const STORAGE_RATED_KEY = 'dialogueFeedback_ratedSessions'

const readJsonArray = (key: string): string[] => {
  try {
    if (typeof window === 'undefined') return []
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

const writeJsonArray = (key: string, arr: string[]): void => {
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(key, JSON.stringify(Array.from(new Set(arr))))
  } catch {
    /* noop */
  }
}

interface DialogueFeedbackState {
  /** 현재 모달이 평가 받을 세션 ID. null 이면 모달 닫힘. */
  pendingFeedbackSessionId: string | null
}

interface DialogueFeedbackActions {
  /** 평가 모달 트리거. dismissed/rated 인 세션은 무시. 이미 모달 표시 중이면 무시. */
  trigger: (sessionId: string) => void
  /** 사용자가 닫기/Skip — 같은 탭 동안 같은 세션 재표시 안 함. */
  dismiss: () => void
  /** 사용자가 별점 평가 완료 — 같은 세션 재표시 안 함. */
  markRated: (sessionId: string) => void
}

export const useDialogueFeedbackStore = create<DialogueFeedbackState & DialogueFeedbackActions>(
  (set, get) => ({
    pendingFeedbackSessionId: null,

    trigger: (sessionId: string) => {
      if (!sessionId) return
      // 이미 모달 표시 중이면 새 trigger 무시 (사용자가 평가/dismiss 후에 다시 받음)
      if (get().pendingFeedbackSessionId) return
      const dismissed = readJsonArray(STORAGE_DISMISSED_KEY)
      const rated = readJsonArray(STORAGE_RATED_KEY)
      if (dismissed.includes(sessionId) || rated.includes(sessionId)) return
      set({ pendingFeedbackSessionId: sessionId })
    },

    dismiss: () => {
      const id = get().pendingFeedbackSessionId
      if (id) {
        const dismissed = readJsonArray(STORAGE_DISMISSED_KEY)
        writeJsonArray(STORAGE_DISMISSED_KEY, [...dismissed, id])
      }
      set({ pendingFeedbackSessionId: null })
    },

    markRated: (sessionId: string) => {
      if (sessionId) {
        const rated = readJsonArray(STORAGE_RATED_KEY)
        writeJsonArray(STORAGE_RATED_KEY, [...rated, sessionId])
      }
      set({ pendingFeedbackSessionId: null })
    },
  })
)
