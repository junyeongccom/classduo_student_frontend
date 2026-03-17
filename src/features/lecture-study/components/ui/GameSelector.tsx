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

/** 게임별 테마 (밝은 배경용) */
const CARD_THEMES = [
  {
    border: 'border-orange-200',
    hoverBorder: 'hover:border-orange-400',
    glow: 'hover:shadow-lg hover:shadow-orange-100',
    iconBg: 'bg-orange-50',
    accent: 'text-orange-600',
    playBg: 'bg-orange-500 group-hover:bg-orange-600',
    playText: 'text-white',
  },
  {
    border: 'border-sky-200',
    hoverBorder: 'hover:border-sky-400',
    glow: 'hover:shadow-lg hover:shadow-sky-100',
    iconBg: 'bg-sky-50',
    accent: 'text-sky-600',
    playBg: 'bg-sky-500 group-hover:bg-sky-600',
    playText: 'text-white',
  },
  {
    border: 'border-violet-200',
    hoverBorder: 'hover:border-violet-400',
    glow: 'hover:shadow-lg hover:shadow-violet-100',
    iconBg: 'bg-violet-50',
    accent: 'text-violet-600',
    playBg: 'bg-violet-500 group-hover:bg-violet-600',
    playText: 'text-white',
  },
  {
    border: 'border-emerald-200',
    hoverBorder: 'hover:border-emerald-400',
    glow: 'hover:shadow-lg hover:shadow-emerald-100',
    iconBg: 'bg-emerald-50',
    accent: 'text-emerald-600',
    playBg: 'bg-emerald-500 group-hover:bg-emerald-600',
    playText: 'text-white',
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
    <div className="relative h-full overflow-y-auto bg-white p-6">
      {/* 헤더 */}
      <div className="relative mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Gamepad2 className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-extrabold tracking-wide text-gray-800">
            GAME ARCADE
          </h3>
        </div>
        {nickname && (
          <button
            type="button"
            onClick={onChangeNickname}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition-all hover:border-orange-300 hover:text-orange-600"
          >
            <UserCircle className="h-3.5 w-3.5" />
            <span className="max-w-[100px] truncate">{nickname}</span>
          </button>
        )}
      </div>

      {/* 구분선 */}
      <div className="mb-5 h-px bg-gray-100" />

      {/* 게임 카드 그리드 */}
      <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_LIST.map((game, i) => {
          const theme = CARD_THEMES[i]
          return (
            <button
              key={game.id}
              onClick={() => onSelectGame(game.id)}
              className={`group flex flex-col items-center gap-3 rounded-2xl border bg-white p-5 text-center transition-all duration-200 hover:-translate-y-1 ${theme.border} ${theme.hoverBorder} ${theme.glow}`}
            >
              {/* 아이콘 */}
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-xl text-3xl ${theme.iconBg} transition-transform duration-200 group-hover:scale-110`}
              >
                {game.icon}
              </div>

              {/* 게임명 */}
              <h4 className={`text-sm font-bold tracking-wide ${theme.accent}`}>
                {gameNames[game.id]}
              </h4>

              {/* PLAY 버튼 영역 */}
              <div
                className={`w-full rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-all duration-200 ${theme.playBg} ${theme.playText}`}
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
