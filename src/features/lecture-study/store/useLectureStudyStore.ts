/**
 * @file useLectureStudyStore.ts
 * @description 회차별 학습 상태 저장소 (courseId → lectureId → 탭/패널 상태 + 네비게이션)
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

export interface QuizChatChoice {
  choice_order: number
  choice_text: string
  is_correct: boolean
  choice_explanation: string | null
}

export interface QuizChatContext {
  quizId: string
  quizIndex: number
  courseTitle: string
  weekNumber: number
  sessionNumber: number
  question: string
  explanation: string | null
  choices: QuizChatChoice[]
  source: { source_pages?: number[]; source_chunks?: number[] }
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
  /** 출처 클릭 시 강의자료 스크롤 타겟 (0-indexed 배열 인덱스) */
  targetPage: number | null
  /** 출처 클릭 시 녹음본 청크 이동 타겟 (합산 인덱스, 0-indexed) */
  targetChunkIndex: number | null
  /** 성공적으로 로딩된 material 전체 페이지 수 (출처 범위 검증용) */
  totalMaterialPages: number
  /** 녹음본 전체 청크 수 (출처 범위 검증용) */
  totalRecordingChunks: number
  /** 퀴즈→챗봇 질문 컨텍스트 (persist 제외) */
  quizChatContext: QuizChatContext | null
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
  setTargetPage: (page: number | null) => void
  setTargetChunkIndex: (index: number | null) => void
  setTotalMaterialPages: (count: number) => void
  setTotalRecordingChunks: (count: number) => void
  resetNavigationState: () => void
  setQuizChatContext: (ctx: QuizChatContext) => void
  clearQuizChatContext: () => void
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
  targetPage: null,
  targetChunkIndex: null,
  totalMaterialPages: 0,
  totalRecordingChunks: 0,
  quizChatContext: null,
}

export const useLectureStudyStore = create<LectureStudyState & LectureStudyActions>()(
  persist(
    (set) => ({
      ...initialState,
      setCourseId: (courseId) => set({ courseId }),
      setLectureId: (lectureId) => set({ lectureId, quizChatContext: null }),
      toggleLeftPanel: () => set((s) => ({ isLeftPanelOpen: !s.isLeftPanelOpen })),
      toggleChatPanel: () => set((s) => ({ isChatPanelOpen: !s.isChatPanelOpen })),
      setLeftTab: (leftTab) => set({ leftTab }),
      setRightTab: (rightTab) => set({ rightTab }),
      setLeftPanelWidth: (leftPanelWidth) => set({ leftPanelWidth }),
      setChatPanelWidth: (chatPanelWidth) => set({ chatPanelWidth }),
      setGameWords: (gameWords) => set({ gameWords }),
      setTargetPage: (targetPage) => set({ targetPage }),
      setTargetChunkIndex: (targetChunkIndex) => set({ targetChunkIndex }),
      setTotalMaterialPages: (totalMaterialPages) => set({ totalMaterialPages }),
      setTotalRecordingChunks: (totalRecordingChunks) => set({ totalRecordingChunks }),
      resetNavigationState: () => set({ targetPage: null, targetChunkIndex: null }),
      setQuizChatContext: (quizChatContext) => set({ quizChatContext, isChatPanelOpen: true }),
      clearQuizChatContext: () => set({ quizChatContext: null }),
      reset: () => set(initialState),
    }),
    {
      name: 'lecture-study-state',
      version: 7,
      partialize: (state) => ({
        courseId: state.courseId,
        lectureId: state.lectureId,
        isLeftPanelOpen: state.isLeftPanelOpen,
        isChatPanelOpen: state.isChatPanelOpen,
        leftTab: state.leftTab,
        rightTab: state.rightTab,
        leftPanelWidth: state.leftPanelWidth,
        chatPanelWidth: state.chatPanelWidth,
        gameWords: state.gameWords,
        targetPage: state.targetPage,
        targetChunkIndex: state.targetChunkIndex,
        totalMaterialPages: state.totalMaterialPages,
        totalRecordingChunks: state.totalRecordingChunks,
        // quizChatContext는 의도적으로 제외 (세션 간 유지 불필요)
      }),
      migrate: (persisted, version) => {
        if (version < 5) {
          const old = persisted as Record<string, unknown>
          const { leftTab: _leftTab, targetPage: _tp, targetChunkIndex: _tc, ...rest } = old
          return {
            ...initialState,
            ...rest,
            isLeftPanelOpen: false,
            isChatPanelOpen: false,
            chatPanelWidth: null,
            targetPage: null,
            targetChunkIndex: null,
            totalMaterialPages: 0,
            totalRecordingChunks: 0,
          }
        }
        if (version < 6) {
          return {
            ...(persisted as Record<string, unknown>),
            totalMaterialPages: 0,
            totalRecordingChunks: 0,
          }
        }
        return persisted as LectureStudyState & LectureStudyActions
      },
    },
  ),
)
