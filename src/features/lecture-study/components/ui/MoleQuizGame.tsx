/**
 * @file MoleQuizGame.tsx
 * @description 두더지 팝 퀴즈 — 정의에 맞는 용어 팻말을 든 두더지를 두드리는 게임 (생성 에셋 기반)
 * @module features/lecture-study/components/ui
 * @dependencies next-intl, /public/game2 에셋
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface GameWord {
  keyword: string
  description: string
}

interface MoleQuizGameProps {
  words: GameWord[]
  onClose: (score: number | null) => void
}

/** mole_bg.png(1376x768) 구멍 중심 좌표 (% — QA로 실측 보정) */
const HOLES = [
  { x: 25.8, y: 55 },
  { x: 50.0, y: 54 },
  { x: 74.5, y: 55 },
  { x: 21.5, y: 79 },
  { x: 50.0, y: 79 },
  { x: 78.5, y: 79 },
]

const ROUND_TIME_MS = 7000
const MOLES_PER_ROUND = 4
const TOTAL_ROUNDS = 8

type MoleState = 'up' | 'correct' | 'wrong' | 'down'

interface ActiveMole {
  holeIdx: number
  word: GameWord
  isAnswer: boolean
  state: MoleState
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function MoleQuizGame({ words, onClose }: MoleQuizGameProps) {
  const t = useTranslations('lectureStudy.game.play')

  // 중복 keyword 제거 (선지 겹침 방지)
  const pool = useMemo(() => {
    const seen = new Set<string>()
    return words.filter(w => {
      if (!w.keyword || !w.description || seen.has(w.keyword)) return false
      seen.add(w.keyword)
      return true
    })
  }, [words])

  const totalRounds = Math.min(TOTAL_ROUNDS, pool.length)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [moles, setMoles] = useState<ActiveMole[]>([])
  const [target, setTarget] = useState<GameWord | null>(null)
  const [phase, setPhase] = useState<'playing' | 'result' | 'finished'>('playing')
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME_MS)
  const [hitEffect, setHitEffect] = useState<{ x: number; y: number; key: number } | null>(null)
  const answeredRef = useRef(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const roundOrderRef = useRef<GameWord[]>([])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  const startRound = useCallback((roundIdx: number) => {
    const answer = roundOrderRef.current[roundIdx]
    const distractors = shuffle(pool.filter(w => w.keyword !== answer.keyword))
      .slice(0, MOLES_PER_ROUND - 1)
    const roundWords = shuffle([answer, ...distractors])
    const holes = shuffle(HOLES.map((_, i) => i)).slice(0, roundWords.length)
    answeredRef.current = false
    setMoles(roundWords.map((w, i) => ({
      holeIdx: holes[i],
      word: w,
      isAnswer: w.keyword === answer.keyword,
      state: 'up',
    })))
    setTarget(answer)
    setTimeLeft(ROUND_TIME_MS)
    setPhase('playing')
  }, [pool])

  // 게임 시작 — 라운드 순서 확정
  useEffect(() => {
    roundOrderRef.current = shuffle(pool).slice(0, totalRounds)
    if (totalRounds > 0) startRound(0)
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 라운드 타이머
  useEffect(() => {
    if (phase !== 'playing') return
    const iv = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          clearInterval(iv)
          return 0
        }
        return prev - 100
      })
    }, 100)
    return () => clearInterval(iv)
  }, [phase, round])

  const advance = useCallback((fromRound: number) => {
    const timer = setTimeout(() => {
      if (fromRound + 1 >= totalRounds) {
        setPhase('finished')
      } else {
        setRound(fromRound + 1)
        startRound(fromRound + 1)
      }
    }, 1100)
    timersRef.current.push(timer)
  }, [totalRounds, startRound])

  // 시간 초과 — 정답 두더지 공개 후 다음 라운드
  useEffect(() => {
    if (phase === 'playing' && timeLeft === 0 && !answeredRef.current) {
      answeredRef.current = true
      setMoles(prev => prev.map(m => m.isAnswer ? { ...m, state: 'correct' } : { ...m, state: 'down' }))
      setPhase('result')
      advance(round)
    }
  }, [timeLeft, phase, round, advance])

  const handleWhack = useCallback((mole: ActiveMole, e: React.MouseEvent) => {
    if (phase !== 'playing' || answeredRef.current || mole.state !== 'up') return
    const board = (e.currentTarget as HTMLElement).closest('[data-board]') as HTMLElement
    const rect = board.getBoundingClientRect()
    setHitEffect({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
      key: Date.now(),
    })

    if (mole.isAnswer) {
      answeredRef.current = true
      const bonus = Math.floor(timeLeft / 1000) * 10
      setScore(s => s + 100 + bonus)
      setCorrectCount(c => c + 1)
      setMoles(prev => prev.map(m =>
        m.holeIdx === mole.holeIdx ? { ...m, state: 'correct' } : { ...m, state: 'down' }))
      setPhase('result')
      advance(round)
    } else {
      setScore(s => Math.max(0, s - 20))
      setMoles(prev => prev.map(m =>
        m.holeIdx === mole.holeIdx ? { ...m, state: 'wrong' } : m))
    }
  }, [phase, timeLeft, round, advance])

  const handleReplay = useCallback(() => {
    clearTimers()
    roundOrderRef.current = shuffle(pool).slice(0, totalRounds)
    setScore(0)
    setCorrectCount(0)
    setRound(0)
    startRound(0)
  }, [pool, totalRounds, startRound])

  const moleImg = (state: MoleState) =>
    state === 'correct' ? '/game2/mole_correct.png'
    : state === 'wrong' ? '/game2/mole_wrong.png'
    : '/game2/mole_normal.png'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
      <div className="relative w-full max-w-4xl">
        {/* 상단 HUD */}
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-white/95 px-4 py-2.5 shadow-lg">
          <span className="shrink-0 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
            {t('round', { current: Math.min(round + 1, totalRounds), total: totalRounds })}
          </span>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-gray-800" title={target?.description}>
            {target?.description}
          </p>
          <span className="shrink-0 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
            {score}{t('scoreSuffix')}
          </span>
          <button
            onClick={() => onClose(phase === 'finished' ? score : null)}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 타이머 바 */}
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/30">
          <div
            className="h-full rounded-full bg-amber-400 transition-[width] duration-100 ease-linear"
            style={{ width: `${(timeLeft / ROUND_TIME_MS) * 100}%` }}
          />
        </div>

        {/* 게임 보드 */}
        <div
          data-board
          className="relative w-full select-none overflow-hidden rounded-2xl shadow-2xl"
          style={{ aspectRatio: '1376/768', backgroundImage: 'url(/game2/mole_bg.png)', backgroundSize: 'cover' }}
        >
          {moles.map(mole => (
            <div
              key={`${round}-${mole.holeIdx}`}
              className="absolute"
              style={{
                left: `${HOLES[mole.holeIdx].x}%`,
                top: `${HOLES[mole.holeIdx].y}%`,
                width: '12.5%',
                transform: 'translate(-50%, -97%)',
              }}
            >
              {/* 용어 팻말 — 두더지 머리에 밀착 (위 구멍 줄과 겹침 방지) */}
              <div
                className={`relative z-10 mx-auto -mb-[6%] w-max max-w-[170%] rounded-lg border-2 px-2 py-0.5 text-center text-[11px] font-bold shadow transition-all duration-200 sm:text-xs ${
                  mole.state === 'correct' ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : mole.state === 'wrong' ? 'border-rose-400 bg-rose-50 text-rose-600'
                  : 'border-amber-300 bg-white/95 text-gray-800'
                } ${mole.state === 'down' ? 'opacity-0' : 'opacity-100'}`}
              >
                {mole.word.keyword}
              </div>
              {/* 두더지 (구멍 뒤에서 상승 — 하단 15%는 구멍 속에 묻힌 것처럼 클리핑) */}
              <div className="overflow-hidden">
                <button
                  type="button"
                  onClick={(e) => handleWhack(mole, e)}
                  className={`block w-full origin-bottom cursor-pointer transition-transform duration-300 ${
                    mole.state === 'down' ? 'translate-y-full' : 'translate-y-[15%]'
                  } ${mole.state === 'wrong' ? 'animate-[wiggle_0.4s_ease-in-out]' : ''} ${
                    mole.state === 'up' && phase === 'playing' ? 'hover:scale-105 active:scale-95' : ''
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={moleImg(mole.state)} alt={mole.word.keyword} className="w-full" draggable={false} />
                </button>
              </div>
            </div>
          ))}

          {/* 타격 이펙트 */}
          {hitEffect && (
            <div
              key={hitEffect.key}
              className="pointer-events-none absolute w-[12%] animate-[hitpop_0.5s_ease-out_forwards]"
              style={{ left: `${hitEffect.x}%`, top: `${hitEffect.y}%`, transform: 'translate(-50%, -70%)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/game2/star_hit.png" alt="" className="w-full" draggable={false} />
            </div>
          )}

          {/* 종료 화면 */}
          {phase === 'finished' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 backdrop-blur-[2px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/game2/mole_correct.png" alt="" className="w-24 animate-bounce" draggable={false} />
              <p className="text-3xl font-extrabold text-white drop-shadow">{score}{t('scoreSuffix')}</p>
              <p className="text-sm text-white/90">
                {t('accuracy', { correct: correctCount, total: totalRounds })}
              </p>
              <div className="mt-1 flex gap-2">
                <button
                  onClick={handleReplay}
                  className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-amber-600"
                >
                  {t('playAgain')}
                </button>
                <button
                  onClick={() => onClose(score)}
                  className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow hover:bg-gray-100"
                >
                  {t('exit')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes wiggle {
          0%, 100% { rotate: 0deg; }
          25% { rotate: -6deg; }
          75% { rotate: 6deg; }
        }
        @keyframes hitpop {
          0% { opacity: 1; scale: 0.4; }
          60% { opacity: 1; scale: 1.1; }
          100% { opacity: 0; scale: 1.3; }
        }
      `}</style>
    </div>
  )
}
