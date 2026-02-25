'use client'

import { useEffect, useMemo, useState } from 'react'
import type { LectureReviewItem } from '@/features/review/types'

type MatchCard = {
  id: string
  pairId: string
  type: 'term' | 'desc'
  content: string
}

type SizeOption = {
  pairs: 6 | 8 | 10
  cols: number
  rows: number
}

const SIZE_OPTIONS: SizeOption[] = [
  { pairs: 6, cols: 4, rows: 3 },
  { pairs: 8, cols: 4, rows: 4 },
  { pairs: 10, cols: 5, rows: 4 },
]

const shuffle = <T,>(items: T[]) => {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

const formatTime = (valueMs: number) => {
  const totalSeconds = Math.floor(valueMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const ms = Math.floor((valueMs % 1000) / 10)
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

interface ReviewMatchingGameProps {
  reviewItems: LectureReviewItem[]
  isEnabled: boolean
  onExit: () => void
}

export function ReviewMatchingGame({ reviewItems, isEnabled, onExit }: ReviewMatchingGameProps) {
  const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null)
  const [cards, setCards] = useState<MatchCard[]>([])
  const [flippedIds, setFlippedIds] = useState<string[]>([])
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set())
  const [shakeIds, setShakeIds] = useState<Set<string>>(new Set())
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set())
  const [startBanner, setStartBanner] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [gameCompleted, setGameCompleted] = useState(false)

  const availableCount = reviewItems.length

  const gridStyle = useMemo(() => {
    if (!selectedSize) return undefined
    return {
      gridTemplateColumns: `repeat(${selectedSize.cols}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${selectedSize.rows}, minmax(0, 1fr))`,
    }
  }, [selectedSize])

  const boardWidth = useMemo(() => {
    if (!selectedSize) return undefined
    return selectedSize.cols === 5 ? 'min(90vw, 1100px)' : 'min(85vw, 920px)'
  }, [selectedSize])

  const boardHeight = useMemo(() => {
    if (!selectedSize) return undefined
    return selectedSize.rows === 3 ? 'min(55vh, 520px)' : 'min(65vh, 640px)'
  }, [selectedSize])

  const buildGame = (size?: SizeOption | null) => {
    const activeSize = size ?? selectedSize
    if (!activeSize) return
    const selected = shuffle(reviewItems).slice(0, activeSize.pairs)
    const nextCards = shuffle(
      selected.flatMap(item => [
        { id: `${item.id}-term`, pairId: item.id, type: 'term' as const, content: item.keyword },
        { id: `${item.id}-desc`, pairId: item.id, type: 'desc' as const, content: item.description },
      ])
    )

    setCards(nextCards)
    setFlippedIds([])
    setMatchedIds(new Set())
    setShakeIds(new Set())
    setWrongIds(new Set())
    setElapsedMs(0)
    setGameCompleted(false)
    setStartBanner(true)
    setIsRunning(false)
    window.setTimeout(() => {
      setStartBanner(false)
      setIsRunning(true)
    }, 900)
  }

  useEffect(() => {
    if (!isRunning) return
    const timer = window.setInterval(() => {
      setElapsedMs(prev => prev + 10)
    }, 10)
    return () => window.clearInterval(timer)
  }, [isRunning])

  useEffect(() => {
    if (flippedIds.length !== 2) return
    const [firstId, secondId] = flippedIds
    const first = cards.find(card => card.id === firstId)
    const second = cards.find(card => card.id === secondId)
    if (!first || !second) return

    const isMatch = first.pairId === second.pairId
    if (isMatch) {
      const timer = window.setTimeout(() => {
        setMatchedIds(prev => new Set([...prev, firstId, secondId]))
        setFlippedIds([])
      }, 260)
      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => {
      setShakeIds(new Set([firstId, secondId]))
      setWrongIds(new Set([firstId, secondId]))
      window.setTimeout(() => {
        setShakeIds(new Set())
        setWrongIds(new Set())
        setFlippedIds([])
      }, 320)
    }, 120)
    return () => window.clearTimeout(timer)
  }, [cards, flippedIds])

  useEffect(() => {
    if (cards.length > 0 && matchedIds.size === cards.length) {
      setIsRunning(false)
      setGameCompleted(true)
    }
  }, [cards.length, matchedIds])

  if (!isEnabled) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-8 text-sm text-slate-500">
        회차를 선택하면 매칭게임을 시작할 수 있어요.
      </div>
    )
  }

  if (!selectedSize) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center">
        <h3 className="text-sm font-semibold text-slate-900">게임 크기 선택</h3>
        <p className="mt-2 text-xs text-slate-500">원하는 쌍 수를 선택하면 게임이 시작됩니다.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {SIZE_OPTIONS.map(option => {
            const disabled = availableCount < option.pairs
            return (
              <button
                key={option.pairs}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setSelectedSize(option)
                  window.setTimeout(() => buildGame(option), 0)
                }}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  disabled
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300'
                    : 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100'
                }`}
              >
                {option.pairs}쌍 ({option.cols}x{option.rows})
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (gameCompleted) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
        <div className="matching-game-success text-3xl font-extrabold text-emerald-600">SUCCESS</div>
        <div className="text-sm font-semibold text-slate-600">최종 기록</div>
        <div className="text-2xl font-bold text-slate-900">{formatTime(elapsedMs)}</div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => buildGame()}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            다시 시작
          </button>
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
          >
            목록으로
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex h-10 w-full items-center justify-center">
        {!startBanner ? (
          <div className="text-3xl font-semibold text-slate-800">
            {formatTime(elapsedMs)}
          </div>
        ) : (
          <div className="matching-game-start text-2xl font-semibold text-blue-600">
            game start
          </div>
        )}
      </div>
      <div
        className="matching-game-board grid gap-3"
        style={{ ...gridStyle, height: boardHeight, width: boardWidth }}
      >
        {cards.map(card => {
          const isMatched = matchedIds.has(card.id)
          const isShaking = shakeIds.has(card.id)
          const isSelected = flippedIds.includes(card.id)
          const isWrong = wrongIds.has(card.id)
          return (
            <button
              key={card.id}
              type="button"
              className={`matching-game-card ${card.type === 'term' ? 'matching-game-card--term' : 'matching-game-card--desc'} ${
                isMatched ? 'matching-game-card--matched' : ''
              } ${isShaking ? 'matching-game-card--shake' : ''} ${isWrong ? 'matching-game-card--wrong' : ''}`}
              data-selected={isSelected ? 'true' : 'false'}
              onClick={() => {
                if (isMatched) return
                if (flippedIds.includes(card.id)) return
                if (flippedIds.length >= 2) return
                setFlippedIds(prev => [...prev, card.id])
              }}
            >
              <span className={`matching-game-card__content ${card.type === 'term' ? 'font-semibold' : ''}`}>
                {card.content}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

