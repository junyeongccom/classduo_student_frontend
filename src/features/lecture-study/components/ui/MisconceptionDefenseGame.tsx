/**
 * @file MisconceptionDefenseGame.tsx
 * @description 오개념 방어전 — 마디별 HP를 가진 오개념 군체를 자동 사격으로 격파하고, 보물상자 마디에서
 *              퀴즈를 맞혀 무기를 업그레이드하는 디펜스 학습 게임 (세포특공대 방식)
 * @module features/lecture-study/components/ui
 * @dependencies next-intl, /public/game7 에셋(히어로=서비스 캐릭터)
 *
 * 학습 접목: 무기 강화는 "보물상자 마디 격파 → 용어 퀴즈 정답"으로만 얻는다.
 * 뒤쪽 마디 HP가 급격히 커지도록 설계해, 퀴즈를 맞혀 업그레이드하지 않으면 클리어가 불가능하다
 * → 게임을 이기려면 반드시 용어를 학습해야 한다.
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X, Heart, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface GameWord {
  keyword: string
  description: string
}

interface MisconceptionDefenseGameProps {
  words: GameWord[]
  onClose: (score: number | null) => void
}

/** 마디 총 개수 */
const TOTAL_SEGMENTS = 22
/** 한 줄에 배치할 마디 수 (지그재그) */
const PER_ROW = 6
/** 줄 간격 (보드 높이 %) */
const ROW_H = 13
/** 군체가 1초에 전진하는 거리 (%) */
const ADVANCE_PER_SEC = 1.25
/** 마디 하나를 격파했을 때 뒤로 밀리는 거리 (%) */
const PUSHBACK = 4.6
/** 군체 선두가 이 y(%)를 넘으면 플레이어 피격 */
const DANGER_Y = 76
const START_HP = 3

interface Segment {
  id: number
  hp: number
  maxHp: number
  tough: boolean
  chest: boolean
}

interface Upgrade {
  id: 'rapid' | 'power' | 'speed'
  icon: string
}

const UPGRADES: Upgrade[] = [
  { id: 'rapid', icon: '/game7/upg_rapid.png' },
  { id: 'power', icon: '/game7/upg_power.png' },
  { id: 'speed', icon: '/game7/upg_speed.png' },
]

interface QuizSet {
  answer: GameWord
  options: GameWord[]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function MisconceptionDefenseGame({ words, onClose }: MisconceptionDefenseGameProps) {
  const t = useTranslations('lectureStudy.game.play')

  const pool = useMemo(() => {
    const seen = new Set<string>()
    return words.filter(w => {
      if (!w.keyword || !w.description || seen.has(w.keyword)) return false
      seen.add(w.keyword)
      return true
    })
  }, [words])

  const [hero, setHero] = useState<'boy' | 'girl'>('boy')
  const [started, setStarted] = useState(false)
  const [hp, setHp] = useState(START_HP)
  const [score, setScore] = useState(0)
  const [killed, setKilled] = useState(0)
  const [phase, setPhase] = useState<'battle' | 'quiz' | 'reward' | 'finished'>('battle')
  const [quiz, setQuiz] = useState<QuizSet | null>(null)
  const [quizResult, setQuizResult] = useState<'correct' | 'wrong' | null>(null)
  const [rewardChoices, setRewardChoices] = useState<Upgrade[]>([])
  const [cleared, setCleared] = useState(false)

  /** 무기 스탯 — 업그레이드로만 성장 */
  const [stats, setStats] = useState({ damage: 12, fireRate: 1.6, bulletSpeed: 1 })
  const statsRef = useRef(stats)
  useEffect(() => { statsRef.current = stats }, [stats])

  /** 마디 배열·전진 거리는 ref 가 권위 (프레임 갱신은 DOM 직접) */
  const segsRef = useRef<Segment[]>([])
  const advanceRef = useRef(0)
  const [, forceRender] = useState(0)
  const chainElRef = useRef<HTMLDivElement>(null)
  const segElsRef = useRef<Map<number, HTMLElement>>(new Map())
  const lastShotRef = useRef(0)
  const lastFrameRef = useRef(0)
  const pausedRef = useRef(false)
  const [bullets, setBullets] = useState<{ id: number; born: number; dur: number }[]>([])
  const idRef = useRef(0)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  /** 마디 생성 — 뒤로 갈수록 HP 급증, 4번째마다 보물상자 */
  const buildSegments = useCallback((): Segment[] => {
    return Array.from({ length: TOTAL_SEGMENTS }, (_, i) => {
      const hp = Math.round(24 * Math.pow(1.19, i))   // 24 → 약 1,000
      const tough = i >= TOTAL_SEGMENTS * 0.6
      return { id: i + 1, hp, maxHp: hp, tough, chest: i > 0 && i % 4 === 3 }
    })
  }, [])

  useEffect(() => {
    segsRef.current = buildSegments()
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const beginGame = useCallback(() => {
    setStarted(true)
    lastFrameRef.current = performance.now()
    lastShotRef.current = performance.now()
  }, [])

  /** 보물상자 격파 → 퀴즈 출제 (정답만 업그레이드 획득) */
  const openChestQuiz = useCallback(() => {
    if (pool.length < 2) return
    const answer = pool[Math.floor(Math.random() * pool.length)]
    const distractors = shuffle(pool.filter(w => w.keyword !== answer.keyword)).slice(0, 3)
    pausedRef.current = true
    setQuiz({ answer, options: shuffle([answer, ...distractors]) })
    setQuizResult(null)
    setPhase('quiz')
  }, [pool])

  const answerQuiz = useCallback((picked: GameWord) => {
    if (!quiz || quizResult) return
    const ok = picked.keyword === quiz.answer.keyword
    setQuizResult(ok ? 'correct' : 'wrong')
    if (ok) {
      setScore(s => s + 150)
      const timer = setTimeout(() => {
        setRewardChoices(shuffle(UPGRADES))
        setPhase('reward')
      }, 900)
      timersRef.current.push(timer)
    } else {
      // 오답 — 업그레이드 없이 전투 재개 (무기가 안 세지므로 뒤 마디에서 막힌다)
      const timer = setTimeout(() => {
        setQuiz(null)
        setPhase('battle')
        pausedRef.current = false
        lastFrameRef.current = performance.now()
      }, 1500)
      timersRef.current.push(timer)
    }
  }, [quiz, quizResult])

  const pickUpgrade = useCallback((u: Upgrade) => {
    setStats(prev => {
      if (u.id === 'rapid') return { ...prev, fireRate: prev.fireRate + 0.9 }
      if (u.id === 'power') return { ...prev, damage: Math.round(prev.damage * 1.8) }
      return { ...prev, bulletSpeed: prev.bulletSpeed * 1.45 }
    })
    setQuiz(null)
    setRewardChoices([])
    setPhase('battle')
    pausedRef.current = false
    lastFrameRef.current = performance.now()
  }, [])

  // ── 메인 루프: 자동 사격 + 마디 피격 + 군체 전진 ──
  useEffect(() => {
    if (!started || phase === 'finished') return
    let raf = 0
    const loop = () => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000)
      lastFrameRef.current = now

      if (!pausedRef.current) {
        // 1) 전진
        advanceRef.current += ADVANCE_PER_SEC * dt
        if (chainElRef.current) {
          chainElRef.current.style.transform = `translateY(${advanceRef.current}%)`
        }

        // 2) 자동 사격 — 선두 마디에 데미지
        const { damage, fireRate, bulletSpeed } = statsRef.current
        if (now - lastShotRef.current >= 1000 / fireRate) {
          lastShotRef.current = now
          idRef.current += 1
          const bid = idRef.current
          const dur = 420 / bulletSpeed
          setBullets(prev => [...prev.slice(-7), { id: bid, born: now, dur }])
          const rm = setTimeout(() => setBullets(prev => prev.filter(b => b.id !== bid)), dur + 60)
          timersRef.current.push(rm)

          const hit = setTimeout(() => {
            const head = segsRef.current[0]
            if (!head || pausedRef.current) return
            head.hp -= damage
            if (head.hp <= 0) {
              const wasChest = head.chest
              segsRef.current = segsRef.current.slice(1)
              segElsRef.current.delete(head.id)
              advanceRef.current = Math.max(0, advanceRef.current - PUSHBACK)
              setScore(s => s + 20)
              setKilled(k => k + 1)
              if (segsRef.current.length === 0) {
                setCleared(true)
                setPhase('finished')
              } else if (wasChest) {
                openChestQuiz()
              }
            }
            forceRender(v => v + 1)
          }, dur)
          timersRef.current.push(hit)
        }

        // 3) 선두가 위험선을 넘으면 피격
        const headRow = 0
        const headY = 6 + headRow * ROW_H + advanceRef.current
        if (headY >= DANGER_Y) {
          advanceRef.current = Math.max(0, advanceRef.current - 16)
          setHp(h => Math.max(0, h - 1))
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [started, phase, openChestQuiz])

  // HP 소진 → 종료
  useEffect(() => {
    if (started && hp <= 0) {
      clearTimers()
      pausedRef.current = true
      setPhase('finished')
    }
  }, [hp, started])

  const handleReplay = useCallback(() => {
    clearTimers()
    segsRef.current = buildSegments()
    advanceRef.current = 0
    if (chainElRef.current) chainElRef.current.style.transform = 'translateY(0%)'
    setStats({ damage: 12, fireRate: 1.6, bulletSpeed: 1 })
    setHp(START_HP); setScore(0); setKilled(0); setCleared(false)
    setQuiz(null); setRewardChoices([]); setQuizResult(null)
    setPhase('battle')
    pausedRef.current = false
    lastFrameRef.current = performance.now()
    lastShotRef.current = performance.now()
    forceRender(v => v + 1)
  }, [buildSegments])

  /** 마디 지그재그 좌표 — 선두(index 0)가 가장 아래 */
  const segPos = (idx: number) => {
    const row = Math.floor(idx / PER_ROW)
    const colRaw = idx % PER_ROW
    const col = row % 2 === 0 ? colRaw : PER_ROW - 1 - colRaw
    return {
      x: 10 + col * (80 / (PER_ROW - 1)),
      y: 6 + row * ROW_H,
    }
  }

  const upgradeLabel = (id: Upgrade['id']) => ({
    rapid: { title: t('upgRapidTitle'), effect: t('upgRapidEffect') },
    power: { title: t('upgPowerTitle'), effect: t('upgPowerEffect') },
    speed: { title: t('upgSpeedTitle'), effect: t('upgSpeedEffect') },
  }[id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
      <div className="relative w-full max-w-4xl">
        {/* HUD */}
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-white/95 px-4 py-2.5 shadow-lg">
          <span className="shrink-0 rounded-lg bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700">
            {t('segmentsLeft', { n: segsRef.current.length })}
          </span>
          <span className="hidden shrink-0 items-center gap-2 text-[11px] font-semibold text-gray-500 sm:flex">
            <span>{t('statDamage', { n: stats.damage })}</span>
            <span>{t('statRate', { n: stats.fireRate.toFixed(1) })}</span>
          </span>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-gray-800">
            {started ? t('defenseIntro2') : t('defenseIntro')}
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
          style={{ aspectRatio: '1344/768', backgroundImage: 'url(/game7/defense_bg.png)', backgroundSize: 'cover' }}
        >
          {/* 위험선 */}
          <div className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-rose-400/60"
               style={{ top: `${DANGER_Y}%` }} />

          {/* 오개념 군체 (지그재그 체인) */}
          <div ref={chainElRef} className="absolute inset-0" style={{ transform: 'translateY(0%)' }}>
            {segsRef.current.map((seg, idx) => {
              const { x, y } = segPos(idx)
              const isHead = idx === 0
              return (
                <div
                  key={seg.id}
                  ref={(el) => { if (el) segElsRef.current.set(seg.id, el); else segElsRef.current.delete(seg.id) }}
                  className={`absolute w-[11%] ${isHead ? 'drop-shadow-[0_0_10px_rgba(244,63,94,0.55)]' : ''}`}
                  style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)', zIndex: 100 - idx }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={seg.tough ? '/game7/seg_node_tough.png' : '/game7/seg_node.png'}
                    alt=""
                    className="w-full"
                    draggable={false}
                  />
                  {/* 남은 HP 숫자 */}
                  {/* 남은 HP — 마디 색이 진해 보라색 텍스트는 안 읽힌다. 흰색 + 외곽 그림자로 대비 확보 */}
                  <span
                    className="absolute inset-0 flex items-center justify-center text-[12px] font-extrabold text-white sm:text-base"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85), 0 0 6px rgba(0,0,0,0.6)' }}
                  >
                    {Math.max(0, seg.hp)}
                  </span>
                  {/* 보물상자 표식 */}
                  {seg.chest && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/game7/chest_gold.png"
                      alt=""
                      className="absolute -right-[18%] -top-[26%] w-[62%] animate-pulse"
                      draggable={false}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* 자동 발사 탄 */}
          {bullets.map(b => (
            <div
              key={b.id}
              className="pointer-events-none absolute bottom-[16%] left-1/2 w-[4%] -translate-x-1/2"
              style={{ animation: `boltup ${b.dur}ms linear forwards` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/game7/bolt_shot.png" alt="" className="w-full -rotate-90" draggable={false} />
            </div>
          ))}

          {/* 방어탑 + 주인공 (하단 중앙) */}
          {started && (
            <>
              <div className="absolute bottom-[13%] left-1/2 w-[10%] -translate-x-1/2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/game7/shield_tower.png" alt="" className="w-full drop-shadow" draggable={false} />
              </div>
              <div className="absolute bottom-[2%] left-[38%] w-[9%]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/game7/hero_${hero}.png`} alt="" className="w-full drop-shadow" draggable={false} />
              </div>
            </>
          )}

          {/* 시작 화면 */}
          {!started && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/50 backdrop-blur-[2px]">
              <p className="text-lg font-bold text-white drop-shadow">{t('pickHero')}</p>
              <div className="flex items-end gap-6">
                {(['girl', 'boy'] as const).map(h => (
                  <button
                    key={h}
                    onClick={() => setHero(h)}
                    className={`rounded-2xl border-4 bg-white/85 p-2 transition-all ${
                      hero === h ? 'border-purple-400 scale-105 shadow-xl' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/game7/hero_${h}.png`} alt={h} className="h-28 w-auto" draggable={false} />
                  </button>
                ))}
              </div>
              <button onClick={beginGame} className="rounded-xl bg-purple-500 px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-purple-600">
                {t('startGame')}
              </button>
              <p className="max-w-md text-center text-xs text-white/85">{t('defenseHint2')}</p>
            </div>
          )}

          {/* 퀴즈 (보물상자) */}
          {phase === 'quiz' && quiz && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
              <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
                <div className="mb-3 flex items-center justify-center gap-2 text-amber-600">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/game7/chest_gold.png" alt="" className="h-7 w-auto" draggable={false} />
                  <span className="text-sm font-bold">{t('chestQuizTitle')}</span>
                </div>
                <p className="mb-4 text-center text-sm leading-relaxed text-gray-700">{quiz.answer.description}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {quiz.options.map(opt => {
                    const isAnswer = opt.keyword === quiz.answer.keyword
                    const showResult = quizResult !== null
                    return (
                      <button
                        key={opt.keyword}
                        onClick={() => answerQuiz(opt)}
                        disabled={showResult}
                        className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-all ${
                          showResult
                            ? isAnswer
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 bg-gray-50 text-gray-400'
                            : 'border-purple-200 bg-white text-gray-800 hover:border-purple-400 hover:bg-purple-50'
                        }`}
                      >
                        {opt.keyword}
                      </button>
                    )
                  })}
                </div>
                {quizResult && (
                  <p className={`mt-3 text-center text-sm font-bold ${quizResult === 'correct' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {quizResult === 'correct' ? t('quizCorrect') : t('quizWrong')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 업그레이드 3택 */}
          {phase === 'reward' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-amber-300">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-bold">{t('rewardTitle')}</span>
              </div>
              <div className="flex w-full max-w-2xl justify-center gap-3">
                {rewardChoices.map((u, i) => {
                  const label = upgradeLabel(u.id)
                  const isFeatured = i === 1
                  return (
                    <button
                      key={u.id}
                      onClick={() => pickUpgrade(u)}
                      className={`flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 px-2 py-4 transition-all hover:-translate-y-1 ${
                        isFeatured
                          ? 'border-fuchsia-400 bg-gradient-to-b from-fuchsia-600/90 to-fuchsia-800/90 shadow-[0_0_24px_rgba(232,121,249,0.5)]'
                          : 'border-teal-400 bg-gradient-to-b from-teal-600/90 to-teal-800/90'
                      }`}
                    >
                      <div className={`flex h-16 w-16 items-center justify-center rounded-full border-2 ${
                        isFeatured ? 'border-fuchsia-300 bg-fuchsia-900/60' : 'border-teal-300 bg-teal-900/60'
                      }`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u.icon} alt="" className="h-10 w-auto" draggable={false} />
                      </div>
                      <p className="text-sm font-extrabold text-yellow-200 drop-shadow">{label.title}</p>
                      <p className="text-[11px] font-semibold text-emerald-200">{label.effect}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 종료 화면 */}
          {phase === 'finished' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-black/70 backdrop-blur-[2px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cleared ? '/game7/shield_tower.png' : '/game7/seg_node_tough.png'}
                alt=""
                className="w-20 animate-bounce"
                draggable={false}
              />
              <p className="text-xl font-extrabold text-white drop-shadow">
                {cleared ? t('defenseWin') : t('defenseLose')}
              </p>
              <p className="text-3xl font-extrabold text-white drop-shadow">{score}{t('scoreSuffix')}</p>
              <p className="text-sm text-white/90">{t('segmentsKilled', { n: killed, total: TOTAL_SEGMENTS })}</p>
              <div className="mt-1 flex gap-2">
                <button onClick={handleReplay} className="rounded-xl bg-purple-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-purple-600">
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
        @keyframes boltup {
          from { transform: translate(-50%, 0) scale(1); opacity: 1; }
          to { transform: translate(-50%, -420%) scale(0.9); opacity: 0.85; }
        }
      `}</style>
    </div>
  )
}
