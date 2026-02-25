/**
 * @file useMediaQuery.ts
 * @description 미디어 쿼리 훅 (모바일 반응형 감지)
 * @module features/lecture-study/hooks
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
