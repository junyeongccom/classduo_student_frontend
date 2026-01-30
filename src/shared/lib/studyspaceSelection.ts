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

export const getStudyspaceSelectionStorageKey = (userId?: string | null) =>
  buildSelectionKey(userId)

export const normalizeLectureIds = (lectureIds: string[]) => {
  const unique = new Set<string>()
  lectureIds.forEach((id) => {
    if (id) unique.add(id)
  })
  return Array.from(unique)
}

export const areLectureIdsEqual = (a: string[], b: string[]) => {
  if (a === b) return true
  if (a.length !== b.length) return false
  const setA = new Set(a)
  for (const id of b) {
    if (!setA.has(id)) return false
  }
  return true
}

export const buildStudyspaceSelection = (
  input: Omit<StudyspaceSelection, 'updatedAt'> & { updatedAt?: number },
): StudyspaceSelection => ({
  courseId: input.courseId ?? null,
  lectureIds: normalizeLectureIds(input.lectureIds ?? []),
  source: input.source,
  updatedAt: input.updatedAt ?? Date.now(),
})

type LectureSummary = {
  lecture_id: string
  lecture_date?: string | null
}

export const pickLatestLectureId = (
  lectureIds: string[],
  lectures: LectureSummary[],
) => {
  if (lectureIds.length === 0) return null
  if (lectureIds.length === 1) return lectureIds[0]

  const candidates = lectures.filter((lecture) =>
    lectureIds.includes(lecture.lecture_id),
  )
  if (candidates.length === 0) {
    return lectureIds[0]
  }

  const sorted = [...candidates].sort((a, b) => {
    const timeA = a.lecture_date ? new Date(a.lecture_date).getTime() : 0
    const timeB = b.lecture_date ? new Date(b.lecture_date).getTime() : 0
    return timeB - timeA
  })
  return sorted[0]?.lecture_id ?? lectureIds[0] ?? null
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



