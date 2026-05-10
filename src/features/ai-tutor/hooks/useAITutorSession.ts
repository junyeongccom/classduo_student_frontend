'use client'

import { useCallback } from 'react'
import { useAITutorStore } from '../store/useAITutorStore'
import { useDialogueFeedbackStore } from '../store/useDialogueFeedbackStore'

const STORAGE_PENDING_KEY = 'dialogueFeedback_pendingSessionId'

/**
 * 세션 변경 직전에 호출. sessionStorage 의 pendingSessionId 가 등록되어 있으면 (= 현재 세션이
 * user 메시지 ≥1 보유한 적 있음) 별점 모달 트리거. ChatInterface 가 incrementChatKey 로
 * unmount/remount 되면서 useTrackPendingDialogueFeedback 의 prevSessionId 추적이 끊기는 문제 해결.
 */
function triggerFeedbackBeforeSessionChange(): void {
  if (typeof window === 'undefined') return
  const pendingId = window.sessionStorage.getItem(STORAGE_PENDING_KEY)
  if (!pendingId) return
  useDialogueFeedbackStore.getState().trigger(pendingId)
  window.sessionStorage.removeItem(STORAGE_PENDING_KEY)
}

export function useAITutorSession() {
  const currentSessionId = useAITutorStore(state => state.currentSessionId)
  const selectedLectureIds = useAITutorStore(state => state.selectedLectureIds)

  const setCurrentSessionId = useAITutorStore(state => state.setCurrentSessionId)
  const setIsSessionLocked = useAITutorStore(state => state.setIsSessionLocked)
  const incrementChatKey = useAITutorStore(state => state.incrementChatKey)
  const setMessages = useAITutorStore(state => state.setMessages)
  const setAllReferences = useAITutorStore(state => state.setAllReferences)
  const setActiveTab = useAITutorStore(state => state.setActiveTab)
  const setAutoSelectLatest = useAITutorStore(state => state.setAutoSelectLatest)
  const setSelectedLectureIds = useAITutorStore(state => state.setSelectedLectureIds)

  const handleSessionCreated = useCallback((sessionId: string | undefined) => {
    setCurrentSessionId(sessionId)
    setIsSessionLocked(true)
  }, [setCurrentSessionId, setIsSessionLocked])

  const handleSelectSession = useCallback((sessionId: string, lectureIds?: string[]) => {
    // 세션 변경 직전에 별점 모달 트리거 (현재 세션이 평가 가능하면)
    triggerFeedbackBeforeSessionChange()

    setCurrentSessionId(sessionId)

    if (lectureIds && lectureIds.length > 0) {
      setSelectedLectureIds(lectureIds)
    }

    setIsSessionLocked(true)
    incrementChatKey()
    setAutoSelectLatest(false)
    setAllReferences(new Map())
    setMessages([])
    setActiveTab('answer')
  }, [setCurrentSessionId, setIsSessionLocked, incrementChatKey, setAutoSelectLatest, setAllReferences, setMessages, setActiveTab, setSelectedLectureIds])

  const handleNewChat = useCallback(() => {
    // 새 채팅 시작 직전에 별점 모달 트리거 (이전 세션이 평가 가능하면)
    triggerFeedbackBeforeSessionChange()

    setCurrentSessionId(undefined)
    setIsSessionLocked(false)
    incrementChatKey()
    setAllReferences(new Map())
    setMessages([])
    setActiveTab('answer')

    const shouldAutoSelectLatest = selectedLectureIds.length === 0
    setAutoSelectLatest(shouldAutoSelectLatest)
  }, [setCurrentSessionId, setIsSessionLocked, incrementChatKey, setAllReferences, setMessages, setActiveTab, setAutoSelectLatest, selectedLectureIds])

  return {
    currentSessionId,
    handleSessionCreated,
    handleSelectSession,
    handleNewChat
  }
}
