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

/**
 * 회차별 학습 레이아웃 모드 (태블릿 가로/세로 대응).
 * - stacked: 강의자료/챗봇을 하단 바텀시트로 상하 스택 — 폰 + 태블릿 세로(portrait)
 * - !stacked(split): 좌우 컬럼 분할 — 태블릿 가로(landscape) + 데스크톱
 * - twoColumnMax: 분할이되 최대 2단(중앙 + 강의자료/챗봇 중 1개만) — 태블릿급 폭(≤1366px).
 *   넓은 데스크톱(≥1367)은 기존처럼 3단(강의자료+중앙+챗봇) 허용.
 * 첫 페인트 기본값은 split(데스크톱)으로 두어 SSR/하이드레이션 깜빡임을 기존 동작과 일치시킴.
 */
export function useLectureLayoutMode(): { stacked: boolean; twoColumnMax: boolean } {
  // 폰(≤1023) 또는 태블릿 세로(세로 && ≤1279) → 상하 스택
  const stacked = useMediaQuery('(max-width: 1023px), (orientation: portrait) and (max-width: 1279px)')
  // 태블릿급 폭(≤1366)에서는 좌우 분할이어도 최대 2단
  const tabletWidth = useMediaQuery('(max-width: 1366px)')
  return { stacked, twoColumnMax: !stacked && tabletWidth }
}
