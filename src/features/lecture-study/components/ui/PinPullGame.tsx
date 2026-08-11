/**
 * @file PinPullGame.tsx
 * @description 지식 방출 — 핀을 순서대로 뽑아 정답 용어 구슬만 비커로 흘려보내는 퍼즐 학습 게임
 * @module features/lecture-study/components/ui
 * @dependencies next-intl, /public/game6 에셋
 *
 * 유행 포맷(pull-the-pin)을 학습에 접목: 각 핀이 막고 있는 구슬에 용어가 적혀 있고,
 * 설명에 맞는 용어 구슬만 비커(정답통)로 보내야 한다. 오답 구슬을 흘리면 감점 → "순서 판단" 퍼즐.
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface GameWord {
  keyword: string
  description: string
}

interface PinPullGameProps {
  words: GameWord[]
  onClose: (score: number | null) => void
}

const TOTAL_STAGES = 6
/** 스테이지당 핀(=구슬) 수 */
const PINS_PER_STAGE = 4
const DROP_MS = 900

interface PinSlot {
  id: number
  word: GameWord
  isAnswer: boolean
  /** 구슬 세로 위치 (보드 %) — 위에서 아래로 쌓임 */
  y: number
  state: 'held' | 'dropping' | 'landed'
  /** 착지한 통 (정답통/오답통) */
  landedIn?: 'good' | 'bad'
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function PinPullGame({ words, onClose }: PinPullGameProps) {
  const t = useTranslations('lectureStudy.game.play')

  const pool = useMemo(() => {
    const seen = new Set<string>()
    return words.filter(w => {
      if (!w.keyword || !w.description || seen.has(w.keyword)) return false
      seen.add(w.keyword)
      return true
    })
  }, [words])

  const totalStages = Math.min(TOTAL_STAGES, pool.length)
  const [stage, setStage] = useState(0)
  const [pins, setPins] = useState<PinSlot[]>([])
  const [target, setTarget] = useState<GameWord | null>(null)
  const [score, setScore] = useState(0)
  const [clearedStages, setClearedStages] = useState(0)
  const [phase, setPhase] = useState<'play' | 'stageEnd' | 'finished'>('play')
  const [toast, setToast] = useState<{ kind: 'good' | 'bad'; text: string } | null>(null)
  const idRef = useRef(0)
  const stageRef = useRef(0)
  const orderRef = useRef<GameWord[]>([])
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  const startStage = useCallback((idx: number) => {
    const answer = orderRef.current[idx]
    const distractors = shuffle(pool.filter(w => w.keyword !== answer.keyword)).slice(0, PINS_PER_STAGE - 1)
    const arranged = shuffle([answer, ...distractors])
    stageRef.current = idx
    setStage(idx)
    setTarget(answer)
    setPins(arranged.map((w, i) => {
      idRef.current += 1
      return {
        id: idRef.current,
        word: w,
        isAnswer: w.keyword === answer.keyword,
        y: 16 + i * 15,
        state: 'held' as const,
      }
    }))
    setPhase('play')
  }, [pool])

  useEffect(() => {
    orderRef.current = shuffle(pool).slice(0, totalStages)
    if (totalStages > 0) startStage(0)
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 핀을 뽑으면 그 구슬이 떨어져 정답통/오답통으로 들어간다 */
  const pullPin = useCallback((pinId: number) => {
    if (phase !== 'play') return
    setPins(prev => {
      const pin = prev.find(p => p.id === pinId)
      if (!pin || pin.state !== 'held') return prev
      return prev.map(p => (p.id === pinId ? { ...p, state: 'dropping' as const } : p))
    })

    const timer = setTimeout(() => {
      setPins(prev => {
        const pin = prev.find(p => p.id === pinId)
        if (!pin) return prev
        const landedIn: 'good' | 'bad' = pin.isAnswer ? 'good' : 'bad'
        return prev.map(p => (p.id === pinId ? { ...p, state: 'landed' as const, landedIn } : p))
      })
      setPins(prev => {
        const pin = prev.find(p => p.id === pinId)
        if (pin?.isAnswer) {
          setScore(s => s + 100)
          setClearedStages(c => c + 1)
          setToast({ kind: 'good', text: pin.word.keyword })
          setPhase('stageEnd')
          const nt = setTimeout(() => {
            setToast(null)
            const next = stageRef.current + 1
            if (next >= totalStages) setPhase('finished')
            else startStage(next)
          }, 1100)
          timersRef.current.push(nt)
        } else if (pin) {
          setScore(s => Math.max(0, s - 25))
          setToast({ kind: 'bad', text: pin.word.keyword })
          const nt = setTimeout(() => setToast(null), 900)
          timersRef.current.push(nt)
        }
        return prev
      })
    }, DROP_MS)
    timersRef.current.push(timer)
  }, [phase, totalStages, startStage])

  const handleReplay = useCallback(() => {
    clearTimers()
    orderRef.current = shuffle(pool).slice(0, totalStages)
    setScore(0)
    setClearedStages(0)
    startStage(0)
  }, [pool, totalStages, startStage])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
      <div className="relative w-full max-w-4xl">
        {/* HUD */}
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-white/95 px-4 py-2.5 shadow-lg">
          <span className="shrink-0 rounded-lg bg-lime-100 px-2.5 py-1 text-xs font-bold text-lime-700">
            {t('round', { current: Math.min(stage + 1, totalStages), total: totalStages })}
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

        {/* 보드 */}
        <div
          className="relative w-full select-none overflow-hidden rounded-2xl shadow-2xl"
          style={{ aspectRatio: '1344/768', backgroundImage: 'url(/game6/pin_bg.png)', backgroundSize: 'cover' }}
        >
          {/* 낙하 튜브 안내선 */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[15%] -translate-x-1/2 rounded-b-3xl border-x-[3px] border-dashed border-sky-300/60 bg-white/15" />

          {/* 핀 + 구슬 */}
          {pins.map(pin => {
            const dropping = pin.state !== 'held'
            const landedGood = pin.landedIn === 'good'
            return (
              <div key={pin.id} className="absolute left-1/2 w-[13%] -translate-x-1/2" style={{ top: `${pin.y}%` }}>
                {/* 구슬 (핀에 걸려 있다가 낙하) */}
                <div
                  className="relative transition-all"
                  style={{
                    transitionDuration: `${DROP_MS}ms`,
                    transitionTimingFunction: 'cubic-bezier(.4,.05,.6,1)',
                    transform: dropping
                      ? `translate(${landedGood ? '-160%' : pin.landedIn === 'bad' ? '160%' : '0'}, ${88 - pin.y}%)`
                      : 'none',
                    opacity: pin.state === 'landed' ? 0.55 : 1,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/game6/knowledge_ball.png" alt="" className="w-full" draggable={false} />
                  <span className="absolute inset-x-[-18%] top-1/2 -translate-y-1/2 break-keep text-center text-[10px] font-extrabold leading-tight text-amber-900 sm:text-xs">
                    {pin.word.keyword}
                  </span>
                </div>

                {/* 핀 (클릭하면 뽑힘) */}
                {pin.state === 'held' && (
                  <button
                    type="button"
                    onClick={() => pullPin(pin.id)}
                    className="group absolute left-[86%] top-1/2 w-[130%] -translate-y-1/2 cursor-pointer transition-transform hover:translate-x-2"
                    aria-label={`pull pin ${pin.word.keyword}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/game6/pin_bolt.png" alt="" className="w-full drop-shadow" draggable={false} />
                  </button>
                )}
              </div>
            )
          })}

          {/* 정답통 / 오답통 */}
          <div className="absolute bottom-[3%] left-[26%] w-[13%] -translate-x-1/2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/game6/beaker_good.png" alt="" className="w-full" draggable={false} />
            <p className="mt-0.5 text-center text-[10px] font-bold text-emerald-700 sm:text-xs">{t('pinGoodBin')}</p>
          </div>
          <div className="absolute bottom-[3%] left-[74%] w-[13%] -translate-x-1/2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/game6/beaker_bad.png" alt="" className="w-full" draggable={false} />
            <p className="mt-0.5 text-center text-[10px] font-bold text-gray-600 sm:text-xs">{t('pinBadBin')}</p>
          </div>

          {/* 토스트 */}
          {toast && (
            <div className={`absolute left-1/2 top-[6%] -translate-x-1/2 rounded-full px-4 py-1.5 text-sm font-bold shadow-lg ${
              toast.kind === 'good' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
            }`}>
              {toast.kind === 'good' ? t('pinCorrect', { word: toast.text }) : t('pinWrong', { word: toast.text })}
            </div>
          )}

          {/* 종료 화면 */}
          {phase === 'finished' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-[2px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/game6/beaker_good.png" alt="" className="w-20 animate-bounce" draggable={false} />
              <p className="text-3xl font-extrabold text-white drop-shadow">{score}{t('scoreSuffix')}</p>
              <p className="text-sm text-white/90">{t('accuracy', { correct: clearedStages, total: totalStages })}</p>
              <div className="mt-1 flex gap-2">
                <button onClick={handleReplay} className="rounded-xl bg-lime-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-lime-600">
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
    </div>
  )
}
