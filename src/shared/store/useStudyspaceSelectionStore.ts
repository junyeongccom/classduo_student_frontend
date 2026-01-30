import { create } from 'zustand'
import type { StudyspaceSelection, StudyspaceTab } from '@/shared/lib/studyspaceSelection'
import {
  areLectureIdsEqual,
  buildStudyspaceSelection,
  normalizeLectureIds,
} from '@/shared/lib/studyspaceSelection'

interface StudyspaceSelectionState extends StudyspaceSelection {
  isHydrated: boolean
}

interface StudyspaceSelectionActions {
  hydrateSelection: (selection: StudyspaceSelection | null, options?: { force?: boolean }) => void
  setSelection: (selection: Omit<StudyspaceSelection, 'updatedAt'> & { updatedAt?: number }) => void
  setCourseId: (courseId: string | null, source: StudyspaceTab) => void
  setLectureIds: (lectureIds: string[], source: StudyspaceTab) => void
}

const initialState: StudyspaceSelectionState = {
  courseId: null,
  lectureIds: [],
  source: 'ai-tutor',
  updatedAt: 0,
  isHydrated: false,
}

export const useStudyspaceSelectionStore = create<
  StudyspaceSelectionState & StudyspaceSelectionActions
>((set, get) => ({
  ...initialState,
  hydrateSelection: (selection, options) => {
    const state = get()
    if (!selection) {
      set({ ...state, isHydrated: true })
      return
    }
    if (!options?.force && selection.updatedAt <= state.updatedAt) {
      set({ ...state, isHydrated: true })
      return
    }
    const next = buildStudyspaceSelection(selection)
    set({ ...state, ...next, isHydrated: true })
  },
  setSelection: (selection) =>
    set((state) => {
      const next = buildStudyspaceSelection(selection)
      if (
        state.courseId === next.courseId &&
        areLectureIdsEqual(state.lectureIds, next.lectureIds) &&
        state.source === next.source
      ) {
        return state
      }
      return { ...state, ...next }
    }),
  setCourseId: (courseId, source) =>
    set((state) => {
      if (state.courseId === courseId && state.source === source) {
        return state
      }
      return buildStudyspaceSelection({
        courseId,
        lectureIds: state.lectureIds,
        source,
      })
    }),
  setLectureIds: (lectureIds, source) =>
    set((state) => {
      const nextLectureIds = normalizeLectureIds(lectureIds)
      if (areLectureIdsEqual(state.lectureIds, nextLectureIds) && state.source === source) {
        return state
      }
      return buildStudyspaceSelection({
        courseId: state.courseId,
        lectureIds: nextLectureIds,
        source,
      })
    }),
}))

