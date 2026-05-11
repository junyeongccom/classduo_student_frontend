/**
 * @file useSidebarStore.ts
 * @description 사이드바 열림/닫힘 상태 관리 (NewUI 전용) + 비-데스크탑 반응형
 * @module shared/store
 * @dependencies zustand
 */

import { useEffect } from 'react'
import { create } from 'zustand'

interface SidebarState {
  isCollapsed: boolean
  /** 비-데스크탑(모바일+태블릿)에서 오버레이 확장 여부 */
  isOverlayOpen: boolean
  /** 현재 뷰포트가 비-데스크탑(<1280px) 범위인지 — 모바일/태블릿 공통 오버레이 패턴 적용 */
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

/** 뷰포트 브레이크포인트 (비-데스크탑 = 0~1279px) */
export const TABLET_MIN = 0
export const DESKTOP_MIN = 1280

/**
 * 비-데스크탑 감지 훅 — 단일 resize listener로 store.isTablet 동기화
 * 모바일과 태블릿 모두 isTablet=true로 묶여 오버레이 사이드바 패턴을 공유.
 * (호환성 유지를 위해 훅·플래그 이름은 isTablet/useTabletDetector를 그대로 둠)
 */
export function useTabletDetector() {
  const setIsTablet = useSidebarStore((s) => s.setIsTablet)

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      setIsTablet(w < DESKTOP_MIN)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [setIsTablet])
}
