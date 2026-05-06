/**
 * @file useDialogueFeedbackPopup.ts
 * @description 대화형 학습 페이지 이탈 시 만족도 평가 모달 트리거 hook
 * @module features/ai-tutor/hooks
 * @dependencies usePathname (next/navigation), sessionStorage
 *
 * 동작 규칙 (Q-C 답변 기반):
 *   - 트리거: pathname 이 dialogue 패턴 (/dialogue 포함) 에서 다른 페이지로 변경될 때
 *   - 조건: sessionStorage 에 pendingFeedbackSessionId 가 저장돼 있고,
 *           해당 세션이 이번 탭 세션 동안 dismiss 되지 않았을 것
 *   - 새 채팅 / 다른 세션 변경은 path 가 안 바뀌므로 자동 무시 (지속 학습 상태 유지)
 *   - "건너뛰기" 시 dismissedSessions 에 추가 → 같은 탭 세션 동안 다시 안 띄움.
 *     사용자가 페이지 다시 진입 → 추가 질문 → 이탈 시 다시 띄움 (탭 닫지 않은 한 sessionStorage 유지).
 */
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'

const STORAGE_PENDING_KEY = 'dialogueFeedback_pendingSessionId'
const STORAGE_DISMISSED_KEY = 'dialogueFeedback_dismissedSessions'
const STORAGE_RATED_KEY = 'dialogueFeedback_ratedSessions'

const isDialoguePath = (pathname: string | null): boolean => {
  if (!pathname) return false
  return pathname.includes('/dialogue')
}

const readJsonArray = (key: string): string[] => {
  try {
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
    window.sessionStorage.setItem(key, JSON.stringify(Array.from(new Set(arr))))
  } catch {
    /* noop */
  }
}

export interface DialogueFeedbackPopupState {
  /** 모달이 표시할 세션 ID. null 이면 모달 닫힘. */
  feedbackSessionId: string | null
  /** 사용자가 X / Skip 버튼 → 이번 탭 세션 동안 같은 세션 다시 안 띄움. */
  dismiss: () => void
  /** 평가 완료 → 평가됨 표시 + 모달 닫음. */
  onRated: (sessionId: string, rating: number) => void
}

export function useDialogueFeedbackPopup(): DialogueFeedbackPopupState {
  const pathname = usePathname()
  const [feedbackSessionId, setFeedbackSessionId] = useState<string | null>(null)
  const prevPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const prev = prevPathRef.current
    const wasOnDialogue = isDialoguePath(prev)
    const isOnDialogue = isDialoguePath(pathname)

    // dialogue → 다른 페이지로 이동 (지속 학습 아닌 진짜 이탈)
    if (wasOnDialogue && !isOnDialogue) {
      const pending = window.sessionStorage.getItem(STORAGE_PENDING_KEY)
      if (pending) {
        const dismissed = readJsonArray(STORAGE_DISMISSED_KEY)
        const rated = readJsonArray(STORAGE_RATED_KEY)
        if (!dismissed.includes(pending) && !rated.includes(pending)) {
          setFeedbackSessionId(pending)
        }
        // pending 은 한 번 사용 후 비움 — 다음 dialogue 진입 시 ChatInterface 가 다시 채움
        window.sessionStorage.removeItem(STORAGE_PENDING_KEY)
      }
    }

    prevPathRef.current = pathname
  }, [pathname])

  const dismiss = useCallback(() => {
    if (feedbackSessionId) {
      const dismissed = readJsonArray(STORAGE_DISMISSED_KEY)
      writeJsonArray(STORAGE_DISMISSED_KEY, [...dismissed, feedbackSessionId])
    }
    setFeedbackSessionId(null)
  }, [feedbackSessionId])

  const onRated = useCallback((sessionId: string, _rating: number) => {
    const rated = readJsonArray(STORAGE_RATED_KEY)
    writeJsonArray(STORAGE_RATED_KEY, [...rated, sessionId])
    setFeedbackSessionId(null)
  }, [])

  return { feedbackSessionId, dismiss, onRated }
}

/**
 * ChatInterface 에서 사용. 현재 active session 에 user 메시지가 ≥1 개 있으면
 * sessionStorage 에 pendingFeedbackSessionId 로 등록 → 이탈 시 모달 트리거 후보.
 *
 * 평가 완료된 세션은 등록하지 않음 (sessionStorage ratedSessions 체크).
 */
export function useTrackPendingDialogueFeedback(
  currentSessionId: string | undefined,
  userMessageCount: number,
): void {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!currentSessionId || userMessageCount < 1) return

    const rated = readJsonArray(STORAGE_RATED_KEY)
    if (rated.includes(currentSessionId)) return

    window.sessionStorage.setItem(STORAGE_PENDING_KEY, currentSessionId)
  }, [currentSessionId, userMessageCount])
}
