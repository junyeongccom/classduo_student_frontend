/**
 * @file GameArcadeRows.tsx
 * @description 게임 아케이드 — 게임별 1행(시작 버튼 + 상시 랭킹 top3·내 순위)으로 경쟁심 자극하는 로비
 * @module features/lecture-study/components/ui
 * @dependencies useArcadeRankings, lucide-react
 */
'use client'

import { useTranslations } from 'next-intl'
import { Gamepad2, Play, UserCircle, Trophy } from 'lucide-react'
import { useArcadeRankings, type ArcadeRanking } from '../../hooks/useArcadeRankings'

interface ArcadeGame {
  id: 'running' | 'cardMatch' | 'definitionBuilder' | 'deck'
  icon: string
  /** PLAY 버튼 그라데이션 (게이미피케이션 톤) */
  gradient: string
  glow: string
  ring: string
}

const ARCADE_GAMES: ArcadeGame[] = [
  { id: 'running', icon: '🏃', gradient: 'from-orange-400 via-orange-500 to-rose-500', glow: 'shadow-orange-300/60', ring: 'ring-orange-200' },
  { id: 'cardMatch', icon: '🎴', gradient: 'from-violet-400 via-violet-500 to-purple-600', glow: 'shadow-violet-300/60', ring: 'ring-violet-200' },
  { id: 'definitionBuilder', icon: '🧩', gradient: 'from-emerald-400 via-emerald-500 to-teal-600', glow: 'shadow-emerald-300/60', ring: 'ring-emerald-200' },
  { id: 'deck', icon: '🃏', gradient: 'from-sky-400 via-sky-500 to-blue-600', glow: 'shadow-sky-300/60', ring: 'ring-sky-200' },
]

const MEDALS = ['🥇', '🥈', '🥉']

interface GameArcadeRowsProps {
  lectureId: string
  onSelectGame: (gameId: string) => void
  nickname?: string | null
  onChangeNickname?: () => void
}

export function GameArcadeRows({ lectureId, onSelectGame, nickname, onChangeNickname }: GameArcadeRowsProps) {
  const t = useTranslations()
  const ta = useTranslations('arcade')
  const { rankings, loading } = useArcadeRankings(lectureId)

  const gameNames: Record<string, string> = {
    running: t('lectureStudy.game.running'),
    deck: t('lectureStudy.game.deck'),
    cardMatch: t('lectureStudy.game.cardMatch'),
    definitionBuilder: t('lectureStudy.game.definitionBuilder'),
  }

  const renderRanking = (r: ArcadeRanking) => {
    if (loading) {
      return <div className="h-[72px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
    }
    if (r.top.length === 0) {
      return (
        <p className="flex h-full items-center justify-center text-xs font-medium text-gray-400">
          {ta('noRecord')}
        </p>
      )
    }
    return (
      <div className="flex h-full flex-col justify-center gap-1">
        {r.top.map((row, i) => (
          <div
            key={row.rank}
            className={`flex items-center justify-between gap-2 rounded-md px-2 py-0.5 text-xs ${
              row.isMine ? 'bg-[#6366F1]/10 font-bold text-[#6366F1]' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="w-5 shrink-0 text-sm">{MEDALS[i] ?? `${row.rank}`}</span>
              <span className="truncate font-semibold">{row.name}</span>
            </span>
            <span className="shrink-0 tabular-nums font-semibold">{row.value}</span>
          </div>
        ))}
        <div className="mt-0.5 flex items-center justify-between gap-2 border-t border-dashed border-gray-200 px-2 pt-1 text-xs dark:border-gray-700">
          <span className="font-bold text-gray-500 dark:text-gray-400">{ta('myRank')}</span>
          <span className="tabular-nums font-bold text-[#6366F1]">
            {r.myRank != null ? `${r.myRank}${ta('rankUnit')} · ${r.myValue}` : '—'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full overflow-y-auto bg-white p-6 dark:bg-gray-950">
      {/* 헤더 */}
      <div className="relative mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-wide text-gray-900 dark:text-gray-50">
          <Gamepad2 className="h-5 w-5 text-[#6366F1]" />
          GAME ARCADE
        </h2>
        {onChangeNickname && (
          <button
            type="button"
            onClick={onChangeNickname}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <UserCircle className="h-4 w-4" />
            {t('lectureStudy.game.nicknameLabel')} <span className="font-bold text-gray-900 dark:text-gray-100">{nickname ?? '—'}</span>
          </button>
        )}
      </div>

      {/* 게임 4행 — [게임+PLAY | 랭킹] */}
      <div className="flex flex-col gap-3">
        {ARCADE_GAMES.map(game => (
          <div
            key={game.id}
            className={`grid grid-cols-1 gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`}
          >
            {/* 좌: 게임 정보 + PLAY */}
            <div className="flex items-center gap-4 pl-1">
              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-3xl ring-1 dark:bg-gray-800 ${game.ring}`}>
                {game.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-gray-900 dark:text-gray-50">{gameNames[game.id]}</p>
                {game.id === 'deck' && (
                  <p className="truncate text-xs text-gray-400">{ta('soloGame')}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onSelectGame(game.id)}
                className={`btn-game-play group relative shrink-0 overflow-hidden rounded-xl bg-gradient-to-br px-6 py-3 text-sm font-extrabold tracking-widest text-white shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-95 ${game.gradient} ${game.glow}`}
              >
                <span className="relative z-10 flex items-center gap-1.5">
                  <Play className="h-4 w-4 fill-current" />
                  PLAY
                </span>
              </button>
            </div>

            {/* 우: 상시 랭킹 (deck 은 랭킹 없음) */}
            <div className="min-h-[84px] rounded-xl bg-gray-50/70 px-2 py-1.5 dark:bg-gray-800/50">
              {game.id === 'deck' ? (
                <p className="flex h-full items-center justify-center gap-1.5 text-xs font-medium text-gray-400">
                  <Trophy className="h-3.5 w-3.5" />
                  {ta('soloGame')}
                </p>
              ) : (
                renderRanking(rankings[game.id])
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
