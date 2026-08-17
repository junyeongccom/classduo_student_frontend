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
  /** 시작 화면(난이도 선택)을 지났는가 */
  const [started, setStarted] = useState(false)
  /** 드래그 방법 안내를 아직 보여줄 것인가 — 첫 수를 두면 사라진다 */
  const [showDragHint, setShowDragHint] = useState(true)

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

  // 난이도는 시작 전에만 고른다 — 게임 중에 바꾸면 판이 초기화돼 그동안의 수가 날아간다.
  if (!started) {
    return (
      <DifficultyGate
        selected={difficulty}
        onSelect={setDifficulty}
        onStart={() => setStarted(true)}
        t={t}
      />
    )
  }

  return (
    <div className="relative flex flex-col gap-3">
      {/* 조작 줄 — 난이도는 여기 없다(시작 화면에서 이미 골랐다) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
          {t(`difficulty.${difficulty}`)}
        </span>

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
          <button
            type="button"
            onClick={() => setStarted(false)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            {t('changeDifficulty')}
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
            elapsedMs={game.elapsedMs}
            locked={game.won}
            onTapCard={game.tapCard}
            onTapTarget={game.tapTarget}
            onDropCard={game.dropOn}
            onDraw={game.draw}
          />

          <p className="text-center text-[11px] text-gray-400">{t('hintDrag')}</p>

          {showDragHint && game.state.turns === 0 && !game.won && (
            <DragHintOverlay onDismiss={() => setShowDragHint(false)} t={t} />
          )}
        </>
      )}
    </div>
  )
}

/** 시작 화면 — 난이도를 여기서 정하고 들어간다 (게임 중에는 못 바꾼다) */
function DifficultyGate({
  selected,
  onSelect,
  onStart,
  t,
}: {
  selected: SolitaireDifficulty
  onSelect: (level: SolitaireDifficulty) => void
  onStart: () => void
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10">
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900">{t('difficultyLabel')}</h3>
        <p className="mt-1 text-xs text-gray-500">{t('difficultyGateHelp')}</p>
      </div>

      <div className="flex w-full max-w-md flex-col gap-2" role="group" aria-label={t('difficultyLabel')}>
        {SOLITAIRE_DIFFICULTIES.map(level => (
          <button
            key={level}
            type="button"
            onClick={() => onSelect(level)}
            aria-pressed={selected === level}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
              selected === level
                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <span className="text-sm font-bold text-gray-900">{t(`difficulty.${level}`)}</span>
            <span className="text-[11px] text-gray-500">{t(`difficultyDesc.${level}`)}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onStart}
        className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
      >
        {t('startGame')}
      </button>
    </div>
  )
}

/**
 * 첫 진입 안내 — 카드를 끌어다 놓는 동작을 손 모양으로 한 번 보여준다.
 * 판을 가리지 않도록 반투명 카드에 얹고, 아무 데나 누르면 사라진다.
 */
function DragHintOverlay({
  onDismiss,
  t,
}: {
  onDismiss: () => void
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div
      className="absolute inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-[1px]"
      onPointerDown={onDismiss}
      role="button"
      tabIndex={0}
      aria-label={t('dragHintDismiss')}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') onDismiss()
      }}
    >
      <div className="mx-6 flex max-w-xs flex-col items-center gap-4 rounded-2xl bg-white px-6 py-6 text-center shadow-2xl">
        <p className="text-sm font-bold text-gray-900">{t('dragHintTitle')}</p>

        {/* 카드 → 목적지로 끌리는 손가락 애니메이션 */}
        <div className="relative h-24 w-44">
          <div className="absolute left-0 top-3 flex h-16 w-14 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-[10px] text-gray-400">
            {t('dragHintFrom')}
          </div>
          <div className="absolute right-0 top-3 flex h-16 w-14 items-center justify-center rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50 text-[10px] font-semibold text-indigo-500">
            {t('dragHintTo')}
          </div>
          <div className="ws-drag-demo absolute left-0 top-3 flex h-16 w-14 items-center justify-center rounded-lg border border-indigo-300 bg-white text-[11px] font-bold text-gray-800 shadow-lg">
            <span aria-hidden="true">🖐️</span>
          </div>
        </div>

        <p className="text-xs text-gray-500">{t('dragHintBody')}</p>
        <span className="text-[11px] font-semibold text-indigo-600">{t('dragHintDismiss')}</span>
      </div>
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
