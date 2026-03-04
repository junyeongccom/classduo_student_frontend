/**
 * @file GameSelector.tsx
 * @description 아케이드 스타일 게임 선택 로비 UI + 닉네임 변경 버튼
 * @module features/lecture-study/components/ui
 * @dependencies lucide-react
 */

'use client'

import { useTranslations } from 'next-intl'
import { Gamepad2, UserCircle } from 'lucide-react'
import type { GameInfo } from '../../types'

const GAME_LIST: GameInfo[] = [
  { id: 'running', name: '', description: '', minWords: 3, icon: '🏃' },
  { id: 'deck', name: '', description: '', minWords: 1, icon: '🃏' },
  { id: 'cardMatch', name: '', description: '', minWords: 6, icon: '🎴' },
  { id: 'definitionBuilder', name: '', description: '', minWords: 1, icon: '🧩' },
]

/** 게임별 네온 테마 */
const NEON_THEMES = [
  {
    border: 'border-orange-500/60',
    hoverBorder: 'hover:border-orange-400',
    glow: 'hover:shadow-[0_0_20px_rgba(255,107,53,0.4)]',
    iconBg: 'bg-orange-500/20',
    accent: 'text-orange-400',
    playBg: 'bg-orange-500/20 group-hover:bg-orange-500/40',
    playText: 'text-orange-300 group-hover:text-orange-200',
  },
  {
    border: 'border-cyan-500/60',
    hoverBorder: 'hover:border-cyan-400',
    glow: 'hover:shadow-[0_0_20px_rgba(0,212,255,0.4)]',
    iconBg: 'bg-cyan-500/20',
    accent: 'text-cyan-400',
    playBg: 'bg-cyan-500/20 group-hover:bg-cyan-500/40',
    playText: 'text-cyan-300 group-hover:text-cyan-200',
  },
  {
    border: 'border-violet-500/60',
    hoverBorder: 'hover:border-violet-400',
    glow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]',
    iconBg: 'bg-violet-500/20',
    accent: 'text-violet-400',
    playBg: 'bg-violet-500/20 group-hover:bg-violet-500/40',
    playText: 'text-violet-300 group-hover:text-violet-200',
  },
  {
    border: 'border-emerald-500/60',
    hoverBorder: 'hover:border-emerald-400',
    glow: 'hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]',
    iconBg: 'bg-emerald-500/20',
    accent: 'text-emerald-400',
    playBg: 'bg-emerald-500/20 group-hover:bg-emerald-500/40',
    playText: 'text-emerald-300 group-hover:text-emerald-200',
  },
]

interface GameSelectorProps {
  onSelectGame: (gameId: string) => void
  nickname?: string | null
  onChangeNickname?: () => void
}

export function GameSelector({ onSelectGame, nickname, onChangeNickname }: GameSelectorProps) {
  const t = useTranslations()

  const gameNames: Record<string, string> = {
    running: t('lectureStudy.game.running'),
    deck: t('lectureStudy.game.deck'),
    cardMatch: t('lectureStudy.game.cardMatch'),
    definitionBuilder: t('lectureStudy.game.definitionBuilder'),
  }

  return (
    <div className="relative h-full overflow-y-auto bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6">
      {/* 미세한 그리드 패턴 오버레이 */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* 헤더 */}
      <div className="relative mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Gamepad2 className="h-5 w-5 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]" />
          <h3
            className="text-lg font-extrabold tracking-wider text-yellow-400"
            style={{ textShadow: '0 0 12px rgba(250,204,21,0.5), 0 0 24px rgba(250,204,21,0.2)' }}
          >
            GAME ARCADE
          </h3>
        </div>
        {nickname && (
          <button
            type="button"
            onClick={onChangeNickname}
            className="flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-yellow-500/60 hover:text-yellow-400 hover:shadow-[0_0_8px_rgba(250,204,21,0.2)]"
          >
            <UserCircle className="h-3.5 w-3.5" />
            <span className="max-w-[100px] truncate">{nickname}</span>
          </button>
        )}
      </div>

      {/* 구분선 — 네온 글로우 */}
      <div className="relative mb-6 h-px bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent">
        <div className="absolute inset-0 blur-sm bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
      </div>

      {/* 게임 카드 그리드 */}
      <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
        {GAME_LIST.map((game, i) => {
          const theme = NEON_THEMES[i]
          return (
            <button
              key={game.id}
              onClick={() => onSelectGame(game.id)}
              className={`group flex flex-col items-center gap-3 rounded-2xl border bg-slate-800/60 p-5 text-center transition-all duration-300 hover:-translate-y-1 ${theme.border} ${theme.hoverBorder} ${theme.glow}`}
            >
              {/* 아이콘 */}
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-xl text-3xl ${theme.iconBg} transition-transform duration-300 group-hover:scale-110`}
              >
                {game.icon}
              </div>

              {/* 게임명 */}
              <h4 className={`text-sm font-bold tracking-wide ${theme.accent}`}>
                {gameNames[game.id]}
              </h4>

              {/* PLAY 버튼 영역 */}
              <div
                className={`w-full rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-all duration-300 ${theme.playBg} ${theme.playText}`}
              >
                PLAY
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { GAME_LIST }
