'use client'

import { useCallback } from 'react'
import { useAITutorStore } from '../store/useAITutorStore'

export function useGameController() {
  const game = useAITutorStore(state => state.game)
  const openGameStore = useAITutorStore(state => state.openGame)
  const closeGameStore = useAITutorStore(state => state.closeGame)
  const setGameTriggerPosition = useAITutorStore(state => state.setGameTriggerPosition)

  const handleGameIconClick = useCallback((
    lectureId: string, 
    courseId: string, 
    lectureNo: number, 
    courseName: string, 
    position: { top: number; left: number; width: number; height: number }
  ) => {
    openGameStore(lectureId, courseId, lectureNo, courseName, position)
  }, [openGameStore])

  const handleCloseGameOverlay = useCallback(() => {
    closeGameStore()
    // Animation delay handling is inside the component usually, but here we update state.
    // The original code did:
    // setIsGameOverlayOpen(false)
    // setTimeout(() => setGameTriggerPosition(null), 600)
    
    setTimeout(() => {
      setGameTriggerPosition(null)
    }, 600)
  }, [closeGameStore, setGameTriggerPosition])

  return {
    game,
    handleGameIconClick,
    handleCloseGameOverlay
  }
}

