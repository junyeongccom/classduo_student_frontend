/**
 * @file WordSolitaireGame.tsx
 * @description 단어 솔리테어 게임 화면 — 콘텐츠 로딩 3상태 + 난이도 선택 + 보드 + 승리 화면 조립
 * @module features/review/games/word-solitaire/components
 * @dependencies useWordCategories, useWordSolitaire, SolitaireBoard, SolitaireWinPanel
 */
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Puzzle, RotateCcw, Undo2 } from 'lucide-react'
import { useWordCategories } from '@/features/review/hooks/useWordCategories'
import { reviewService } from '@/features/review/services/reviewService'
import {
  SOLITAIRE_DIFFICULTIES,
  type SolitaireContent,
  type SolitaireDifficulty,
} from '../engine/index.ts'
import { useWordSolitaire } from '../useWordSolitaire.ts'
import { SolitaireBoard } from './SolitaireBoard'
import { SolitaireWinPanel } from './SolitaireWinPanel'

export interface WordSolitaireGameProps {
  lectureId: string | null
  /** 게임 화면이 실제로 보이는 동안에만 콘텐츠를 불러온다 */
  isActive: boolean
}

export function WordSolitaireGame({ lectureId, isActive }: WordSolitaireGameProps) {
  const t = useTranslations('review.ui.wordSolitaire')
  const [difficulty, setDifficulty] = useState<SolitaireDifficulty>('normal')

  const {
    data,
    isLoading: isContentLoading,
    hasError: hasContentError,
    refetch,
  } = useWordCategories(lectureId, Boolean(lectureId) && isActive)

  const isPlayable = Boolean(data?.is_active) && (data?.categories?.length ?? 0) > 0

  // 판 생성 useEffect 가 매 렌더마다 다시 돌지 않도록 참조를 고정한다.
  const content: SolitaireContent | null = useMemo(
    () =>
      isPlayable
        ? { categories: (data?.categories ?? []).map(c => ({ name: c.name, words: c.words ?? [] })) }
        : null,
    [isPlayable, data],
  )

  const game = useWordSolitaire({ lectureId, content, difficulty })

  // 승리 시 1회만 기록을 제출한다. 같은 판을 다시 렌더해도 중복 전송되지 않도록 시드+턴으로 가드한다.
  const submittedKeyRef = useRef<string | null>(null)
  useEffect(() => {
    const result = game.result
    if (!result || !lectureId) return
    const key = `${result.seed}:${result.difficulty}:${result.turns}`
    if (submittedKeyRef.current === key) return
    submittedKeyRef.current = key

    // 제출 실패가 게임 화면을 막지는 않는다 — 승리 자체는 이미 사용자에게 보여준 상태다.
    void reviewService
      .submitWordSolitaireScore(lectureId, {
        difficulty: result.difficulty,
        turns: result.turns,
        seed: result.seed,
        minTurns: result.minTurns,
      })
      .catch(() => {
        submittedKeyRef.current = null
      })
  }, [game.result, lectureId])

  if (!lectureId) {
    return <Message text={t('selectLecture')} />
  }

  if (isContentLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
        <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
        <p className="text-sm">{t('loading')}</p>
      </div>
    )
  }

  if (hasContentError) {
    return <ErrorState message={t('loadFailed')} retryLabel={t('retry')} onRetry={refetch} />
  }

  if (!isPlayable) {
    return <Message text={t('notReady')} icon />
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 난이도 */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('difficultyLabel')}>
        {SOLITAIRE_DIFFICULTIES.map(level => (
          <button
            key={level}
            type="button"
            onClick={() => setDifficulty(level)}
            aria-pressed={difficulty === level}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              difficulty === level
                ? 'bg-gray-900 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t(`difficulty.${level}`)}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={game.undo}
            disabled={!game.canUndo}
            aria-label={t('undoAria')}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t('undo')}
          </button>
          <button
            type="button"
            onClick={game.restart}
            disabled={!game.deal}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t('restart')}
          </button>
        </div>
      </div>

      {game.isDealing && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
          <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
          <p className="text-sm">{t('dealing')}</p>
        </div>
      )}

      {!game.isDealing && game.hasDealError && (
        <ErrorState message={t('dealFailed')} retryLabel={t('retry')} onRetry={refetch} />
      )}

      {!game.isDealing && !game.hasDealError && game.state && (
        <>
          {game.won && game.result ? (
            <SolitaireWinPanel result={game.result} onRestart={game.restart} />
          ) : (
            !game.hasCardMove && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-800">
                {game.canDraw ? t('stuckDrawStock') : t('stuckRestart')}
              </p>
            )
          )}

          <SolitaireBoard
            state={game.state}
            selection={game.selection}
            highlightKeys={game.highlightKeys}
            movableKeys={game.movableKeys}
            rejectedKey={game.rejectedKey}
            canDraw={game.canDraw}
            locked={game.won}
            onTapCard={game.tapCard}
            onTapTarget={game.tapTarget}
            onDraw={game.draw}
          />

          <p className="text-center text-[11px] text-gray-400">{t('hint')}</p>
        </>
      )}
    </div>
  )
}

function ErrorState({
  message,
  retryLabel,
  onRetry,
}: {
  message: string
  retryLabel: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <p className="text-sm text-gray-500">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        {retryLabel}
      </button>
    </div>
  )
}

function Message({ text, icon = false }: { text: string; icon?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
      {icon && <Puzzle className="h-8 w-8 stroke-[1.5]" aria-hidden="true" />}
      <p className="text-sm">{text}</p>
    </div>
  )
}
