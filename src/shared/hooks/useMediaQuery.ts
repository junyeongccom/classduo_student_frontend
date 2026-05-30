/**
 * @file useMediaQuery.ts
 * @description 미디어 쿼리 훅 (모바일 반응형 감지)
 * @module shared/hooks
 * @dependencies 없음
 */

'use client'

import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    setMatches(mql.matches)

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 1279px)')
}

/**
 * 모바일 폭 + 세로 방향일 때 true.
 * 게임을 가로 모드로 강제(90° 회전)하는 데 사용 — 사용자가 폰을 가로로 돌리면 false가 되어 회전이 풀린다.
 */
export function useMobilePortrait(): boolean {
  const isMobileWidth = useMediaQuery('(max-width: 767px)')
  const isPortrait = useMediaQuery('(orientation: portrait)')
  return isMobileWidth && isPortrait
}
