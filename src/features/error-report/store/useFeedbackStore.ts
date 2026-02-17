/**
 * @file useFeedbackStore.ts
 * @description 피드백 모달 열기/닫기 상태 관리 스토어
 * @module features/error-report/store
 * @dependencies zustand
 */

import { create } from 'zustand'

interface FeedbackStore {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useFeedbackStore = create<FeedbackStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
