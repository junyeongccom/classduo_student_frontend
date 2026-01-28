import { useEffect, useMemo, useState } from 'react'
import type { CardMatchPair } from '@/features/ai-tutor/types'

type CardMatchCard = {
  id: string
  pairId: string
  type: 'term' | 'desc'
  content: string
}

type CardMatchGameProps = {
  pairs: CardMatchPair[]
  status?: string
  isLoading?: boolean
  onComplete: () => void
}

const shuffleCards = (cards: CardMatchCard[]) => {
  const next = [...cards]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

export function CardMatchGame({ pairs, status, isLoading, onComplete }: CardMatchGameProps) {
  const cards = useMemo(() => {
    const base: CardMatchCard[] = pairs.flatMap(pair => [
      { id: `${pair.pair_id}-term`, pairId: pair.pair_id, type: 'term', content: pair.term },
      { id: `${pair.pair_id}-desc`, pairId: pair.pair_id, type: 'desc', content: pair.description },
    ])
    return shuffleCards(base)
  }, [pairs])

  const [flippedIds, setFlippedIds] = useState<string[]>([])
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set())
  const [shakeIds, setShakeIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setFlippedIds([])
    setMatchedIds(new Set())
    setShakeIds(new Set())
  }, [cards])

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
      }, 320)
      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => {
      setShakeIds(new Set([firstId, secondId]))
      setTimeout(() => {
        setShakeIds(new Set())
        setFlippedIds([])
      }, 260)
    }, 120)
    return () => window.clearTimeout(timer)
  }, [cards, flippedIds])

  useEffect(() => {
    if (cards.length > 0 && matchedIds.size === cards.length) {
      const timer = window.setTimeout(() => {
        onComplete()
      }, 300)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [cards.length, matchedIds, onComplete])

  if (isLoading || status === 'PENDING') {
    return (
      <div className="w-full max-w-[820px] rounded-3xl border border-gray-100 bg-white/60 p-6 shadow-sm">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div key={idx} className="card-match-skeleton" />
          ))}
        </div>
      </div>
    )
  }

  if (!pairs.length || status === 'FAILED') {
    return (
      <div className="w-full max-w-[820px] rounded-3xl border border-gray-100 bg-white/60 p-6 text-center text-sm text-gray-400">
        카드 매칭 데이터를 준비 중입니다.
      </div>
    )
  }

  return (
    <div className="w-full max-w-[820px] rounded-3xl bg-white/70 p-6">
      <div className="grid grid-cols-4 gap-4">
        {cards.map(card => {
          const isMatched = matchedIds.has(card.id)
          const isShaking = shakeIds.has(card.id)
          const isSelected = flippedIds.includes(card.id)
          return (
            <button
              key={card.id}
              type="button"
              className={`card-match-card ${isMatched ? 'card-match-card--matched' : ''} ${
                isShaking ? 'card-match-card--shake' : ''
              } ${card.type === 'term' ? 'card-match-card--term' : 'card-match-card--desc'}`}
              data-selected={isSelected ? 'true' : 'false'}
              onClick={() => {
                if (isMatched) return
                if (flippedIds.includes(card.id)) return
                if (flippedIds.length >= 2) return
                setFlippedIds(prev => [...prev, card.id])
              }}
            >
              <span className="card-match-card__inner">
                <span className="card-match-card__face card-match-card__face--back">
                </span>
                <span className="card-match-card__face card-match-card__face--front">
                  <span className={`card-match-card__content ${card.type === 'term' ? 'font-semibold' : ''}`}>
                    {card.content}
                  </span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

