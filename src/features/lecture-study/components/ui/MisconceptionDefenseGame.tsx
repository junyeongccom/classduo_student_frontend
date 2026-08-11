/**
 * @file MisconceptionDefenseGame.tsx
 * @description 오개념 방어전 — 몰려오는 오개념 세균을 '정답 용어' 방어탑으로 요격하는 타워 디펜스 학습 게임
 * @module features/lecture-study/components/ui
 * @dependencies next-intl, /public/game7 에셋(히어로=서비스 캐릭터)
 *
 * 세포특공대류 디펜스 포맷을 학습에 접목: 세균이 용어를 이고 몰려오고, 화면 하단의 정의(설명)에 맞는
 * 용어 세균만 요격해야 한다. 오답을 쏘면 방어막이 깎이고, 정답 세균이 성문에 닿으면 실점.
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X, Heart } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface GameWord {
  keyword: string
  description: string
}

interface MisconceptionDefenseGameProps {
  words: GameWord[]
  onClose: (score: number | null) => void
}

const WAVES = 6
const ENEMIES_PER_WAVE = 4
const MARCH_MS = 13000       // 오른쪽(성문)까지 도달 시간 (용어 라벨을 읽을 여유)
const SPAWN_GAP_MS = 1800
const START_HP = 3

interface Enemy {
  id: number
  word: GameWord
  isTarget: boolean
  bornAt: number
  /** 진행 레인 (y %) */
  y: number
  big: boolean
  state: 'march' | 'hit' | 'leaked'
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

  const totalWaves = Math.min(WAVES, pool.length)
  const [hero, setHero] = useState<'boy' | 'girl'>('boy')
  const [started, setStarted] = useState(false)
  const [wave, setWave] = useState(0)
  const [target, setTarget] = useState<GameWord | null>(null)
  const [hp, setHp] = useState(START_HP)
  const [score, setScore] = useState(0)
  const [defeated, setDefeated] = useState(0)
  const [phase, setPhase] = useState<'battle' | 'waveEnd' | 'finished'>('battle')
  const [shots, setShots] = useState<{ id: number; x: number; y: number }[]>([])

  /** 적 배열 권위는 ref — 행진은 DOM 직접 갱신(리렌더로는 프레임이 안 나온다) */
  const enemiesRef = useRef<Enemy[]>([])
  const [, forceRender] = useState(0)
  const enemyElsRef = useRef<Map<number, HTMLDivElement>>(new Map())
  const idRef = useRef(0)
  const waveRef = useRef(0)
  const spawnedRef = useRef(0)
  const targetHitRef = useRef(false)
  const orderRef = useRef<GameWord[]>([])
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  const startWave = useCallback((idx: number) => {
    waveRef.current = idx
    spawnedRef.current = 0
    targetHitRef.current = false
    enemiesRef.current = []
    enemyElsRef.current.clear()
    setWave(idx)
    setTarget(orderRef.current[idx])
    setPhase('battle')
    forceRender(v => v + 1)
  }, [])

  useEffect(() => {
    orderRef.current = shuffle(pool).slice(0, totalWaves)
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const beginGame = useCallback(() => {
    setStarted(true)
    if (totalWaves > 0) startWave(0)
  }, [totalWaves, startWave])

  // 적 스폰 — 웨이브당 정답 1마리 + 오답들, 정답은 초반에 배치
  useEffect(() => {
    if (!started || phase !== 'battle' || hp <= 0) return
    const answer = orderRef.current[waveRef.current]
    if (!answer) return
    const answerSlot = 1 + Math.floor(Math.random() * 2)   // 2~3번째로 등장
    const spawn = () => {
      if (spawnedRef.current >= ENEMIES_PER_WAVE + 2) return
      const isTarget = spawnedRef.current === answerSlot && !targetHitRef.current
      const wrong = shuffle(pool.filter(w => w.keyword !== answer.keyword))[0] ?? answer
      idRef.current += 1
      enemiesRef.current = [...enemiesRef.current, {
        id: idRef.current,
        word: isTarget ? answer : wrong,
        isTarget,
        bornAt: performance.now(),
        y: 43 + Math.random() * 11,
        // 크기는 정답 여부와 무관한 순수 연출 (크기로 정답을 추측할 수 없게)
        big: Math.random() < 0.3,
        state: 'march',
      }]
      spawnedRef.current += 1
      forceRender(v => v + 1)
    }
    spawn()
    const iv = setInterval(spawn, SPAWN_GAP_MS)
    return () => clearInterval(iv)
  }, [started, phase, pool, hp])

  const nextWave = useCallback(() => {
    const timer = setTimeout(() => {
      const next = waveRef.current + 1
      if (next >= totalWaves) setPhase('finished')
      else startWave(next)
    }, 1000)
    timersRef.current.push(timer)
  }, [totalWaves, startWave])

  // 행진 루프 — x 위치 DOM 갱신 + 성문 도달 판정
  useEffect(() => {
    if (!started || phase !== 'battle') return
    let raf = 0
    const loop = () => {
      const now = performance.now()
      let changed = false
      for (const e of enemiesRef.current) {
        if (e.state !== 'march') continue
        const p = (now - e.bornAt) / MARCH_MS
        const x = 4 + p * 84
        const el = enemyElsRef.current.get(e.id)
        if (el) el.style.left = `${x}%`
        if (p >= 1) {
          e.state = 'leaked'
          changed = true
          if (e.isTarget && !targetHitRef.current) {
            // 정답 세균을 놓쳤다 → 방어막만 깎고 웨이브는 넘기지 않는다.
            // 정답 세균을 다시 보내 "정답 용어를 스스로 찾아낸다"는 학습 목표를 반드시 달성시킨다.
            setHp(h => Math.max(0, h - 1))
            const answer = orderRef.current[waveRef.current]
            if (answer) {
              idRef.current += 1
              enemiesRef.current = [...enemiesRef.current, {
                id: idRef.current,
                word: answer,
                isTarget: true,
                bornAt: now,
                y: 43 + Math.random() * 11,
                big: false,
                state: 'march',
              }]
            }
          }
        }
      }
      const alive = enemiesRef.current.filter(e => e.state === 'march' || now - e.bornAt < MARCH_MS + 800)
      if (alive.length !== enemiesRef.current.length) {
        enemiesRef.current = alive
        changed = true
      }
      if (changed) forceRender(v => v + 1)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [started, phase, nextWave])

  // HP 소진 → 즉시 종료. 예약된 nextWave 타이머가 finished 를 battle 로 덮으므로 함께 취소한다.
  useEffect(() => {
    if (started && hp <= 0) {
      clearTimers()
      setPhase('finished')
    }
  }, [hp, started])

  /** 세균 클릭 = 요격 */
  const shoot = useCallback((enemy: Enemy) => {
    if (phase !== 'battle' || enemy.state !== 'march') return
    const el = enemyElsRef.current.get(enemy.id)
    const x = el ? parseFloat(el.style.left) || 50 : 50
    idRef.current += 1
    const shotId = idRef.current
    setShots(prev => [...prev.slice(-5), { id: shotId, x, y: enemy.y }])
    const rm = setTimeout(() => setShots(prev => prev.filter(s => s.id !== shotId)), 420)
    timersRef.current.push(rm)

    enemy.state = 'hit'
    forceRender(v => v + 1)

    if (enemy.isTarget) {
      targetHitRef.current = true
      setScore(s => s + 100)
      setDefeated(d => d + 1)
      setPhase('waveEnd')
      nextWave()
    } else {
      // 오답 요격 → 방어막 손실
      setScore(s => Math.max(0, s - 20))
      setHp(h => Math.max(0, h - 1))
    }
  }, [phase, nextWave])

  const handleReplay = useCallback(() => {
    clearTimers()
    orderRef.current = shuffle(pool).slice(0, totalWaves)
    setHp(START_HP); setScore(0); setDefeated(0)
    startWave(0)
  }, [pool, totalWaves, startWave])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
      <div className="relative w-full max-w-4xl">
        {/* HUD */}
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-white/95 px-4 py-2.5 shadow-lg">
          <span className="shrink-0 rounded-lg bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700">
            {t('wave', { current: Math.min(wave + 1, totalWaves), total: totalWaves })}
          </span>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-gray-800" title={target?.description}>
            {started ? target?.description : t('defenseIntro')}
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
          {/* 방어탑 + 주인공 (성문 앞) */}
          {started && (
            <>
              <div className="absolute bottom-[16%] right-[3%] w-[11%]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/game7/shield_tower.png" alt="" className="w-full drop-shadow" draggable={false} />
              </div>
              <div className="absolute bottom-[6%] right-[13%] w-[9%]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/game7/hero_${hero}.png`} alt="" className="w-full drop-shadow" draggable={false} />
              </div>
            </>
          )}

          {/* 세균 (클릭 요격) */}
          {started && enemiesRef.current.map(enemy => (
            <div
              key={enemy.id}
              ref={(el) => {
                if (el) enemyElsRef.current.set(enemy.id, el)
                else enemyElsRef.current.delete(enemy.id)
              }}
              className={`absolute ${enemy.big ? 'w-[9.5%]' : 'w-[7.5%]'} ${
                enemy.state === 'hit' ? 'animate-[germpop_0.4s_ease-out_forwards]' : ''
              } ${enemy.state === 'leaked' ? 'opacity-0' : ''}`}
              style={{ left: '4%', top: `${enemy.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <button
                type="button"
                onClick={() => shoot(enemy)}
                className="block w-full cursor-crosshair transition-transform hover:scale-110 active:scale-95"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={enemy.big ? '/game7/germ_big.png' : '/game7/germ_small.png'} alt="" className="w-full" draggable={false} />
                <span className="absolute inset-x-[-30%] -top-[14%] break-keep rounded-full bg-white/90 px-1.5 py-0.5 text-center text-[10px] font-extrabold leading-tight text-purple-800 shadow sm:text-xs">
                  {enemy.word.keyword}
                </span>
              </button>
            </div>
          ))}

          {/* 요격 탄 */}
          {shots.map(s => (
            <div
              key={s.id}
              className="pointer-events-none absolute w-[6%] animate-[boltfly_0.4s_ease-out_forwards]"
              style={{ left: `${s.x}%`, top: `${s.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/game7/bolt_shot.png" alt="" className="w-full" draggable={false} />
            </div>
          ))}

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
              <p className="text-xs text-white/85">{t('defenseHint')}</p>
            </div>
          )}

          {/* 종료 화면 */}
          {phase === 'finished' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-black/60 backdrop-blur-[2px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hp > 0 ? '/game7/shield_tower.png' : '/game7/germ_big.png'}
                alt=""
                className="w-20 animate-bounce"
                draggable={false}
              />
              <p className="text-xl font-extrabold text-white drop-shadow">
                {hp > 0 ? t('defenseWin') : t('defenseLose')}
              </p>
              <p className="text-3xl font-extrabold text-white drop-shadow">{score}{t('scoreSuffix')}</p>
              <p className="text-sm text-white/90">{t('accuracy', { correct: defeated, total: totalWaves })}</p>
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
        @keyframes germpop {
          0% { opacity: 1; scale: 1; rotate: 0deg; }
          100% { opacity: 0; scale: 1.35; rotate: 18deg; }
        }
        @keyframes boltfly {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(0.7); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); }
        }
      `}</style>
    </div>
  )
}
