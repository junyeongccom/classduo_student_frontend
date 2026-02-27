/**
 * @file GameDescriptionPopup.tsx
 * @description 게임 설명 팝업 — 게임 목표, 시각적 가이드, 조작 방법을 보여주고 "게임 시작" 버튼으로 진행
 * @module features/lecture-study/components/ui
 * @dependencies shared/components/ui/Dialog, lucide-react
 */

'use client'

import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Target, Gamepad2, Mouse, Keyboard, ArrowUpDown, Eye, MessageSquare } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui'
import { cn } from '@/shared/lib/utils'
import { GAME_LIST } from './GameSelector'

interface GameDescriptionPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gameId: string | null
  onPlay: () => void
  onRankPlay?: () => void
}

type GameTheme = {
  goalBg: string
  button: string
  previewBg: string
}

const GAME_THEMES: Record<string, GameTheme> = {
  running: {
    goalBg: 'bg-orange-50 dark:bg-orange-950/30',
    button: 'bg-orange-500 hover:bg-orange-600',
    previewBg: 'bg-gradient-to-b from-sky-200 via-sky-100 to-amber-100',
  },
  deck: {
    goalBg: 'bg-blue-50 dark:bg-blue-950/30',
    button: 'bg-blue-500 hover:bg-blue-600',
    previewBg: 'bg-slate-50',
  },
  cardMatch: {
    goalBg: 'bg-violet-50 dark:bg-violet-950/30',
    button: 'bg-violet-500 hover:bg-violet-600',
    previewBg: 'bg-slate-50',
  },
  definitionBuilder: {
    goalBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    button: 'bg-emerald-500 hover:bg-emerald-600',
    previewBg: 'bg-slate-50',
  },
  guessTheTerm: {
    goalBg: 'bg-pink-50 dark:bg-pink-950/30',
    button: 'bg-pink-500 hover:bg-pink-600',
    previewBg: 'bg-slate-50',
  },
}

type ControlItem = {
  icon: React.ReactNode
  labelKey: string
}

const KBD_CLASSES = 'inline-flex items-center justify-center rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className={KBD_CLASSES}>{children}</kbd>
}

function getControls(gameId: string): ControlItem[] {
  switch (gameId) {
    case 'running':
      return [
        {
          icon: (
            <span className="flex items-center gap-1">
              <Kbd>&uarr;</Kbd>
              <Kbd>Space</Kbd>
            </span>
          ),
          labelKey: 'controlJump',
        },
        {
          icon: <Kbd>&darr;</Kbd>,
          labelKey: 'controlDuck',
        },
      ]
    case 'deck':
      return [
        { icon: <Mouse className="h-4 w-4 text-gray-500" />, labelKey: 'controlFlip' },
        {
          icon: (
            <span className="flex items-center gap-1">
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">Bad</span>
              <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">Okay</span>
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">Good</span>
            </span>
          ),
          labelKey: 'controlRate',
        },
      ]
    case 'cardMatch':
      return [
        { icon: <Mouse className="h-4 w-4 text-gray-500" />, labelKey: 'controlSelect' },
      ]
    case 'definitionBuilder':
      return [
        { icon: <Mouse className="h-4 w-4 text-gray-500" />, labelKey: 'controlSelect' },
        { icon: <ArrowUpDown className="h-4 w-4 text-gray-500" />, labelKey: 'controlPlace' },
      ]
    case 'guessTheTerm':
      return [
        { icon: <Keyboard className="h-4 w-4 text-gray-500" />, labelKey: 'controlType' },
        { icon: <Mouse className="h-4 w-4 text-gray-500" />, labelKey: 'controlGuess' },
      ]
    default:
      return []
  }
}

/* ─── No SVG icons needed — using actual game texture PNGs ─── */

/* ─── Running Game: Actual game scene screenshot + extracted PNG textures ─── */
function RunningGamePreview({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="space-y-2">
      {/* Actual game scene screenshot */}
      <div className="overflow-hidden rounded-xl">
        <Image
          src="/game/scene.png"
          alt="Running game scene"
          width={800}
          height={400}
          className="w-full"
          style={{ display: 'block' }}
        />
      </div>

      {/* Object legend with actual extracted game textures */}
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-yellow-50 px-3 py-2 dark:bg-yellow-950/20">
          <Image src="/game/coin.png" alt="coin" width={24} height={24} className="shrink-0" />
          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('lectureStudy.game.desc.running.objCoin')}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{t('lectureStudy.game.desc.running.objCoinDesc')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-950/20">
          <Image src="/game/heart_item.png" alt="heart item" width={24} height={24} className="shrink-0" />
          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('lectureStudy.game.desc.running.objHeart')}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{t('lectureStudy.game.desc.running.objHeartDesc')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg bg-orange-50 px-3 py-2 dark:bg-orange-950/20">
          <Image src="/game/meteor.png" alt="meteor" width={24} height={24} className="shrink-0" />
          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('lectureStudy.game.desc.running.objMeteor')}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{t('lectureStudy.game.desc.running.objMeteorDesc')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Deck Game: Flashcard Preview ─── */
function DeckGamePreview({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
      {/* Card */}
      <div className="relative h-28 w-full max-w-[220px] rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex h-full flex-col items-center justify-center p-3">
          <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Keyword</span>
          <span className="mt-1.5 text-[11px] text-slate-400">{t('lectureStudy.game.desc.deck.previewHint')}</span>
        </div>
        {/* Flip arrow indicator */}
        <div className="absolute -right-7 top-1/2 -translate-y-1/2 text-lg text-slate-400">&#8644;</div>
      </div>
      {/* Rating buttons */}
      <div className="flex gap-2">
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700">Bad</div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">Okay</div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">Good</div>
      </div>
    </div>
  )
}

/* ─── Card Match: Grid Preview ─── */
function CardMatchPreview({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
      {/* Card grid */}
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 12 }).map((_, i) => {
          const isSelected = i === 2
          const isMatched = i === 5 || i === 8
          const isTerm = i % 2 === 0
          return (
            <div
              key={i}
              className={cn(
                'flex h-10 items-center justify-center rounded-lg border text-[11px] font-semibold transition-all',
                isMatched
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-600 opacity-50'
                  : isSelected
                    ? 'border-blue-300 bg-white text-blue-600 shadow-sm'
                    : isTerm
                      ? 'border-violet-200 bg-violet-50 text-violet-600'
                      : 'border-slate-200 bg-white text-slate-500',
              )}
            >
              {isMatched ? '\u2713' : isTerm ? 'Term' : 'Desc'}
            </div>
          )
        })}
      </div>
      <p className="mt-2.5 text-center text-[11px] text-slate-400">{t('lectureStudy.game.desc.cardMatch.previewHint')}</p>
    </div>
  )
}

/* ─── Definition Builder: Fill-blank Preview ─── */
function DefBuilderPreview({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
      {/* Keyword */}
      <div className="mb-2 text-center text-base font-semibold text-blue-600">Keyword</div>
      {/* Definition with blanks */}
      <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
        <span>The</span>
        <span className="inline-flex min-w-[48px] items-center justify-center rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-900 dark:border-slate-600 dark:bg-slate-800">____</span>
        <span>is</span>
        <span>a</span>
        <span className="inline-flex min-w-[48px] items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">cell</span>
        <span>that</span>
        <span className="inline-flex min-w-[48px] items-center justify-center rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-900 dark:border-slate-600 dark:bg-slate-800">____</span>
      </div>
      {/* Token choices */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {['process', 'cell', 'energy', 'divide'].map((token, i) => (
          <span
            key={token}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-semibold',
              i === 1
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-600'
                : 'border border-blue-200 bg-blue-50 text-blue-600',
            )}
          >
            {token}
          </span>
        ))}
      </div>
      <p className="mt-2.5 text-center text-[11px] text-slate-400">{t('lectureStudy.game.desc.definitionBuilder.previewHint')}</p>
    </div>
  )
}

/* ─── Guess The Term: Chat + Grid Preview ─── */
function GuessTermPreview({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
      <div className="grid grid-cols-5 gap-2">
        {/* Chat area (left 2 cols) */}
        <div className="col-span-2 flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
          {/* System message */}
          <div className="self-start rounded-xl bg-slate-100 px-2 py-1 text-[9px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {t('lectureStudy.game.desc.guessTheTerm.previewAI')}
          </div>
          {/* User message */}
          <div className="self-end rounded-xl bg-slate-900 px-2 py-1 text-[9px] text-white">
            {t('lectureStudy.game.desc.guessTheTerm.previewUser')}
          </div>
          {/* System reply */}
          <div className="self-start rounded-xl bg-slate-100 px-2 py-1 text-[9px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {t('lectureStudy.game.desc.guessTheTerm.previewReply')}
          </div>
          {/* Input */}
          <div className="mt-auto flex gap-1">
            <div className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[8px] text-slate-400">...</div>
            <div className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[8px] text-white">&#9654;</div>
          </div>
        </div>
        {/* Term grid (right 3 cols) */}
        <div className="col-span-3 grid grid-cols-3 gap-1">
          {[
            { state: 'normal' },
            { state: 'eliminated' },
            { state: 'normal' },
            { state: 'normal' },
            { state: 'wrong' },
            { state: 'normal' },
          ].map((item, i) => (
            <div
              key={i}
              className={cn(
                'flex h-8 items-center justify-center rounded-lg border text-[8px] font-semibold',
                item.state === 'eliminated'
                  ? 'border-slate-200 bg-slate-100 text-slate-300 line-through'
                  : item.state === 'wrong'
                    ? 'border-rose-200 bg-rose-50 text-rose-500'
                    : 'border-slate-200 bg-white text-slate-600',
              )}
            >
              {item.state === 'eliminated' ? 'term' : item.state === 'wrong' ? 'term' : 'term'}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-slate-400">{t('lectureStudy.game.desc.guessTheTerm.previewHint')}</p>
    </div>
  )
}

/* ─── Preview Router ─── */
function GamePreview({ gameId, t }: { gameId: string; t: ReturnType<typeof useTranslations> }) {
  switch (gameId) {
    case 'running':
      return <RunningGamePreview t={t} />
    case 'deck':
      return <DeckGamePreview t={t} />
    case 'cardMatch':
      return <CardMatchPreview t={t} />
    case 'definitionBuilder':
      return <DefBuilderPreview t={t} />
    case 'guessTheTerm':
      return <GuessTermPreview t={t} />
    default:
      return null
  }
}

export function GameDescriptionPopup({
  open,
  onOpenChange,
  gameId,
  onPlay,
  onRankPlay,
}: GameDescriptionPopupProps) {
  const t = useTranslations()

  if (!gameId) return null

  const gameInfo = GAME_LIST.find(g => g.id === gameId)
  const theme = GAME_THEMES[gameId]
  const controls = getControls(gameId)

  if (!gameInfo || !theme) return null

  const gameName = t(`lectureStudy.game.${gameId}` as Parameters<typeof t>[0])
  const subtitle = t(`lectureStudy.game.desc.${gameId}.subtitle` as Parameters<typeof t>[0])
  const goal = t(`lectureStudy.game.desc.${gameId}.goal` as Parameters<typeof t>[0])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0 px-5 pt-5 pb-2 md:px-6 md:pt-5 md:pb-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{gameInfo.icon}</span>
            <div>
              <DialogTitle className="text-base font-bold">{gameName}</DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                {subtitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-3 md:px-6 md:py-4">
          <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-5">
            {/* Left column — visual preview */}
            <div className="flex flex-col gap-2">
              <GamePreview gameId={gameId} t={t} />
            </div>

            {/* Right column — goal + controls */}
            <div className="flex flex-col gap-3">
              {/* Goal section */}
              <div className={cn('rounded-xl p-3.5', theme.goalBg)}>
                <div className="mb-1.5 flex items-center gap-2">
                  <Target className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t('lectureStudy.game.desc.goalLabel')}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {goal}
                </p>
              </div>

              {/* Controls section */}
              <div className="rounded-xl border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-gray-900">
                <div className="mb-2.5 flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t('lectureStudy.game.desc.controlsLabel')}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {controls.map((ctrl) => (
                    <div key={ctrl.labelKey} className="flex items-center gap-3">
                      <div className="flex shrink-0 justify-start">{ctrl.icon}</div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t(`lectureStudy.game.desc.${gameId}.${ctrl.labelKey}` as Parameters<typeof t>[0])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 px-5 pb-4 pt-2 md:px-6 md:pb-5">
          {gameId === 'running' && onRankPlay ? (
            <div className="flex w-full gap-2">
              <button
                onClick={onRankPlay}
                className="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600"
              >
                {t('lectureStudy.game.desc.rankPlayButton')}
              </button>
              <button
                onClick={onPlay}
                className="flex-1 rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {t('lectureStudy.game.desc.normalPlayButton')}
              </button>
            </div>
          ) : (
            <button
              onClick={onPlay}
              className={cn(
                'w-full rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition-colors',
                theme.button,
              )}
            >
              {t('lectureStudy.game.desc.playButton')}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
