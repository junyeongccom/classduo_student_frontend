/**
 * @file useLectureStudyStore.ts
 * @description 회차별 학습 상태 저장소 (courseId → lectureId → 탭 상태)
 * @module features/lecture-study/store
 * @dependencies zustand
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LectureStudyTab, LeftPanelTab } from '../types'

interface LectureStudyState {
  courseId: string | null
  lectureId: string | null
  leftTab: LeftPanelTab
  rightTab: LectureStudyTab
  leftPanelWidth: number | null
}

interface LectureStudyActions {
  setCourseId: (courseId: string | null) => void
  setLectureId: (lectureId: string | null) => void
  setLeftTab: (tab: LeftPanelTab) => void
  setRightTab: (tab: LectureStudyTab) => void
  setLeftPanelWidth: (width: number) => void
  reset: () => void
}

const initialState: LectureStudyState = {
  courseId: null,
  lectureId: null,
  leftTab: 'materials',
  rightTab: 'summary',
  leftPanelWidth: null,
}

export const useLectureStudyStore = create<LectureStudyState & LectureStudyActions>()(
  persist(
    (set) => ({
      ...initialState,
      setCourseId: (courseId) => set({ courseId }),
      setLectureId: (lectureId) => set({ lectureId }),
      setLeftTab: (leftTab) => set({ leftTab }),
      setRightTab: (rightTab) => set({ rightTab }),
      setLeftPanelWidth: (leftPanelWidth) => set({ leftPanelWidth }),
      reset: () => set(initialState),
    }),
    {
      name: 'lecture-study-state',
      version: 1,
      migrate: (persisted, version) => {
        if (version === 0) {
          return { ...initialState, ...(persisted as Record<string, unknown>) }
        }
        return persisted as LectureStudyState & LectureStudyActions
      },
    },
  ),
)
