/**
 * @file useSidebarStore.ts
 * @description 사이드바 열림/닫힘 상태 관리 (NewUI 전용)
 * @module shared/store
 * @dependencies zustand
 */

import { create } from 'zustand'

interface SidebarState {
  isCollapsed: boolean
  toggle: () => void
  setCollapsed: (collapsed: boolean) => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: false,
  toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
}))

/** 사이드바 폭 상수 */
export const SIDEBAR_WIDTH_EXPANDED = 240
export const SIDEBAR_WIDTH_COLLAPSED = 72
