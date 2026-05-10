/**
 * @file useDialogueFeedbackPopup.ts
 * @description 대화형 학습 페이지 이탈 + 채팅 세션 변경 시 만족도 평가 모달 트리거 hook
 * @module features/ai-tutor/hooks
 * @dependencies usePathname (next/navigation), useDialogueFeedbackStore, sessionStorage
 *
 * 트리거 조건 (사용자 정책 2026-05-07 갱신):
 *   1) dialogue 페이지 → 다른 페이지 이동 시 (sessionStorage.pendingSessionId 가 있으면)
 *   2) ChatInterface 가 직접 store.trigger 호출 시 (새 채팅 / 다른 세션 클릭으로 currentSessionId 변경)
 *      → 같은 dialogue 페이지 안에서 세션이 바뀌더라도 이전 세션 평가 모달이 즉시 표시됨
 *
 * "건너뛰기" / "평가 완료" 모두 dismissedSessions / ratedSessions 에 등록되어 같은 탭 동안 재표시 안 됨.
 */
'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useDialogueFeedbackStore } from '@/features/ai-tutor/store/useDialogueFeedbackStore'

const STORAGE_PENDING_KEY = 'dialogueFeedback_pendingSessionId'

const isDialoguePath = (pathname: string | null): boolean => {
  if (!pathname) return false
  return pathname.includes('/dialogue')
}

export interface DialogueFeedbackPopupState {
  /** 모달이 표시할 세션 ID. null 이면 모달 닫힘. */
  feedbackSessionId: string | null
  /** 사용자가 X / Skip 버튼 → 같은 탭에서 같은 세션 재표시 안 함. */
  dismiss: () => void
  /** 평가 완료 → 같은 세션 재표시 안 함. */
  onRated: (sessionId: string, rating: number) => void
}

export function useDialogueFeedbackPopup(): DialogueFeedbackPopupState {
  const pathname = usePathname()
  const feedbackSessionId = useDialogueFeedbackStore((s) => s.pendingFeedbackSessionId)
  const trigger = useDialogueFeedbackStore((s) => s.trigger)
  const dismiss = useDialogueFeedbackStore((s) => s.dismiss)
  const markRated = useDialogueFeedbackStore((s) => s.markRated)
  const prevPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const prev = prevPathRef.current
    const wasOnDialogue = isDialoguePath(prev)
    const isOnDialogue = isDialoguePath(pathname)

    // dialogue → 다른 페이지로 이동 (지속 학습이 아닌 진짜 이탈)
    if (wasOnDialogue && !isOnDialogue) {
      const pending = window.sessionStorage.getItem(STORAGE_PENDING_KEY)
      if (pending) {
        trigger(pending)
        // pending 은 한 번 사용 후 비움 — 다음 dialogue 진입 시 ChatInterface 가 다시 채움
        window.sessionStorage.removeItem(STORAGE_PENDING_KEY)
      }
    }

    prevPathRef.current = pathname
  }, [pathname, trigger])

  const onRated = (sessionId: string, _rating: number) => {
    markRated(sessionId)
  }

  return { feedbackSessionId, dismiss, onRated }
}

/**
 * ChatInterface 에서 사용. 두 가지 책임:
 *   1) user 메시지 ≥1 인 active session 을 sessionStorage 에 등록 → 페이지 이탈 시 모달 트리거 후보
 *   2) currentSessionId 변경 감지 → 이전 세션이 평가 가능하면 즉시 store.trigger 호출
 *      (새 채팅 / 다른 세션 클릭 시 모달 표시)
 */
export function useTrackPendingDialogueFeedback(
  currentSessionId: string | undefined,
  userMessageCount: number,
): void {
  const trigger = useDialogueFeedbackStore((s) => s.trigger)
  const prevSessionIdRef = useRef<string | undefined>(currentSessionId)
  const prevMessageCountRef = useRef<number>(userMessageCount)

  // (1) sessionStorage 에 pendingSessionId 등록 — 페이지 이탈 시 layout 트리거용
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!currentSessionId || userMessageCount < 1) return
    window.sessionStorage.setItem(STORAGE_PENDING_KEY, currentSessionId)
  }, [currentSessionId, userMessageCount])

  // (2) currentSessionId 변경 감지 → 이전 세션 평가 트리거
  useEffect(() => {
    const prevSessionId = prevSessionIdRef.current
    const prevMessageCount = prevMessageCountRef.current
    // 세션 변경 + 이전 세션이 user 메시지 ≥1 보유한 경우만 트리거
    // (사용자가 새 채팅 클릭 시 currentSessionId 가 undefined 로 바뀌고, 다른 세션 클릭 시 다른 ID 로 바뀜)
    if (prevSessionId && prevSessionId !== currentSessionId && prevMessageCount >= 1) {
      trigger(prevSessionId)
      // sessionStorage 의 pending 이 prevSessionId 였다면 비움 — 페이지 이탈 시 중복 trigger 방지
      if (typeof window !== 'undefined') {
        const stored = window.sessionStorage.getItem(STORAGE_PENDING_KEY)
        if (stored === prevSessionId) {
          window.sessionStorage.removeItem(STORAGE_PENDING_KEY)
        }
      }
    }
    prevSessionIdRef.current = currentSessionId
    prevMessageCountRef.current = userMessageCount
  }, [currentSessionId, userMessageCount, trigger])
}
