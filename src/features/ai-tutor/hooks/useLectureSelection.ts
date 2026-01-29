'use client'

import { useCallback, useEffect } from 'react'
import { useAITutorStore } from '../store/useAITutorStore'
import { STUDYSPACE_SELECTION_KEY, type StudyspaceSelection } from '@/shared/constants/selection'

const AI_TUTOR_LECTURE_IDS_KEY = 'ai-tutor-current-lecture-ids'

export function useLectureSelection() {
  const selectedLectureIds = useAITutorStore(state => state.selectedLectureIds)
  const setSelectedLectureIdsStore = useAITutorStore(state => state.setSelectedLectureIds)

  // Initialize from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (selectedLectureIds.length > 0) return

    const shared = localStorage.getItem(STUDYSPACE_SELECTION_KEY)
    if (shared) {
      try {
        const parsed = JSON.parse(shared) as StudyspaceSelection
        if (Array.isArray(parsed.lectureIds) && parsed.lectureIds.length > 0) {
          setSelectedLectureIdsStore(parsed.lectureIds)
          return
        }
      } catch {
        // ignore
      }
    }

    const saved = localStorage.getItem(AI_TUTOR_LECTURE_IDS_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSelectedLectureIdsStore(parsed)
      } catch {
        // Ignore error
      }
    }
  }, [setSelectedLectureIdsStore, selectedLectureIds.length])

  // Sync to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (selectedLectureIds.length > 0) {
      localStorage.setItem(AI_TUTOR_LECTURE_IDS_KEY, JSON.stringify(selectedLectureIds))
    } else {
      localStorage.removeItem(AI_TUTOR_LECTURE_IDS_KEY)
    }

    try {
      const sharedRaw = localStorage.getItem(STUDYSPACE_SELECTION_KEY)
      const shared = sharedRaw ? (JSON.parse(sharedRaw) as StudyspaceSelection) : {}
      const next: StudyspaceSelection = { ...shared, lectureIds: selectedLectureIds }
      localStorage.setItem(STUDYSPACE_SELECTION_KEY, JSON.stringify(next))
    } catch {
      // ignore
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

