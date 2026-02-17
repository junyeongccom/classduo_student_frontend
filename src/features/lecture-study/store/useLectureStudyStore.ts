/**
 * @file useLectureStudyStore.ts
 * @description 회차별 학습 상태 저장소 (courseId → lectureId → 탭/패널 상태)
 * @module features/lecture-study/store
 * @dependencies zustand
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LeftPanelTab, LectureStudyTab } from '../types'

interface WordItem {
  id: string
  keyword: string
  description: string
}

interface LectureStudyState {
  courseId: string | null
  lectureId: string | null
  isLeftPanelOpen: boolean
  isChatPanelOpen: boolean
  leftTab: LeftPanelTab
  rightTab: LectureStudyTab
  leftPanelWidth: number | null
  chatPanelWidth: number | null
  gameWords: WordItem[]
}

interface LectureStudyActions {
  setCourseId: (courseId: string | null) => void
  setLectureId: (lectureId: string | null) => void
  toggleLeftPanel: () => void
  toggleChatPanel: () => void
  setLeftTab: (tab: LeftPanelTab) => void
  setRightTab: (tab: LectureStudyTab) => void
  setLeftPanelWidth: (width: number) => void
  setChatPanelWidth: (width: number) => void
  setGameWords: (words: WordItem[]) => void
  reset: () => void
}

const initialState: LectureStudyState = {
  courseId: null,
  lectureId: null,
  isLeftPanelOpen: false,
  isChatPanelOpen: false,
  leftTab: 'materials',
  rightTab: 'summary',
  leftPanelWidth: null,
  chatPanelWidth: null,
  gameWords: [],
}

export const useLectureStudyStore = create<LectureStudyState & LectureStudyActions>()(
  persist(
    (set) => ({
      ...initialState,
      setCourseId: (courseId) => set({ courseId }),
      setLectureId: (lectureId) => set({ lectureId }),
      toggleLeftPanel: () => set((s) => ({ isLeftPanelOpen: !s.isLeftPanelOpen })),
      toggleChatPanel: () => set((s) => ({ isChatPanelOpen: !s.isChatPanelOpen })),
      setLeftTab: (leftTab) => set({ leftTab }),
      setRightTab: (rightTab) => set({ rightTab }),
      setLeftPanelWidth: (leftPanelWidth) => set({ leftPanelWidth }),
      setChatPanelWidth: (chatPanelWidth) => set({ chatPanelWidth }),
      setGameWords: (gameWords) => set({ gameWords }),
      reset: () => set(initialState),
    }),
    {
      name: 'lecture-study-state',
      version: 4,
      migrate: (persisted, version) => {
        if (version < 4) {
          const old = persisted as Record<string, unknown>
          const { leftTab: _leftTab, ...rest } = old
          return { ...initialState, ...rest, isLeftPanelOpen: false, isChatPanelOpen: false, chatPanelWidth: null }
        }
        return persisted as LectureStudyState & LectureStudyActions
      },
    },
  ),
)
