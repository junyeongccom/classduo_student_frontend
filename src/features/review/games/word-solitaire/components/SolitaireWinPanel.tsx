/**
 * @file SolitaireWinPanel.tsx
 * @description 승리 화면 — 소요 턴·별점·L*(최소 턴) 대비를 보여주고 다시 하기를 제공 (props 만 받는다)
 * @module features/review/games/word-solitaire/components
 * @dependencies lucide-react, useWordSolitaire 타입
 */
'use client'

import { useTranslations } from 'next-intl'
import { RotateCcw, Star } from 'lucide-react'
import type { WordSolitaireResult } from '../useWordSolitaire.ts'

/** 별점 표시 칸 수 (★★★ 만점) */
const MAX_STARS = 3

export interface SolitaireWinPanelProps {
  result: WordSolitaireResult
  onRestart: () => void
}

export function SolitaireWinPanel({ result, onRestart }: SolitaireWinPanelProps) {
  const t = useTranslations('review.ui.wordSolitaire')
  const diff = result.turns - result.minTurns

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-primary-200 bg-primary-50 p-6 text-center">
      <div className="text-lg font-bold text-primary-800">{t('winTitle')}</div>

      <div className="flex items-center gap-1" role="img" aria-label={t('starsAria', { stars: result.stars })}>
        {Array.from({ length: MAX_STARS }, (_, index) => (
          <Star
            key={index}
            className={`h-7 w-7 ${
              index < result.stars ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
            }`}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="flex items-center gap-6">
        <div>
          <div className="text-[11px] font-semibold text-gray-500">{t('turnsLabel')}</div>
          <div className="text-2xl font-bold text-gray-900">{result.turns}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-gray-500">{t('minTurnsLabel')}</div>
          <div className="text-2xl font-bold text-gray-500">{result.minTurns}</div>
        </div>
      </div>

      <p className="text-xs text-gray-600">
        {diff <= 0 ? t('winPerfect') : t('winGap', { gap: diff })}
      </p>

      <button
        type="button"
        onClick={onRestart}
        className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {t('restart')}
      </button>
    </div>
  )
}
