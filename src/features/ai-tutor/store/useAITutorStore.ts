import { create } from 'zustand'
import { TabType } from '@/shared/components/common'
import { Reference, HookingResponse, PQMQuestion } from '@/features/ai-tutor/types'
import type { AppLocale } from '@/shared/i18n/I18nProvider'

export interface AITutorCourse {
  course_id: string
  title: string
  term: string
  lectures: Array<{
    lecture_id: string
    course_id: string
    lecture_no: number
    lecture_date: string
    status: string
    is_available?: boolean
  }>
}

// Message type definition (local to store or imported if defined elsewhere)
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  summary_keywords?: string | null
}

interface GameTriggerPosition {
  top: number
  left: number
  width: number
  height: number
}

interface GameState {
  isOpen: boolean
  triggerPosition: GameTriggerPosition | null
  lectureId: string | undefined
  courseId: string | undefined
  lectureNo: number | undefined
  courseName: string | undefined
}

interface AITutorState {
  // Session
  currentSessionId: string | undefined
  isSessionLocked: boolean
  
  // Lecture Selection
  selectedLectureIds: string[]
  selectedCourseId: string | null
  autoSelectLatest: boolean
  
  // Chat & UI
  activeTab: TabType
  isNotesPanelOpen: boolean
  isMaterialsPanelOpen: boolean
  isChatSidebarOpen: boolean
  notesPanelWidth: number
  materialsPanelWidth: number
  chatKey: number
  messages: ChatMessage[]
  allReferences: Map<number, Reference[]>

  // Locale caches
  coursesByLocale: Partial<Record<AppLocale, AITutorCourse[]>>
  hookingByLocale: Partial<Record<AppLocale, Record<string, HookingResponse | null>>>
  pqmByLocale: Partial<Record<AppLocale, Record<string, PQMQuestion[]>>>
  
  // Game
  game: GameState
}

interface AITutorActions {
  // Session Actions
  setCurrentSessionId: (sessionId: string | undefined) => void
  setIsSessionLocked: (isLocked: boolean) => void
  
  // Lecture Selection Actions
  setSelectedLectureIds: (lectureIds: string[]) => void
  setSelectedCourseId: (courseId: string | null) => void
  setAutoSelectLatest: (autoSelect: boolean) => void
  
  // Chat & UI Actions
  setActiveTab: (tab: TabType) => void
  setNotesPanelOpen: (isOpen: boolean) => void
  setMaterialsPanelOpen: (isOpen: boolean) => void
  setNotesPanelWidth: (width: number) => void
  setMaterialsPanelWidth: (width: number) => void
  toggleNotesPanel: (isOpen?: boolean) => void
  toggleMaterialsPanel: (isOpen?: boolean) => void
  setIsChatSidebarOpen: (isOpen: boolean) => void
  incrementChatKey: () => void
  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void
  setAllReferences: (references: Map<number, Reference[]> | ((prev: Map<number, Reference[]>) => Map<number, Reference[]>)) => void
  updateReferences: (messageIndex: number, newRefs: Reference[]) => void
  resetChat: () => void

  // Locale cache actions
  setCoursesCache: (locale: AppLocale, courses: AITutorCourse[]) => void
  setHookingCache: (locale: AppLocale, lectureId: string, data: HookingResponse | null) => void
  setPqmCache: (locale: AppLocale, lectureId: string, data: PQMQuestion[]) => void
  
  // Game Actions
  openGame: (
    lectureId: string, 
    courseId: string, 
    lectureNo: number, 
    courseName: string, 
    position: GameTriggerPosition
  ) => void
  closeGame: () => void
  setGameTriggerPosition: (position: GameTriggerPosition | null) => void
}

export const useAITutorStore = create<AITutorState & AITutorActions>((set) => ({
  // Initial State
  currentSessionId: undefined,
  isSessionLocked: false,
  selectedLectureIds: [],
  selectedCourseId: null,
  autoSelectLatest: false,
  activeTab: 'answer',
  isNotesPanelOpen: false,
  isMaterialsPanelOpen: false,
  notesPanelWidth: 380,
  materialsPanelWidth: 360,
  isChatSidebarOpen: false,
  chatKey: 0,
  messages: [],
  allReferences: new Map(),
  coursesByLocale: {},
  hookingByLocale: {},
  pqmByLocale: {},
  game: {
    isOpen: false,
    triggerPosition: null,
    lectureId: undefined,
    courseId: undefined,
    lectureNo: undefined,
    courseName: undefined,
  },

  // Actions
  setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),
  setIsSessionLocked: (isLocked) => set({ isSessionLocked: isLocked }),
  
  setSelectedLectureIds: (lectureIds) => set({ selectedLectureIds: lectureIds }),
  setSelectedCourseId: (courseId) => set({ selectedCourseId: courseId }),
  setAutoSelectLatest: (autoSelect) => set({ autoSelectLatest: autoSelect }),
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  setNotesPanelOpen: (isOpen) => set({ isNotesPanelOpen: isOpen }),
  setMaterialsPanelOpen: (isOpen) => set({ isMaterialsPanelOpen: isOpen }),
  setNotesPanelWidth: (width) => set({ notesPanelWidth: width }),
  setMaterialsPanelWidth: (width) => set({ materialsPanelWidth: width }),
  toggleNotesPanel: (isOpen) => set((state) => ({
    isNotesPanelOpen: typeof isOpen === 'boolean' ? isOpen : !state.isNotesPanelOpen,
    isMaterialsPanelOpen: typeof isOpen === 'boolean' && isOpen ? state.isMaterialsPanelOpen : state.isMaterialsPanelOpen,
  })),
  toggleMaterialsPanel: (isOpen) => set((state) => ({
    isMaterialsPanelOpen: typeof isOpen === 'boolean' ? isOpen : !state.isMaterialsPanelOpen,
    isNotesPanelOpen: typeof isOpen === 'boolean' && isOpen ? state.isNotesPanelOpen : state.isNotesPanelOpen,
  })),
  setIsChatSidebarOpen: (isOpen) => set({ isChatSidebarOpen: isOpen }),
  incrementChatKey: () => set((state) => ({ chatKey: state.chatKey + 1 })),
  
  setMessages: (messagesOrUpdater) => set((state) => {
    const newMessages = typeof messagesOrUpdater === 'function' 
      ? messagesOrUpdater(state.messages) 
      : messagesOrUpdater
    return { messages: newMessages }
  }),
  
  setAllReferences: (refsOrUpdater) => set((state) => {
    const newRefs = typeof refsOrUpdater === 'function'
      ? refsOrUpdater(state.allReferences)
      : refsOrUpdater
    return { allReferences: newRefs }
  }),
  
  updateReferences: (messageIndex, newRefs) => set((state) => {
    const updated = new Map(state.allReferences)
    updated.set(messageIndex, newRefs)
    return { allReferences: updated }
  }),
  
  resetChat: () => set((state) => ({
    currentSessionId: undefined,
    isSessionLocked: false,
    chatKey: state.chatKey + 1,
    messages: [],
    allReferences: new Map(),
    activeTab: 'answer',
  })),

  setCoursesCache: (locale, courses) => set((state) => ({
    coursesByLocale: {
      ...state.coursesByLocale,
      [locale]: courses,
    },
  })),

  setHookingCache: (locale, lectureId, data) => set((state) => ({
    hookingByLocale: {
      ...state.hookingByLocale,
      [locale]: {
        ...(state.hookingByLocale[locale] || {}),
        [lectureId]: data,
      },
    },
  })),

  setPqmCache: (locale, lectureId, data) => set((state) => ({
    pqmByLocale: {
      ...state.pqmByLocale,
      [locale]: {
        ...(state.pqmByLocale[locale] || {}),
        [lectureId]: data,
      },
    },
  })),
  
  openGame: (lectureId, courseId, lectureNo, courseName, position) => set({
    game: {
      isOpen: true,
      triggerPosition: position,
      lectureId,
      courseId,
      lectureNo,
      courseName,
    }
  }),
  
  closeGame: () => set((state) => ({
    game: {
      ...state.game,
      isOpen: false,
    }
  })),
  
  setGameTriggerPosition: (position) => set((state) => ({
    game: {
      ...state.game,
      triggerPosition: position,
    }
  })),
}))

