/**
 * @file BalloonPopGame.tsx
 * @description 풍선 팝 — 하늘로 떠오르는 용어 풍선 중 정의에 맞는 풍선을 터뜨리는 게임 (생성 에셋 기반)
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

interface BalloonPopGameProps {
  words: GameWord[]
  onClose: (score: number | null) => void
}

const TOTAL_ROUNDS = 8
const SPAWN_INTERVAL_MS = 1500
const RISE_DURATION_MS = 8000
/** 풍선 색 변주 (빨간 풍선 원본 → hue-rotate) */
const HUES = [0, 45, 130, 200, 260, 310]

interface Balloon {
  id: number
  word: GameWord
  isAnswer: boolean
  x: number          // left %
  hue: number
  duration: number   // ms
  state: 'rising' | 'popped' | 'wrongPop'
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function BalloonPopGame({ words, onClose }: BalloonPopGameProps) {
  const t = useTranslations('lectureStudy.game.play')

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
  const [balloons, setBalloons] = useState<Balloon[]>([])
  const [target, setTarget] = useState<GameWord | null>(null)
  const [phase, setPhase] = useState<'playing' | 'result' | 'finished'>('playing')
  const [penguinMood, setPenguinMood] = useState<'cheer' | 'sad' | null>(null)
  const answeredRef = useRef(false)
  const idRef = useRef(0)
  const spawnQueueRef = useRef<{ word: GameWord; isAnswer: boolean }[]>([])
  const roundOrderRef = useRef<GameWord[]>([])
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  const startRound = useCallback((roundIdx: number) => {
    const answer = roundOrderRef.current[roundIdx]
    const distractors = shuffle(pool.filter(w => w.keyword !== answer.keyword)).slice(0, 4)
    // 정답이 초반(1~3번째)에 반드시 뜨도록 스폰 큐 구성
    const queue = distractors.map(w => ({ word: w, isAnswer: false }))
    queue.splice(Math.floor(Math.random() * Math.min(3, queue.length + 1)), 0,
      { word: answer, isAnswer: true })
    spawnQueueRef.current = queue
    answeredRef.current = false
    setBalloons([])
    setTarget(answer)
    setPenguinMood(null)
    setPhase('playing')
  }, [pool])

  useEffect(() => {
    roundOrderRef.current = shuffle(pool).slice(0, totalRounds)
    if (totalRounds > 0) startRound(0)
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const advance = useCallback((fromRound: number) => {
    const timer = setTimeout(() => {
      if (fromRound + 1 >= totalRounds) {
        setPhase('finished')
      } else {
        setRound(fromRound + 1)
        startRound(fromRound + 1)
      }
    }, 1200)
    timersRef.current.push(timer)
  }, [totalRounds, startRound])

  // 스폰 루프 — 큐 소진 후에도 오답 풍선을 계속 보충 (정답을 못 잡은 동안 하늘이 비지 않게)
  useEffect(() => {
    if (phase !== 'playing') return
    const spawn = () => {
      const next = spawnQueueRef.current.shift()
      const item = next ?? {
        word: pool[Math.floor(Math.random() * pool.length)],
        isAnswer: false,
      }
      // 보충 스폰이 우연히 정답 단어면 스킵 (정답 풍선은 큐의 1개뿐이어야 판정이 명확)
      if (!next && item.word.keyword === roundOrderRef.current[round]?.keyword) return
      idRef.current += 1
      setBalloons(prev => [...prev.slice(-11), {
        id: idRef.current,
        word: item.word,
        isAnswer: item.isAnswer,
        x: 8 + Math.random() * 74,
        hue: HUES[idRef.current % HUES.length],
        duration: RISE_DURATION_MS + Math.random() * 2500,
        state: 'rising',
      }])
    }
    spawn()
    const iv = setInterval(spawn, SPAWN_INTERVAL_MS)
    return () => clearInterval(iv)
  }, [phase, round, pool])

  /** 풍선이 화면 위로 탈출 (rise 애니메이션 종료) */
  const handleEscape = useCallback((balloon: Balloon) => {
    setBalloons(prev => prev.filter(b => b.id !== balloon.id))
    if (balloon.isAnswer && !answeredRef.current && phase === 'playing') {
      // 정답 풍선을 놓침 — 라운드 실패
      answeredRef.current = true
      setPenguinMood('sad')
      setPhase('result')
      advance(round)
    }
  }, [phase, round, advance])

  const handlePop = useCallback((balloon: Balloon) => {
    if (phase !== 'playing' || answeredRef.current || balloon.state !== 'rising') return
    if (balloon.isAnswer) {
      answeredRef.current = true
      setScore(s => s + 100)
      setCorrectCount(c => c + 1)
      setPenguinMood('cheer')
      setBalloons(prev => prev.map(b => b.id === balloon.id ? { ...b, state: 'popped' } : b))
      setPhase('result')
      advance(round)
    } else {
      setScore(s => Math.max(0, s - 20))
      setPenguinMood('sad')
      setBalloons(prev => prev.map(b => b.id === balloon.id ? { ...b, state: 'wrongPop' } : b))
      const timer = setTimeout(() => {
        setBalloons(prev => prev.filter(b => b.id !== balloon.id))
        setPenguinMood(prev => (prev === 'sad' ? null : prev))
      }, 500)
      timersRef.current.push(timer)
    }
  }, [phase, round, advance])

  const handleReplay = useCallback(() => {
    clearTimers()
    roundOrderRef.current = shuffle(pool).slice(0, totalRounds)
    setScore(0)
    setCorrectCount(0)
    setRound(0)
    startRound(0)
  }, [pool, totalRounds, startRound])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
      <div className="relative w-full max-w-4xl">
        {/* 상단 HUD */}
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-white/95 px-4 py-2.5 shadow-lg">
          <span className="shrink-0 rounded-lg bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700">
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

        {/* 게임 보드 */}
        <div
          className="relative w-full select-none overflow-hidden rounded-2xl shadow-2xl"
          style={{ aspectRatio: '1376/768', backgroundImage: 'url(/game2/balloon_bg.png)', backgroundSize: 'cover' }}
        >
          {balloons.map(balloon => (
            <div
              key={balloon.id}
              className="absolute bottom-0 w-[11%]"
              style={{
                left: `${balloon.x}%`,
                animation: balloon.state === 'rising'
                  ? `rise ${balloon.duration}ms linear forwards`
                  : undefined,
              }}
              onAnimationEnd={() => balloon.state === 'rising' && handleEscape(balloon)}
            >
              {balloon.state === 'popped' || balloon.state === 'wrongPop' ? (
                <div className="animate-[fadepop_0.5s_ease-out_forwards]" style={{ filter: `hue-rotate(${balloon.hue}deg)` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/game2/balloon_pop.png" alt="" className="w-full" draggable={false} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePop(balloon)}
                  className="block w-full animate-[sway_2.4s_ease-in-out_infinite_alternate] cursor-pointer transition-transform hover:scale-110 active:scale-95"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/game2/balloon.png" alt="" className="w-full" draggable={false}
                       style={{ filter: `hue-rotate(${balloon.hue}deg)` }} />
                  <span className="absolute left-1/2 top-[38%] w-[125%] -translate-x-1/2 -translate-y-1/2 break-keep text-center text-[11px] font-extrabold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)] sm:text-xs">
                    {balloon.word.keyword}
                  </span>
                </button>
              )}
            </div>
          ))}

          {/* 펭귄 리액션 */}
          <div className="pointer-events-none absolute bottom-1 right-2 w-[13%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={penguinMood === 'sad' ? '/game2/penguin_sad.png' : '/game2/penguin_cheer.png'}
              alt=""
              draggable={false}
              className={`w-full transition-transform duration-300 ${
                penguinMood === 'cheer' ? 'animate-bounce' : penguinMood === 'sad' ? 'scale-95 grayscale-[0.2]' : ''
              }`}
            />
          </div>

          {/* 종료 화면 */}
          {phase === 'finished' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 backdrop-blur-[2px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/game2/penguin_cheer.png" alt="" className="w-24 animate-bounce" draggable={false} />
              <p className="text-3xl font-extrabold text-white drop-shadow">{score}{t('scoreSuffix')}</p>
              <p className="text-sm text-white/90">
                {t('accuracy', { correct: correctCount, total: totalRounds })}
              </p>
              <div className="mt-1 flex gap-2">
                <button
                  onClick={handleReplay}
                  className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-sky-600"
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
        @keyframes rise {
          /* 보드 높이(≈768) 대비 풍선 높이 비율상 -480%면 상단 밖까지 확실히 탈출 */
          from { transform: translateY(12%); }
          to { transform: translateY(-480%); }
        }
        @keyframes sway {
          from { rotate: -4deg; }
          to { rotate: 4deg; }
        }
        @keyframes fadepop {
          0% { opacity: 1; scale: 0.9; }
          100% { opacity: 0; scale: 1.35; }
        }
      `}</style>
    </div>
  )
}
