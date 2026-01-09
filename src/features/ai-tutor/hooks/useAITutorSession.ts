'use client'

import { useCallback, useEffect } from 'react'
import { useAITutorStore } from '../store/useAITutorStore'

const AI_TUTOR_SESSION_KEY = 'ai-tutor-current-session-id'

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

  // Initialize session ID from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSessionId = localStorage.getItem(AI_TUTOR_SESSION_KEY) || undefined
      if (savedSessionId) {
        setCurrentSessionId(savedSessionId)
      } else {
        // 세션이 없고 선택된 회차도 없으면 최신 회차 자동 선택 활성화
        if (selectedLectureIds.length === 0) {
          setAutoSelectLatest(true)
        }
      }
    }
  }, [setCurrentSessionId, setAutoSelectLatest, selectedLectureIds.length])

  // Sync session ID to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (currentSessionId) {
        localStorage.setItem(AI_TUTOR_SESSION_KEY, currentSessionId)
      } else {
        localStorage.removeItem(AI_TUTOR_SESSION_KEY)
      }
    }
  }, [currentSessionId])

  const handleSessionCreated = useCallback((sessionId: string | undefined) => {
    setCurrentSessionId(sessionId)
    setIsSessionLocked(true)
  }, [setCurrentSessionId, setIsSessionLocked])

  const handleSelectSession = useCallback((sessionId: string, lectureIds?: string[]) => {
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
    setCurrentSessionId(undefined)
    setIsSessionLocked(false)
    incrementChatKey()
    setAllReferences(new Map())
    setMessages([])
    setActiveTab('answer')
    
    setSelectedLectureIds([])
    setAutoSelectLatest(true)
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AI_TUTOR_SESSION_KEY)
    }
  }, [setCurrentSessionId, setIsSessionLocked, incrementChatKey, setAllReferences, setMessages, setActiveTab, setSelectedLectureIds, setAutoSelectLatest])

  return {
    currentSessionId,
    handleSessionCreated,
    handleSelectSession,
    handleNewChat
  }
}

