export type StudyspaceTab = 'ai-tutor' | 'review'

export type StudyspaceSelection = {
  courseId: string | null
  lectureIds: string[]
  source: StudyspaceTab
  updatedAt: number
}

const SELECTION_KEY_PREFIX = 'studyspace-selection'
const VISITED_KEY_PREFIX = 'studyspace-visited'

const buildSelectionKey = (userId?: string | null) =>
  `${SELECTION_KEY_PREFIX}:${userId ?? 'guest'}`

const buildVisitedKey = (tab: StudyspaceTab, userId?: string | null) =>
  `${VISITED_KEY_PREFIX}:${tab}:${userId ?? 'guest'}`

export const readStudyspaceSelection = (userId?: string | null): StudyspaceSelection | null => {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(buildSelectionKey(userId))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StudyspaceSelection
    if (!parsed || !Array.isArray(parsed.lectureIds)) return null
    return parsed
  } catch {
    return null
  }
}

export const writeStudyspaceSelection = (
  userId: string | null | undefined,
  selection: StudyspaceSelection,
) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(buildSelectionKey(userId), JSON.stringify(selection))
}

export const hasVisitedStudyspaceTab = (tab: StudyspaceTab, userId?: string | null) => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(buildVisitedKey(tab, userId)) === '1'
}

export const markVisitedStudyspaceTab = (tab: StudyspaceTab, userId?: string | null) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(buildVisitedKey(tab, userId), '1')
}

