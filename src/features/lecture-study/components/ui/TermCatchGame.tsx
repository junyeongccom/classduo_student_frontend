/**
 * @file TermCatchGame.tsx
 * @description 정답 잡기 — 학생 캐릭터가 캠퍼스에서 떨어지는 용어 카드 중 정의에 맞는 카드를 받는 학습 게임
 * @module features/lecture-study/components/ui
 * @dependencies next-intl, /public/game3 에셋(히어로=서비스 캐릭터 재사용)
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface GameWord {
  keyword: string
  description: string
}

interface TermCatchGameProps {
  words: GameWord[]
  onClose: (score: number | null) => void
}

const TOTAL_ROUNDS = 8
const FALL_DURATION_MS = 5200
const SPAWN_GAP_MS = 1150
/** 캐릭터가 카드를 받는 판정 y 위치 (보드 높이 %) */
const CATCH_Y = 74
const CATCH_TOLERANCE_X = 11   // % — 캐릭터 중심 기준 좌우 허용
const HERO_SPEED = 3.2         // % per frame(키보드)

interface Card {
  id: number
  word: GameWord
  isAnswer: boolean
  x: number
  bornAt: number
  state: 'falling' | 'caught' | 'missed'
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function TermCatchGame({ words, onClose }: TermCatchGameProps) {
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
  const [hero, setHero] = useState<'boy' | 'girl'>('girl')
  const [started, setStarted] = useState(false)
  /** 카드 배열은 ref 가 권위 — setState updater 안에서 판정하면 순수성 위반으로 부작용이 유실된다 */
  const cardsRef = useRef<Card[]>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars — 렌더 트리거 전용 상태
  const [cardsVersion, setCardsVersion] = useState(0)
  void cardsVersion
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [target, setTarget] = useState<GameWord | null>(null)
  const [phase, setPhase] = useState<'playing' | 'result' | 'finished'>('playing')
  const [fx, setFx] = useState<{ kind: 'good' | 'bad'; x: number; key: number } | null>(null)

  const roundRef = useRef(0)
  const heroXRef = useRef(50)
  const heroElRef = useRef<HTMLDivElement>(null)
  /** 카드 DOM — 낙하는 리렌더 없이 style.top 직접 갱신 (React 리렌더로는 프레임이 안 나온다) */
  const cardElsRef = useRef<Map<number, HTMLDivElement>>(new Map())
  const keysRef = useRef<Set<string>>(new Set())
  const answeredRef = useRef(false)
  const idRef = useRef(0)
  const queueRef = useRef<{ word: GameWord; isAnswer: boolean }[]>([])
  const roundOrderRef = useRef<GameWord[]>([])
  const boardRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  const startRound = useCallback((roundIdx: number) => {
    const answer = roundOrderRef.current[roundIdx]
    const distractors = shuffle(pool.filter(w => w.keyword !== answer.keyword)).slice(0, 3)
    const queue = distractors.map(w => ({ word: w, isAnswer: false }))
    queue.splice(Math.floor(Math.random() * Math.min(2, queue.length + 1)), 0, { word: answer, isAnswer: true })
    queueRef.current = queue
    answeredRef.current = false
    cardsRef.current = []
    cardElsRef.current.clear()
    setCardsVersion(v => v + 1)
    setTarget(answer)
    setPhase('playing')
  }, [pool])

  useEffect(() => {
    roundOrderRef.current = shuffle(pool).slice(0, totalRounds)
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const beginGame = useCallback(() => {
    setStarted(true)
    if (totalRounds > 0) startRound(0)
  }, [totalRounds, startRound])

  useEffect(() => { roundRef.current = round }, [round])

  const advance = useCallback((fromRound: number) => {
    const timer = setTimeout(() => {
      if (fromRound + 1 >= totalRounds) setPhase('finished')
      else {
        setRound(fromRound + 1)
        startRound(fromRound + 1)
      }
    }, 1000)
    timersRef.current.push(timer)
  }, [totalRounds, startRound])

  // 카드 스폰 — 정답 카드는 라운드당 1장, 놓치면 오답 카드로 계속 채운다
  useEffect(() => {
    if (!started || phase !== 'playing') return
    const spawn = () => {
      const next = queueRef.current.shift()
      const item = next ?? { word: pool[Math.floor(Math.random() * pool.length)], isAnswer: false }
      if (!next && item.word.keyword === roundOrderRef.current[round]?.keyword) return
      idRef.current += 1
      cardsRef.current = [...cardsRef.current.slice(-7), {
        id: idRef.current,
        word: item.word,
        isAnswer: item.isAnswer,
        x: 12 + Math.random() * 76,
        bornAt: performance.now(),
        state: 'falling',
      }]
      setCardsVersion(v => v + 1)
    }
    spawn()
    const iv = setInterval(spawn, SPAWN_GAP_MS)
    return () => clearInterval(iv)
  }, [started, phase, round, pool])

  // 키보드 입력
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(e.key)) {
        e.preventDefault()
        keysRef.current.add(e.key.toLowerCase())
      }
    }
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // 마우스/터치로 캐릭터 이동
  const handlePointer = useCallback((clientX: number) => {
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.max(6, Math.min(94, ((clientX - rect.left) / rect.width) * 100))
    heroXRef.current = x
    if (heroElRef.current) heroElRef.current.style.left = `${x}%`
  }, [])

  // 게임 루프 — 캐릭터 이동 + 카드 낙하 판정
  useEffect(() => {
    if (!started) return
    let raf = 0
    const loop = () => {
      // 키보드 이동
      const keys = keysRef.current
      if (keys.size) {
        let x = heroXRef.current
        if (keys.has('arrowleft') || keys.has('a')) x -= HERO_SPEED
        if (keys.has('arrowright') || keys.has('d')) x += HERO_SPEED
        x = Math.max(6, Math.min(94, x))
        heroXRef.current = x
        if (heroElRef.current) heroElRef.current.style.left = `${x}%`
      }

      // 카드 판정 + 낙하 위치 DOM 직접 갱신 (ref 기반 — 부작용은 루프 본문에서만)
      const now = performance.now()
      let listChanged = false
      for (const card of cardsRef.current) {
        if (card.state !== 'falling') continue
        const y = ((now - card.bornAt) / FALL_DURATION_MS) * 100
        const el = cardElsRef.current.get(card.id)
        if (el) el.style.top = `${y}%`

        // 캐릭터가 카드를 받는 판정
        if (y >= CATCH_Y - 4 && y <= CATCH_Y + 10 && !answeredRef.current
            && Math.abs(card.x - heroXRef.current) <= CATCH_TOLERANCE_X) {
          card.state = 'caught'
          listChanged = true
          if (card.isAnswer) {
            answeredRef.current = true
            setScore(s => s + 100)
            setCorrectCount(c => c + 1)
            setFx({ kind: 'good', x: card.x, key: card.id })
            setPhase('result')
            advance(roundRef.current)
          } else {
            setScore(s => Math.max(0, s - 20))
            setFx({ kind: 'bad', x: card.x, key: card.id })
          }
          continue
        }

        // 화면 아래로 놓침
        if (y > 104) {
          card.state = 'missed'
          listChanged = true
          if (card.isAnswer && !answeredRef.current) {
            answeredRef.current = true
            setFx({ kind: 'bad', x: card.x, key: card.id })
            setPhase('result')
            advance(roundRef.current)
          }
        }
      }
      // 소멸 카드 정리
      const alive = cardsRef.current.filter(c => c.state === 'falling' || (now - c.bornAt) < FALL_DURATION_MS + 700)
      if (alive.length !== cardsRef.current.length) {
        cardsRef.current = alive
        listChanged = true
      }
      if (listChanged) setCardsVersion(v => v + 1)

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [started, advance])

  const handleReplay = useCallback(() => {
    clearTimers()
    roundOrderRef.current = shuffle(pool).slice(0, totalRounds)
    setScore(0); setCorrectCount(0); setRound(0)
    startRound(0)
  }, [pool, totalRounds, startRound])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
      <div className="relative w-full max-w-4xl">
        {/* HUD */}
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-white/95 px-4 py-2.5 shadow-lg">
          <span className="shrink-0 rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">
            {t('round', { current: Math.min(round + 1, totalRounds), total: totalRounds })}
          </span>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-gray-800" title={target?.description}>
            {started ? target?.description : t('catchIntro')}
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

        {/* 보드 */}
        <div
          ref={boardRef}
          className="relative w-full cursor-none select-none overflow-hidden rounded-2xl shadow-2xl"
          style={{ aspectRatio: '1376/768', backgroundImage: 'url(/game3/campus_bg.png)', backgroundSize: 'cover' }}
          onMouseMove={(e) => started && handlePointer(e.clientX)}
          onTouchMove={(e) => started && handlePointer(e.touches[0].clientX)}
        >
          {/* 떨어지는 용어 카드 */}
          {started && cardsRef.current.map(card => (
            <div
              key={card.id}
              ref={(el) => {
                if (el) cardElsRef.current.set(card.id, el)
                else cardElsRef.current.delete(card.id)
              }}
              className={`absolute w-[15%] ${card.state === 'caught' ? 'animate-[cardpop_0.4s_ease-out_forwards]' : ''} ${
                card.state === 'missed' ? 'opacity-0' : ''
              }`}
              style={{ left: `${card.x}%`, top: '0%', transform: 'translate(-50%, -50%)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/game3/term_card.png" alt="" className="w-full drop-shadow-md" draggable={false} />
              <span className="absolute inset-x-[12%] top-1/2 -translate-y-1/2 break-keep text-center text-[11px] font-extrabold leading-tight text-amber-900 sm:text-xs">
                {card.word.keyword}
              </span>
            </div>
          ))}

          {/* 이펙트 */}
          {fx && (
            <div
              key={fx.key}
              className="pointer-events-none absolute w-[13%] animate-[fxpop_0.6s_ease-out_forwards]"
              style={{ left: `${fx.x}%`, top: `${CATCH_Y}%`, transform: 'translate(-50%, -50%)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fx.kind === 'good' ? '/game3/sparkle_good.png' : '/game3/puff_bad.png'} alt="" className="w-full" draggable={false} />
            </div>
          )}

          {/* 주인공 캐릭터 — 머리 높이가 캐치 판정선(CATCH_Y)에 오도록 배치 */}
          <div
            ref={heroElRef}
            className="pointer-events-none absolute w-[9.5%]"
            style={{ left: '50%', top: `${CATCH_Y - 3}%`, transform: 'translate(-50%, 0)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/game3/hero_${hero}.png`} alt="" className="w-full drop-shadow" draggable={false} />
          </div>

          {/* 시작 화면 — 캐릭터 선택 */}
          {!started && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/45 backdrop-blur-[2px]">
              <p className="text-lg font-bold text-white drop-shadow">{t('pickHero')}</p>
              <div className="flex items-end gap-6">
                {(['girl', 'boy'] as const).map(h => (
                  <button
                    key={h}
                    onClick={() => setHero(h)}
                    className={`rounded-2xl border-4 bg-white/85 p-2 transition-all ${
                      hero === h ? 'border-indigo-400 scale-105 shadow-xl' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/game3/hero_${h}.png`} alt={h} className="h-28 w-auto" draggable={false} />
                  </button>
                ))}
              </div>
              <button
                onClick={beginGame}
                className="rounded-xl bg-indigo-500 px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-indigo-600"
              >
                {t('startGame')}
              </button>
              <p className="text-xs text-white/85">{t('catchHint')}</p>
            </div>
          )}

          {/* 종료 화면 */}
          {phase === 'finished' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 backdrop-blur-[2px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/game3/hero_${hero}.png`} alt="" className="w-24 animate-bounce" draggable={false} />
              <p className="text-3xl font-extrabold text-white drop-shadow">{score}{t('scoreSuffix')}</p>
              <p className="text-sm text-white/90">{t('accuracy', { correct: correctCount, total: totalRounds })}</p>
              <div className="mt-1 flex gap-2">
                <button onClick={handleReplay} className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-600">
                  {t('playAgain')}
                </button>
                <button onClick={() => onClose(score)} className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow hover:bg-gray-100">
                  {t('exit')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes cardpop {
          0% { opacity: 1; scale: 1; }
          100% { opacity: 0; scale: 1.4; }
        }
        @keyframes fxpop {
          0% { opacity: 1; scale: 0.5; }
          70% { opacity: 1; scale: 1.15; }
          100% { opacity: 0; scale: 1.3; }
        }
      `}</style>
    </div>
  )
}
