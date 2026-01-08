'use client'

import { useCallback, useEffect } from 'react'
import { useAITutorStore } from '../store/useAITutorStore'

const AI_TUTOR_LECTURE_IDS_KEY = 'ai-tutor-current-lecture-ids'

export function useLectureSelection() {
  const selectedLectureIds = useAITutorStore(state => state.selectedLectureIds)
  const setSelectedLectureIdsStore = useAITutorStore(state => state.setSelectedLectureIds)

  // Initialize from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(AI_TUTOR_LECTURE_IDS_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setSelectedLectureIdsStore(parsed)
        } catch {
          // Ignore error
        }
      }
    }
  }, [setSelectedLectureIdsStore])

  // Sync to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedLectureIds.length > 0) {
        localStorage.setItem(AI_TUTOR_LECTURE_IDS_KEY, JSON.stringify(selectedLectureIds))
      } else {
        localStorage.removeItem(AI_TUTOR_LECTURE_IDS_KEY)
      }
    }
  }, [selectedLectureIds])

  const setSelectedLectureIds = useCallback((lectureIds: string[]) => {
    setSelectedLectureIdsStore(lectureIds)
  }, [setSelectedLectureIdsStore])

  return {
    selectedLectureIds,
    setSelectedLectureIds
  }
}

