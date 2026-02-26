/**
 * @file GameSelector.tsx
 * @description 4개 게임 선택 카드 UI
 * @module features/lecture-study/components/ui
 * @dependencies lucide-react
 */

'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/shared/lib/utils'
import type { GameInfo } from '../../types'

const GAME_LIST: GameInfo[] = [
  { id: 'running', name: '', description: '', minWords: 3, icon: '🏃' },
  { id: 'deck', name: '', description: '', minWords: 1, icon: '🃏' },
  { id: 'cardMatch', name: '', description: '', minWords: 6, icon: '🎴' },
  { id: 'definitionBuilder', name: '', description: '', minWords: 1, icon: '🧩' },
]

const GAME_COLORS = [
  'from-orange-50 to-orange-100 border-orange-200 hover:border-orange-400',
  'from-blue-50 to-blue-100 border-blue-200 hover:border-blue-400',
  'from-violet-50 to-violet-100 border-violet-200 hover:border-violet-400',
  'from-emerald-50 to-emerald-100 border-emerald-200 hover:border-emerald-400',
]

interface GameSelectorProps {
  onSelectGame: (gameId: string) => void
}

export function GameSelector({ onSelectGame }: GameSelectorProps) {
  const t = useTranslations()

  const gameNames: Record<string, string> = {
    running: t('lectureStudy.game.running'),
    deck: t('lectureStudy.game.deck'),
    cardMatch: t('lectureStudy.game.cardMatch'),
    definitionBuilder: t('lectureStudy.game.definitionBuilder'),
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <h3 className="mb-4 text-lg font-bold text-gray-900">
        {t('lectureStudy.game.title')}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {GAME_LIST.map((game, i) => (
          <button
            key={game.id}
            onClick={() => onSelectGame(game.id)}
            className={cn(
              'flex items-center gap-4 rounded-2xl border bg-gradient-to-br p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
              GAME_COLORS[i],
            )}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/70 text-2xl shadow-sm">
              {game.icon}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">
                {gameNames[game.id]}
              </h4>
              {game.minWords > 0 && (
                <p className="text-xs text-gray-500">
                  {t('lectureStudy.game.minWords', { n: game.minWords })}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export { GAME_LIST }
