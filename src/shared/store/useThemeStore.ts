/**
 * @file useThemeStore.ts
 * @description 다크모드 테마 상태 관리 (localStorage 영속 + <html> class 동기화)
 * @module shared/store
 * @dependencies zustand
 */

import { create } from 'zustand'

const THEME_KEY = 'classduo_theme'

type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  toggle: () => void
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return (localStorage.getItem(THEME_KEY) as Theme) || 'light'
}

export const useThemeStore = create<ThemeState>((set, get) => {
  // 초기 테마 적용
  const initial = getStoredTheme()
  if (typeof window !== 'undefined') {
    applyTheme(initial)
  }

  return {
    theme: initial,
    toggle: () => {
      const next = get().theme === 'light' ? 'dark' : 'light'
      localStorage.setItem(THEME_KEY, next)
      applyTheme(next)
      set({ theme: next })
    },
  }
})
