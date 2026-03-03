/**
 * @file GameRankingBoard.tsx
 * @description 게임 완료 화면에 표시되는 랭킹 보드 UI 컴포넌트
 * @module features/review
 * @dependencies next-intl
 */
'use client'

import { useTranslations } from 'next-intl'
import type { ScoreRankingEntry, MatchingRankingEntry } from '@/features/review/types'

interface GameRankingBoardProps {
  rankings: (ScoreRankingEntry | MatchingRankingEntry)[]
  myRank: number | null
  /** 현재 사용자 게임 닉네임 (내 행에 표시, 랭킹은 실명 대신 닉네임만 사용) */
  myNickname?: string | null
  /** @deprecated is_mine 플래그로 대체. 하위호환을 위해 유지 */
  currentUserId?: string | null
  isLoading: boolean
  error: string | null
  mode: 'score' | 'time' | 'score_time'
  /** 매칭 게임용: pair_count 탭 */
  pairCountTabs?: number[]
  activePairCount?: number
  onPairCountChange?: (pairCount: number) => void
}

const formatDate = (isoString: string) => {
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const centis = Math.floor((ms % 1000) / 10)
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`
}

/** 랭킹은 닉네임만 표시. 내 행은 myNickname 폴백, 모든 유저 display_name 폴백. */
function displayName(entry: ScoreRankingEntry | MatchingRankingEntry, isMe: boolean, myNickname: string | null | undefined): string {
  if (isMe) {
    return entry.nickname ?? myNickname ?? entry.display_name ?? ''
  }
  return entry.nickname ?? entry.display_name ?? ''
}

export function GameRankingBoard({
  rankings,
  myRank,
  myNickname,
  currentUserId,
  isLoading,
  error,
  mode,
  pairCountTabs,
  activePairCount,
  onPairCountChange,
}: GameRankingBoardProps) {
  const t = useTranslations('review.ui.ranking')

  return (
    <div className="mt-4 w-full max-w-md">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">{t('title')}</h4>
        {myRank != null && (
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-600">
            {t('myRank', { rank: myRank })}
          </span>
        )}
      </div>

      {pairCountTabs && pairCountTabs.length > 0 && (
        <div className="mt-2 flex gap-1">
          {pairCountTabs.map(pc => (
            <button
              key={pc}
              type="button"
              onClick={() => onPairCountChange?.(pc)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                activePairCount === pc
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              {t('pairs', { count: pc })}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {isLoading ? (
          <div className="px-4 py-6 text-center text-xs text-slate-400">
            <div className="mx-auto h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          </div>
        ) : error ? (
          <div className="px-4 py-4 text-center text-xs text-rose-500">{t('loadError')}</div>
        ) : rankings.length === 0 ? (
          <div className="px-4 py-4 text-center text-xs text-slate-400">{t('empty')}</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                <th className="px-3 py-2 text-left font-semibold">{t('rank')}</th>
                <th className="px-3 py-2 text-left font-semibold">{t('nickname')}</th>
                {mode === 'time' ? (
                  <th className="px-3 py-2 text-right font-semibold">{t('time')}</th>
                ) : (
                  <th className="px-3 py-2 text-right font-semibold">{t('score')}</th>
                )}
                {mode === 'score_time' && (
                  <th className="px-3 py-2 text-right font-semibold">{t('time')}</th>
                )}
                <th className="px-3 py-2 text-right font-semibold">{t('achievedAt')}</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map(entry => {
                const isMe = entry.is_mine
                const scoreEntry = entry as ScoreRankingEntry
                return (
                  <tr
                    key={`${entry.rank}`}
                    className={`border-b border-slate-50 ${isMe ? 'bg-indigo-50/60 font-semibold' : ''}`}
                  >
                    <td className="px-3 py-2 text-slate-700">{entry.rank}</td>
                    <td className="max-w-[120px] truncate px-3 py-2 text-slate-700">
                      {displayName(entry, isMe, myNickname ?? null) || t('anonymous')}
                      {isMe && (
                        <span className="ml-1 text-[10px] text-indigo-500">●</span>
                      )}
                    </td>
                    {mode === 'time' ? (
                      <td className="px-3 py-2 text-right text-slate-700">
                        {formatTime((entry as MatchingRankingEntry).elapsed_ms)}
                      </td>
                    ) : (
                      <td className="px-3 py-2 text-right text-slate-700">
                        {scoreEntry.score}
                      </td>
                    )}
                    {mode === 'score_time' && (
                      <td className="px-3 py-2 text-right text-slate-400">
                        {scoreEntry.elapsed_ms != null ? formatTime(scoreEntry.elapsed_ms) : '-'}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right text-slate-400">
                      {formatDate(entry.achieved_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
