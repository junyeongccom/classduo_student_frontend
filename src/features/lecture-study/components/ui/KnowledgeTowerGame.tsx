/**
 * @file KnowledgeTowerGame.tsx
 * @description 지식 타워 — 설명에 맞는 용어 블록만 쌓아 탑을 높이 올리는 스태킹 학습 게임
 * @module features/lecture-study/components/ui
 * @dependencies next-intl, /public/game8 에셋(히어로=서비스 캐릭터)
 *
 * 유행 포맷(스태킹)을 학습에 접목: 좌우로 흔들리는 블록 후보 중 정의에 맞는 용어 블록을 골라 쌓는다.
 * 오답을 쌓으면 균열 블록이 되어 탑이 흔들리고(HP 손실), 정답만 쌓으면 왕관까지 올라간다.
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X, Heart } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface GameWord {
  keyword: string
  description: string
}

interface KnowledgeTowerGameProps {
  words: GameWord[]
  onClose: (score: number | null) => void
}

const TOTAL_FLOORS = 8
const CHOICES = 3
const START_HP = 3
/** 블록 후보가 좌우로 흔들리는 주기 */
const SWAY_MS = 2600

interface Floor {
  word: GameWord
  ok: boolean
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function KnowledgeTowerGame({ words, onClose }: KnowledgeTowerGameProps) {
  const t = useTranslations('lectureStudy.game.play')

  const pool = useMemo(() => {
    const seen = new Set<string>()
    return words.filter(w => {
      if (!w.keyword || !w.description || seen.has(w.keyword)) return false
      seen.add(w.keyword)
      return true
    })
  }, [words])

  const totalFloors = Math.min(TOTAL_FLOORS, pool.length)
  const [hero, setHero] = useState<'boy' | 'girl'>('girl')
  const [started, setStarted] = useState(false)
  const [floors, setFloors] = useState<Floor[]>([])
  const [choices, setChoices] = useState<GameWord[]>([])
  const [target, setTarget] = useState<GameWord | null>(null)
  const [hp, setHp] = useState(START_HP)
  const [score, setScore] = useState(0)
  const [phase, setPhase] = useState<'play' | 'finished'>('play')
  const [shake, setShake] = useState(false)

  const stepRef = useRef(0)
  const orderRef = useRef<GameWord[]>([])
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  const startStep = useCallback((idx: number) => {
    const answer = orderRef.current[idx]
    if (!answer) return
    const distractors = shuffle(pool.filter(w => w.keyword !== answer.keyword)).slice(0, CHOICES - 1)
    stepRef.current = idx
    setTarget(answer)
    setChoices(shuffle([answer, ...distractors]))
  }, [pool])

  useEffect(() => {
    orderRef.current = shuffle(pool).slice(0, totalFloors)
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const beginGame = useCallback(() => {
    setStarted(true)
    startStep(0)
  }, [startStep])

  const place = useCallback((word: GameWord) => {
    if (phase !== 'play') return
    const answer = orderRef.current[stepRef.current]
    const ok = word.keyword === answer?.keyword
    setFloors(prev => [...prev, { word, ok }])

    if (ok) {
      setScore(s => s + 100 + floors.length * 10)   // 높이 보너스
    } else {
      setScore(s => Math.max(0, s - 20))
      setHp(h => Math.max(0, h - 1))
      setShake(true)
      const st = setTimeout(() => setShake(false), 500)
      timersRef.current.push(st)
    }

    const nextIdx = stepRef.current + 1
    const timer = setTimeout(() => {
      if (nextIdx >= totalFloors) setPhase('finished')
      else startStep(nextIdx)
    }, 620)
    timersRef.current.push(timer)
  }, [phase, floors.length, totalFloors, startStep])

  // HP 소진 → 종료 (예약 타이머가 상태를 덮지 않게 함께 정리)
  useEffect(() => {
    if (started && hp <= 0) {
      clearTimers()
      setPhase('finished')
    }
  }, [hp, started])

  const okCount = floors.filter(f => f.ok).length
  const survived = hp > 0 && okCount >= Math.ceil(totalFloors * 0.6)

  const handleReplay = useCallback(() => {
    clearTimers()
    orderRef.current = shuffle(pool).slice(0, totalFloors)
    setFloors([]); setHp(START_HP); setScore(0); setPhase('play')
    startStep(0)
  }, [pool, totalFloors, startStep])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
      <div className="relative w-full max-w-4xl">
        {/* HUD */}
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-white/95 px-4 py-2.5 shadow-lg">
          <span className="shrink-0 rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700">
            {t('floor', { current: Math.min(floors.length + 1, totalFloors), total: totalFloors })}
          </span>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-gray-800" title={target?.description}>
            {started ? target?.description : t('towerIntro')}
          </p>
          <span className="flex shrink-0 items-center gap-0.5">
            {Array.from({ length: START_HP }).map((_, i) => (
              <Heart key={i} className={`h-3.5 w-3.5 ${i < hp ? 'fill-rose-500 text-rose-500' : 'text-gray-300'}`} />
            ))}
          </span>
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
          className="relative w-full select-none overflow-hidden rounded-2xl shadow-2xl"
          style={{ aspectRatio: '1344/768', backgroundImage: 'url(/game8/tower_bg.png)', backgroundSize: 'cover' }}
        >
          {/* 쌓인 탑 (아래에서 위로) */}
          <div className={`absolute bottom-[6%] left-1/2 flex w-[34%] -translate-x-1/2 flex-col-reverse items-center ${shake ? 'animate-[towershake_0.5s_ease-in-out]' : ''}`}>
            {floors.map((f, i) => (
              <div key={i} className="relative w-full animate-[dropin_0.4s_ease-out]" style={{ marginBottom: i === 0 ? 0 : '-1%' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.ok ? '/game8/block_good.png' : '/game8/block_bad.png'} alt="" className="w-full" draggable={false} />
                <span className={`absolute inset-x-[8%] top-1/2 -translate-y-1/2 truncate text-center text-[11px] font-extrabold sm:text-sm ${
                  f.ok ? 'text-amber-900' : 'text-gray-100'
                }`}>
                  {f.word.keyword}
                </span>
              </div>
            ))}
            {/* 완성 왕관 */}
            {phase === 'finished' && survived && (
              <div className="absolute -top-[14%] w-[38%]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/game8/crown_top.png" alt="" className="w-full animate-bounce" draggable={false} />
              </div>
            )}
          </div>

          {/* 주인공 (탑 옆에서 지켜본다) */}
          {started && (
            <div className="absolute bottom-[5%] left-[12%] w-[10%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/game8/hero_${hero}.png`} alt="" className="w-full drop-shadow" draggable={false} />
            </div>
          )}

          {/* 흔들리는 블록 후보 */}
          {started && phase === 'play' && (
            <div className="absolute inset-x-[6%] top-[8%] flex justify-center gap-[3%]">
              {choices.map((w, i) => (
                <button
                  key={`${w.keyword}-${i}`}
                  type="button"
                  onClick={() => place(w)}
                  className="relative w-[26%] cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  style={{ animation: `sway ${SWAY_MS}ms ease-in-out ${i * 240}ms infinite alternate` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/game8/block_good.png" alt="" className="w-full drop-shadow-lg" draggable={false} />
                  <span className="absolute inset-x-[8%] top-1/2 -translate-y-1/2 break-keep text-center text-[11px] font-extrabold leading-tight text-amber-900 sm:text-sm">
                    {w.keyword}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* 시작 화면 */}
          {!started && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/45 backdrop-blur-[2px]">
              <p className="text-lg font-bold text-white drop-shadow">{t('pickHero')}</p>
              <div className="flex items-end gap-6">
                {(['girl', 'boy'] as const).map(h => (
                  <button
                    key={h}
                    onClick={() => setHero(h)}
                    className={`rounded-2xl border-4 bg-white/85 p-2 transition-all ${
                      hero === h ? 'border-orange-400 scale-105 shadow-xl' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/game8/hero_${h}.png`} alt={h} className="h-28 w-auto" draggable={false} />
                  </button>
                ))}
              </div>
              <button onClick={beginGame} className="rounded-xl bg-orange-500 px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-orange-600">
                {t('startGame')}
              </button>
              <p className="text-xs text-white/85">{t('towerHint')}</p>
            </div>
          )}

          {/* 종료 화면 */}
          {phase === 'finished' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-black/60 backdrop-blur-[2px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={survived ? '/game8/crown_top.png' : '/game8/block_bad.png'} alt="" className="w-20 animate-bounce" draggable={false} />
              <p className="text-xl font-extrabold text-white drop-shadow">
                {survived ? t('towerWin') : t('towerLose')}
              </p>
              <p className="text-3xl font-extrabold text-white drop-shadow">{score}{t('scoreSuffix')}</p>
              <p className="text-sm text-white/90">{t('accuracy', { correct: okCount, total: totalFloors })}</p>
              <div className="mt-1 flex gap-2">
                <button onClick={handleReplay} className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-orange-600">
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
        @keyframes sway {
          from { transform: translateX(-14%) rotate(-2deg); }
          to { transform: translateX(14%) rotate(2deg); }
        }
        @keyframes dropin {
          0% { opacity: 0; transform: translateY(-220%); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes towershake {
          0%, 100% { transform: translateX(-50%) rotate(0deg); }
          25% { transform: translateX(-50%) rotate(-2.5deg); }
          75% { transform: translateX(-50%) rotate(2.5deg); }
        }
      `}</style>
    </div>
  )
}
