/**
 * @file KnowledgeGateGame.tsx
 * @description 지식의 문 — 러너가 정답 용어 게이트를 골라 통과하며 동료를 모으고 마지막에 오개념 몬스터를 물리치는 학습 게임
 * @module features/lecture-study/components/ui
 * @dependencies next-intl, /public/game4 에셋(히어로=서비스 캐릭터)
 *
 * 유행 포맷(멀티플라이어 게이트 러너 + 군단 스태킹)을 학습에 접목: 정답 게이트를 통과할 때만 동료가 늘고,
 * 최종 보스 판정은 모은 동료 수로 결정된다 → 정답률이 곧 전투력.
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface GameWord {
  keyword: string
  description: string
}

interface KnowledgeGateGameProps {
  words: GameWord[]
  onClose: (score: number | null) => void
}

const TOTAL_GATES = 8
/** 게이트가 화면 아래(플레이어)까지 다가오는 시간 */
const APPROACH_MS = 4200
/** 통과 판정 진행도 (0~1) */
const PASS_AT = 0.86
const ALLY_PER_CORRECT = 2

interface GateSet {
  left: GameWord
  right: GameWord
  answerSide: 'left' | 'right'
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function KnowledgeGateGame({ words, onClose }: KnowledgeGateGameProps) {
  const t = useTranslations('lectureStudy.game.play')

  const pool = useMemo(() => {
    const seen = new Set<string>()
    return words.filter(w => {
      if (!w.keyword || !w.description || seen.has(w.keyword)) return false
      seen.add(w.keyword)
      return true
    })
  }, [words])

  const totalGates = Math.min(TOTAL_GATES, pool.length)
  const [hero, setHero] = useState<'boy' | 'girl'>('boy')
  const [started, setStarted] = useState(false)
  const [gateIdx, setGateIdx] = useState(0)
  const [gate, setGate] = useState<GateSet | null>(null)
  const [allies, setAllies] = useState(1)
  const [correctCount, setCorrectCount] = useState(0)
  const [lane, setLane] = useState<'left' | 'right'>('left')
  /** 게이트 접근 진행도 0~1 — DOM 직접 갱신 */
  const [phase, setPhase] = useState<'run' | 'judge' | 'boss' | 'finished'>('run')
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null)
  const [bossResult, setBossResult] = useState<'win' | 'lose' | null>(null)

  const laneRef = useRef<'left' | 'right'>('left')
  const gateElRef = useRef<HTMLDivElement>(null)
  const startedAtRef = useRef(0)
  const judgedRef = useRef(false)
  const gateIdxRef = useRef(0)
  const orderRef = useRef<GateSet[]>([])
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  // 게이트 셋 구성 — 정답 1 + 오답 1
  useEffect(() => {
    const picks = shuffle(pool).slice(0, totalGates)
    orderRef.current = picks.map(answer => {
      const wrong = shuffle(pool.filter(w => w.keyword !== answer.keyword))[0] ?? answer
      const answerSide: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right'
      return {
        left: answerSide === 'left' ? answer : wrong,
        right: answerSide === 'right' ? answer : wrong,
        answerSide,
      }
    })
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startGate = useCallback((idx: number) => {
    judgedRef.current = false
    gateIdxRef.current = idx
    setGate(orderRef.current[idx])
    setGateIdx(idx)
    setPhase('run')
    startedAtRef.current = performance.now()
  }, [])

  const beginGame = useCallback(() => {
    setStarted(true)
    if (totalGates > 0) startGate(0)
  }, [totalGates, startGate])

  // 레인 전환 (키보드/클릭)
  const switchLane = useCallback((side: 'left' | 'right') => {
    laneRef.current = side
    setLane(side)
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) { e.preventDefault(); switchLane('left') }
      if (['ArrowRight', 'd', 'D'].includes(e.key)) { e.preventDefault(); switchLane('right') }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [switchLane])

  // 게이트 접근 루프 — 스케일/위치를 DOM 직접 갱신하고 PASS_AT 에서 판정
  useEffect(() => {
    if (!started || phase !== 'run' || !gate) return
    let raf = 0
    const loop = () => {
      const p = Math.min(1, (performance.now() - startedAtRef.current) / APPROACH_MS)
      const el = gateElRef.current
      if (el) {
        // 원경(작고 위) → 근경(크고 아래)
        el.style.transform = `translate(-50%, -50%) scale(${0.32 + p * 0.9})`
        el.style.top = `${32 + p * 34}%`
        el.style.opacity = String(Math.min(1, 0.35 + p * 2))
      }
      if (p >= PASS_AT && !judgedRef.current) {
        judgedRef.current = true
        const isCorrect = laneRef.current === gate.answerSide
        setFlash(isCorrect ? 'good' : 'bad')
        if (isCorrect) {
          setAllies(a => a + ALLY_PER_CORRECT)
          setCorrectCount(c => c + 1)
        } else {
          setAllies(a => Math.max(1, a - 1))
        }
        setPhase('judge')
        const timer = setTimeout(() => {
          setFlash(null)
          const next = gateIdxRef.current + 1
          if (next >= totalGates) setPhase('boss')
          else startGate(next)
        }, 850)
        timersRef.current.push(timer)
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [started, phase, gate, totalGates, startGate])

  // 보스전 — 모은 동료 수로 판정
  useEffect(() => {
    if (phase !== 'boss') return
    const needed = Math.ceil(totalGates * ALLY_PER_CORRECT * 0.5)
    const timer = setTimeout(() => {
      setBossResult(allies >= needed ? 'win' : 'lose')
      setPhase('finished')
    }, 1800)
    timersRef.current.push(timer)
    return () => clearTimeout(timer)
  }, [phase, allies, totalGates])

  const score = correctCount * 100 + (bossResult === 'win' ? 200 : 0)

  const handleReplay = useCallback(() => {
    clearTimers()
    const picks = shuffle(pool).slice(0, totalGates)
    orderRef.current = picks.map(answer => {
      const wrong = shuffle(pool.filter(w => w.keyword !== answer.keyword))[0] ?? answer
      const answerSide: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right'
      return { left: answerSide === 'left' ? answer : wrong, right: answerSide === 'right' ? answer : wrong, answerSide }
    })
    setAllies(1); setCorrectCount(0); setBossResult(null)
    startGate(0)
  }, [pool, totalGates, startGate])

  /** 동료 배치 좌표 (주인공 뒤로 반원 배열) */
  const allyPositions = useMemo(() => {
    const n = Math.min(allies - 1, 10)
    return Array.from({ length: Math.max(0, n) }, (_, i) => ({
      dx: (i % 2 === 0 ? -1 : 1) * (6 + Math.floor(i / 2) * 5),
      dy: 2 + Math.floor(i / 2) * 2.2,
      scale: 0.78 - Math.floor(i / 2) * 0.06,
    }))
  }, [allies])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
      <div className="relative w-full max-w-4xl">
        {/* HUD */}
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-white/95 px-4 py-2.5 shadow-lg">
          <span className="shrink-0 rounded-lg bg-cyan-100 px-2.5 py-1 text-xs font-bold text-cyan-700">
            {t('round', { current: Math.min(gateIdx + 1, totalGates), total: totalGates })}
          </span>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-gray-800"
             title={gate ? (gate.answerSide === 'left' ? gate.left : gate.right).description : ''}>
            {started
              ? (phase === 'boss' ? t('bossIncoming') : gate && (gate.answerSide === 'left' ? gate.left : gate.right).description)
              : t('gateIntro')}
          </p>
          <span className="shrink-0 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
            {t('allies', { n: allies })}
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
          style={{ aspectRatio: '1344/768', backgroundImage: 'url(/game4/run_road_bg.png)', backgroundSize: 'cover' }}
        >
          {/* 다가오는 게이트 2개 */}
          {started && gate && phase !== 'boss' && (
            <div
              ref={gateElRef}
              className="absolute left-1/2 z-0 flex gap-[4%]"
              style={{ top: '32%', transform: 'translate(-50%, -50%) scale(0.32)', width: '48%' }}
            >
              {(['left', 'right'] as const).map(side => {
                const word = side === 'left' ? gate.left : gate.right
                const isChosen = lane === side
                const revealed = phase === 'judge'
                const isAnswer = gate.answerSide === side
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => phase === 'run' && switchLane(side)}
                    className={`relative flex-1 transition-transform ${isChosen ? 'scale-105' : 'opacity-90'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/game4/gate_arch.png" alt="" className="w-full" draggable={false} />
                    <span className={`absolute inset-x-[14%] top-[46%] -translate-y-1/2 break-keep text-center text-[13px] font-extrabold leading-tight sm:text-base ${
                      revealed ? (isAnswer ? 'text-emerald-600' : 'text-rose-500') : 'text-slate-700'
                    }`}>
                      {word.keyword}
                    </span>
                    {isChosen && (
                      <span className="absolute inset-x-0 -bottom-[6%] mx-auto w-max rounded-full bg-cyan-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
                        {t('gateChosen')}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* 보스 */}
          {started && phase === 'boss' && (
            <div className="absolute left-1/2 top-[38%] w-[24%] -translate-x-1/2 -translate-y-1/2 animate-bounce">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/game4/boss_bug.png" alt="" className="w-full" draggable={false} />
            </div>
          )}

          {/* 주인공 + 동료 군단 */}
          {started && (
            <div
              className="absolute bottom-[3%] z-20 w-[11.5%] transition-[left] duration-200 ease-out"
              style={{ left: lane === 'left' ? '42%' : '58%', transform: 'translateX(-50%)' }}
            >
              {allyPositions.map((pos, i) => (
                <div
                  key={i}
                  className="absolute bottom-0 w-full opacity-90"
                  style={{ left: `${pos.dx}%`, bottom: `${pos.dy}%`, scale: pos.scale, zIndex: 0 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/game4/hero_${i % 2 === 0 ? 'girl' : 'boy'}.png`} alt="" className="w-full" draggable={false} />
                </div>
              ))}
              <div className="relative z-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/game4/hero_${hero}.png`} alt="" className="w-full drop-shadow" draggable={false} />
              </div>
            </div>
          )}

          {/* 판정 플래시 */}
          {flash && (
            <div className={`pointer-events-none absolute inset-0 ${flash === 'good' ? 'bg-emerald-300/25' : 'bg-rose-400/25'}`} />
          )}

          {/* 좌우 조작 힌트 영역 */}
          {started && phase === 'run' && (
            <>
              <button onClick={() => switchLane('left')} className="absolute inset-y-0 left-0 w-1/2 cursor-pointer" aria-label="left lane" />
              <button onClick={() => switchLane('right')} className="absolute inset-y-0 right-0 w-1/2 cursor-pointer" aria-label="right lane" />
            </>
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
                      hero === h ? 'border-cyan-400 scale-105 shadow-xl' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/game4/hero_${h}.png`} alt={h} className="h-28 w-auto" draggable={false} />
                  </button>
                ))}
              </div>
              <button onClick={beginGame} className="rounded-xl bg-cyan-500 px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-cyan-600">
                {t('startGame')}
              </button>
              <p className="text-xs text-white/85">{t('gateHint')}</p>
            </div>
          )}

          {/* 종료 화면 */}
          {phase === 'finished' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-black/60 backdrop-blur-[2px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bossResult === 'win' ? `/game4/hero_${hero}.png` : '/game4/boss_bug.png'}
                alt=""
                className="w-24 animate-bounce"
                draggable={false}
              />
              <p className="text-xl font-extrabold text-white drop-shadow">
                {bossResult === 'win' ? t('bossWin') : t('bossLose')}
              </p>
              <p className="text-3xl font-extrabold text-white drop-shadow">{score}{t('scoreSuffix')}</p>
              <p className="text-sm text-white/90">{t('accuracy', { correct: correctCount, total: totalGates })}</p>
              <div className="mt-1 flex gap-2">
                <button onClick={handleReplay} className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-cyan-600">
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
