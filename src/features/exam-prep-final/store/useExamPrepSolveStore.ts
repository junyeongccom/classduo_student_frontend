/**
 * @file useExamPrepSolveStore.ts
 * @description 핵심테스트(core/mid/final) 풀이 화면 좌·우 패널 + 출처 네비 + 챗봇 컨텍스트 store
 * @module features/exam-prep-final/store
 * @dependencies zustand
 *
 * 콘텐츠 학습(useLectureStudyStore) 패턴을 그대로 복제하되:
 *   - testId 단위로 키잉 (testId 변경 시 챗봇 컨텍스트 리셋)
 *   - 중앙은 사이드바+문제 고정이므로 rightTab 없음
 *   - persist 키 분리 ('exam-prep-solve-state')
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LeftPanelTab } from '@/features/lecture-study/types'

export interface ExamPrepQuizChatContext {
  testId: string
  testLabel: string  // "핵심1" | "중간테스트1" | "최종테스트"
  questionId: string
  seq: number
  stem: string
  options: string[]
  /** 정답 인덱스(0~3) 문자열 — 챗봇 LLM 컨텍스트로 전달 (정답 노출 가드는 프롬프트에서) */
  answer: string
  explanation: Record<string, string>
  hint: string | null
  sourceRef: { source_pages?: number[]; source_chunks?: number[] } | null
  sourceLectureId: string | null
  courseTitle: string
}

interface ExamPrepSolveState {
  testId: string | null
  isLeftPanelOpen: boolean
  isChatPanelOpen: boolean
  leftTab: LeftPanelTab
  leftPanelWidth: number | null
  chatPanelWidth: number | null
  /** 출처 클릭 시 강의자료 스크롤 타겟 (1-indexed page 또는 0-indexed 배열 인덱스 — 콘텐츠 학습 호환) */
  targetPage: number | null
  /** 출처 클릭 시 녹음본 청크 이동 타겟 */
  targetChunkIndex: number | null
  totalMaterialPages: number
  totalRecordingChunks: number
  /** 퀴즈→챗봇 질문 컨텍스트 (persist 제외) */
  quizChatContext: ExamPrepQuizChatContext | null
}

interface ExamPrepSolveActions {
  setTestId: (testId: string | null) => void
  toggleLeftPanel: () => void
  toggleChatPanel: () => void
  setLeftTab: (tab: LeftPanelTab) => void
  setLeftPanelWidth: (width: number) => void
  setChatPanelWidth: (width: number) => void
  setTargetPage: (page: number | null) => void
  setTargetChunkIndex: (index: number | null) => void
  setTotalMaterialPages: (count: number) => void
  setTotalRecordingChunks: (count: number) => void
  resetNavigationState: () => void
  setQuizChatContext: (ctx: ExamPrepQuizChatContext) => void
  clearQuizChatContext: () => void
  reset: () => void
}

const initialState: ExamPrepSolveState = {
  testId: null,
  isLeftPanelOpen: false,
  isChatPanelOpen: false,
  leftTab: 'materials',
  leftPanelWidth: null,
  chatPanelWidth: null,
  targetPage: null,
  targetChunkIndex: null,
  totalMaterialPages: 0,
  totalRecordingChunks: 0,
  quizChatContext: null,
}

export const useExamPrepSolveStore = create<ExamPrepSolveState & ExamPrepSolveActions>()(
  persist(
    (set) => ({
      ...initialState,
      setTestId: (testId) =>
        set((s) => (s.testId === testId ? s : { ...s, testId, quizChatContext: null })),
      toggleLeftPanel: () => set((s) => ({ isLeftPanelOpen: !s.isLeftPanelOpen })),
      toggleChatPanel: () => set((s) => ({ isChatPanelOpen: !s.isChatPanelOpen })),
      setLeftTab: (leftTab) => set({ leftTab }),
      setLeftPanelWidth: (leftPanelWidth) => set({ leftPanelWidth }),
      setChatPanelWidth: (chatPanelWidth) => set({ chatPanelWidth }),
      setTargetPage: (targetPage) => set({ targetPage }),
      setTargetChunkIndex: (targetChunkIndex) => set({ targetChunkIndex }),
      setTotalMaterialPages: (totalMaterialPages) => set({ totalMaterialPages }),
      setTotalRecordingChunks: (totalRecordingChunks) => set({ totalRecordingChunks }),
      resetNavigationState: () => set({ targetPage: null, targetChunkIndex: null }),
      setQuizChatContext: (quizChatContext) =>
        set({ quizChatContext, isChatPanelOpen: true }),
      clearQuizChatContext: () => set({ quizChatContext: null }),
      reset: () => set(initialState),
    }),
    {
      name: 'exam-prep-solve-state',
      version: 1,
      partialize: (state) => ({
        testId: state.testId,
        isLeftPanelOpen: state.isLeftPanelOpen,
        isChatPanelOpen: state.isChatPanelOpen,
        leftTab: state.leftTab,
        leftPanelWidth: state.leftPanelWidth,
        chatPanelWidth: state.chatPanelWidth,
        // navigation/quizChatContext 는 의도적으로 persist 제외 (세션 일회성)
      }),
    },
  ),
)
