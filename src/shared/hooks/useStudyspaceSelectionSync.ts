import { useEffect } from 'react'
import {
  getStudyspaceSelectionStorageKey,
  readStudyspaceSelection,
  writeStudyspaceSelection,
} from '@/shared/lib/studyspaceSelection'
import { useStudyspaceSelectionStore } from '@/shared/store/useStudyspaceSelectionStore'

export function useStudyspaceSelectionSync(userId?: string | null) {
  const {
    courseId,
    lectureIds,
    source,
    updatedAt,
    isHydrated,
    hydrateSelection,
  } = useStudyspaceSelectionStore(state => ({
    courseId: state.courseId,
    lectureIds: state.lectureIds,
    source: state.source,
    updatedAt: state.updatedAt,
    isHydrated: state.isHydrated,
    hydrateSelection: state.hydrateSelection,
  }))

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = readStudyspaceSelection(userId)
    hydrateSelection(saved, { force: true })
  }, [userId, hydrateSelection])

  useEffect(() => {
    if (!isHydrated) return
    writeStudyspaceSelection(userId, {
      courseId,
      lectureIds,
      source,
      updatedAt,
    })
  }, [isHydrated, courseId, lectureIds, source, updatedAt, userId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const key = getStudyspaceSelectionStorageKey(userId)
    const handler = (event: StorageEvent) => {
      if (event.key !== key) return
      const saved = readStudyspaceSelection(userId)
      hydrateSelection(saved)
    }
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('storage', handler)
    }
  }, [userId, hydrateSelection])
}

