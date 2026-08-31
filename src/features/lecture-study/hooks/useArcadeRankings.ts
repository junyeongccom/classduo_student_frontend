/**
 * @file useArcadeRankings.ts
 * @description 게임 아케이드 상시 랭킹 — 러닝/카드매칭/정의조립 top3 + 내 순위 병렬 조회
 * @module features/lecture-study/hooks
 * @dependencies review(reviewService), ai-tutor(gameScoreService)
 */
'use client'

import { useCallback, useEffect, useState } from 'react'
import { reviewService } from '@/features/review/services/reviewService'

export interface ArcadeRankRow {
  rank: number
  name: string
  /** 점수(러닝·조립) 또는 기록 초(카드매칭) 표시용 문자열 */
  value: string
  isMine: boolean
}

export interface ArcadeRanking {
  top: ArcadeRankRow[]
  myRank: number | null
  myValue: string | null
}

const EMPTY: ArcadeRanking = { top: [], myRank: null, myValue: null }

function fmtElapsed(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`
}

export function useArcadeRankings(lectureId: string) {
  const [rankings, setRankings] = useState<Record<'running' | 'cardMatch' | 'definitionBuilder', ArcadeRanking>>({
    running: EMPTY, cardMatch: EMPTY, definitionBuilder: EMPTY,
  })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { gameScoreService } = await import('@/features/ai-tutor/services/gameScoreService')
      const [run, match, def] = await Promise.all([
        gameScoreService.getRankings(lectureId, 3).catch(() => ({ data: null })),
        reviewService.getMatchingGameRankings(lectureId, 6, 3).catch(() => ({ data: null })),
        reviewService.getDefinitionBuilderRankings(lectureId, 3).catch(() => ({ data: null })),
      ])
      setRankings({
        running: run.data ? {
          top: run.data.rankings.slice(0, 3).map(r => ({
            rank: r.rank,
            name: (r as { nickname?: string | null; display_name?: string | null }).nickname
              ?? (r as { display_name?: string | null }).display_name ?? '—',
            value: `${(r as { score: number }).score}`,
            isMine: (r as { is_mine?: boolean }).is_mine ?? false,
          })),
          myRank: run.data.my_best?.rank ?? null,
          myValue: run.data.my_best ? `${run.data.my_best.score}` : null,
        } : EMPTY,
        cardMatch: match.data ? {
          top: match.data.rankings.slice(0, 3).map(r => ({
            rank: r.rank,
            name: r.nickname ?? r.display_name ?? '—',
            value: fmtElapsed(r.elapsed_ms),
            isMine: r.is_mine,
          })),
          myRank: match.data.my_best?.rank ?? null,
          myValue: match.data.my_best ? fmtElapsed(match.data.my_best.elapsed_ms) : null,
        } : EMPTY,
        definitionBuilder: def.data ? {
          top: def.data.rankings.slice(0, 3).map(r => ({
            rank: r.rank,
            name: r.nickname ?? r.display_name ?? '—',
            value: `${r.score}`,
            isMine: r.is_mine,
          })),
          myRank: def.data.my_best?.rank ?? null,
          myValue: def.data.my_best ? `${def.data.my_best.score}` : null,
        } : EMPTY,
      })
    } finally {
      setLoading(false)
    }
  }, [lectureId])

  useEffect(() => { void load() }, [load])

  return { rankings, loading, reload: load }
}
