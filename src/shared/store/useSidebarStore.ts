/**
 * @file useSidebarStore.ts
 * @description 사이드바 열림/닫힘 상태 관리 (NewUI 전용) + 태블릿 반응형
 * @module shared/store
 * @dependencies zustand
 */

import { useEffect } from 'react'
import { create } from 'zustand'

interface SidebarState {
  isCollapsed: boolean
  /** 태블릿(768~1279px)에서 오버레이 확장 여부 */
  isOverlayOpen: boolean
  /** 현재 뷰포트가 태블릿 범위인지 */
  isTablet: boolean
  toggle: () => void
  setCollapsed: (collapsed: boolean) => void
  openOverlay: () => void
  closeOverlay: () => void
  setIsTablet: (tablet: boolean) => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: false,
  isOverlayOpen: false,
  isTablet: false,
  toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
  openOverlay: () => set({ isOverlayOpen: true }),
  closeOverlay: () => set({ isOverlayOpen: false }),
  setIsTablet: (tablet) => set({ isTablet: tablet }),
}))

/** 사이드바 폭 상수 */
export const SIDEBAR_WIDTH_EXPANDED = 240
export const SIDEBAR_WIDTH_COLLAPSED = 72

/** 태블릿 브레이크포인트 */
export const TABLET_MIN = 768
export const DESKTOP_MIN = 1280

/**
 * 태블릿 감지 훅 — 단일 resize listener로 store.isTablet 동기화
 * 앱 루트 근처에서 1회만 호출하면 됨 (Sidebar에서 호출)
 */
export function useTabletDetector() {
  const setIsTablet = useSidebarStore((s) => s.setIsTablet)

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      setIsTablet(w >= TABLET_MIN && w < DESKTOP_MIN)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [setIsTablet])
}
