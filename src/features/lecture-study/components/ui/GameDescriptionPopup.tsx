/**
 * @file GameDescriptionPopup.tsx
 * @description 게임 설명 팝업 — 게임 목표, 조작법, 썸네일을 안내하는 범용 팝업
 * @module features/lecture-study/components/ui
 * @dependencies shared/components/ui/Dialog, gameDescriptions, lucide-react, next/image
 */

'use client'

import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Play, Keyboard, MousePointerClick, MessageSquare } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui'
import { GAME_DESCRIPTIONS } from './gameDescriptions'
import type { GameControl } from './gameDescriptions'

interface GameDescriptionPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gameId: string | null
  gameName: string
  gameIcon: string
  onStartGame: () => void
}

const THEME_CLASSES: Record<string, { button: string; iconBg: string; emojiBg: string }> = {
  orange: {
    button: 'bg-orange-500 hover:bg-orange-600',
    iconBg: 'bg-orange-100 text-orange-600',
    emojiBg: 'bg-orange-100',
  },
  blue: {
    button: 'bg-blue-500 hover:bg-blue-600',
    iconBg: 'bg-blue-100 text-blue-600',
    emojiBg: 'bg-blue-100',
  },
  violet: {
    button: 'bg-violet-500 hover:bg-violet-600',
    iconBg: 'bg-violet-100 text-violet-600',
    emojiBg: 'bg-violet-100',
  },
  emerald: {
    button: 'bg-emerald-500 hover:bg-emerald-600',
    iconBg: 'bg-emerald-100 text-emerald-600',
    emojiBg: 'bg-emerald-100',
  },
  pink: {
    button: 'bg-pink-500 hover:bg-pink-600',
    iconBg: 'bg-pink-100 text-pink-600',
    emojiBg: 'bg-pink-100',
  },
}

function ControlIcon({ control, themeClasses }: { control: GameControl; themeClasses: { iconBg: string } }) {
  const iconCn = `h-4 w-4`
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${themeClasses.iconBg}`}>
      {control.iconType === 'keyboard' && <Keyboard className={iconCn} />}
      {control.iconType === 'mouse' && <MousePointerClick className={iconCn} />}
      {control.iconType === 'text' && <MessageSquare className={iconCn} />}
    </div>
  )
}

export function GameDescriptionPopup({
  open,
  onOpenChange,
  gameId,
  gameName,
  gameIcon,
  onStartGame,
}: GameDescriptionPopupProps) {
  const t = useTranslations()

  if (!gameId) return null

  const desc = GAME_DESCRIPTIONS[gameId]
  if (!desc) return null

  const theme = THEME_CLASSES[desc.colorTheme] ?? THEME_CLASSES.blue

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{gameIcon}</span>
            <DialogTitle>{gameName}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">{gameName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Goal */}
          <div>
            <h4 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <span>🎯</span>
              {t('lectureStudy.game.description.goalLabel')}
            </h4>
            <p className="text-sm text-gray-600">
              {t(`lectureStudy.game.description.${desc.goalKey}` as Parameters<typeof t>[0])}
            </p>
          </div>

          {/* Controls */}
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <span>🎮</span>
              {t('lectureStudy.game.description.controlsLabel')}
            </h4>
            <div className="space-y-2">
              {desc.controls.map((ctrl, i) => (
                <div key={i} className="flex items-center gap-3">
                  <ControlIcon control={ctrl} themeClasses={theme} />
                  {ctrl.keyLabel && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">
                      {ctrl.keyLabel}
                    </span>
                  )}
                  <span className="text-sm text-gray-600">
                    {t(`lectureStudy.game.description.${ctrl.descriptionKey}` as Parameters<typeof t>[0])}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Thumbnail or Emoji fallback */}
          {desc.thumbnail ? (
            <div className="relative mx-auto h-40 w-full overflow-hidden rounded-xl border border-gray-200">
              <Image
                src={desc.thumbnail}
                alt={gameName}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className={`mx-auto flex h-28 w-full items-center justify-center rounded-xl ${theme.emojiBg}`}>
              <span className="text-5xl">{gameIcon}</span>
            </div>
          )}

          {/* Start button */}
          <button
            onClick={onStartGame}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors ${theme.button}`}
          >
            <Play className="h-4 w-4" />
            {t('lectureStudy.game.description.startButton')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
