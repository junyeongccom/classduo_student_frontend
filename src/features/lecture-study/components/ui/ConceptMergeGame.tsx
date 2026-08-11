/**
 * @file ConceptMergeGame.tsx
 * @description 개념 합치기 — 같은 용어 조각을 드래그해 합쳐 정의를 완성하는 머지 퍼즐 학습 게임
 * @module features/lecture-study/components/ui
 * @dependencies next-intl, /public/game5 에셋
 *
 * 유행 포맷(드래그 머지)을 학습에 접목: 같은 용어의 조각 2개를 합치면 레벨이 오르고,
 * 최종 레벨(황금 젬)에 도달하면 그 용어의 정의가 공개된다 → 병합 과정에서 용어를 반복 인지한다.
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface GameWord {
  keyword: string
  description: string
}

interface ConceptMergeGameProps {
  words: GameWord[]
  onClose: (score: number | null) => void
}

const COLS = 5
const ROWS = 4
const MAX_LEVEL = 3          // 1(orb) → 2(gem) → 3(golden) = 완성
const SPAWN_COOLDOWN_MS = 900

interface Tile {
  id: number
  word: GameWord
  level: number
}

const ORB_SRC = ['/game5/merge_orb_low.png', '/game5/merge_orb_mid.png', '/game5/merge_orb_high.png']

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function ConceptMergeGame({ words, onClose }: ConceptMergeGameProps) {
  const t = useTranslations('lectureStudy.game.play')

  /** 이 게임은 용어 3~4개로 좁혀 반복 병합시키는 것이 학습 효과가 크다 */
  const targets = useMemo(() => {
    const seen = new Set<string>()
    const uniq = words.filter(w => {
      if (!w.keyword || !w.description || seen.has(w.keyword)) return false
      seen.add(w.keyword)
      return true
    })
    return shuffle(uniq).slice(0, 4)
  }, [words])

  const [board, setBoard] = useState<(Tile | null)[]>(() => Array(COLS * ROWS).fill(null))
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [completed, setCompleted] = useState<GameWord[]>([])
  const [reveal, setReveal] = useState<GameWord | null>(null)
  const [score, setScore] = useState(0)
  const idRef = useRef(0)
  const spawnLockRef = useRef(false)

  const spawnTile = useCallback(() => {
    if (targets.length === 0) return
    setBoard(prev => {
      const empty = prev.map((c, i) => (c === null ? i : -1)).filter(i => i >= 0)
      if (empty.length === 0) return prev
      const slot = empty[Math.floor(Math.random() * empty.length)]
      idRef.current += 1
      const next = [...prev]
      next[slot] = {
        id: idRef.current,
        word: targets[Math.floor(Math.random() * targets.length)],
        level: 1,
      }
      return next
    })
  }, [targets])

  // 초기 배치 6개 — StrictMode 이중 실행 방어 (한 번만 채운다)
  const seededRef = useRef(false)
  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    for (let i = 0; i < 6; i++) spawnTile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDrop = useCallback((to: number) => {
    const from = dragFrom
    setDragFrom(null)
    if (from === null || from === to) return

    setBoard(prev => {
      const a = prev[from]
      const b = prev[to]
      if (!a) return prev
      const next = [...prev]

      // 빈 칸으로 이동
      if (!b) {
        next[to] = a
        next[from] = null
        return next
      }
      // 같은 용어 + 같은 레벨 → 병합
      if (a.word.keyword === b.word.keyword && a.level === b.level && a.level < MAX_LEVEL) {
        next[to] = { id: a.id, word: a.word, level: a.level + 1 }
        next[from] = null
        setScore(s => s + a.level * 30)
        // 최종 레벨 달성 → 정의 공개 + 보드에서 제거
        if (a.level + 1 === MAX_LEVEL) {
          setScore(s => s + 100)
          setCompleted(c => (c.some(w => w.keyword === a.word.keyword) ? c : [...c, a.word]))
          setReveal(a.word)
          next[to] = null
        }
        return next
      }
      return prev
    })
  }, [dragFrom])

  // 병합 후 새 조각 보충 (쿨다운으로 폭주 방지)
  useEffect(() => {
    if (spawnLockRef.current) return
    const filled = board.filter(Boolean).length
    if (filled >= 3) return
    spawnLockRef.current = true
    const timer = setTimeout(() => {
      spawnTile()
      spawnLockRef.current = false
    }, SPAWN_COOLDOWN_MS)
    return () => {
      clearTimeout(timer)
      spawnLockRef.current = false
    }
  }, [board, spawnTile])

  const allDone = targets.length > 0 && completed.length >= targets.length

  const handleReplay = useCallback(() => {
    setBoard(Array(COLS * ROWS).fill(null))
    setCompleted([])
    setScore(0)
    setReveal(null)
    setTimeout(() => { for (let i = 0; i < 6; i++) spawnTile() }, 50)
  }, [spawnTile])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
      <div className="relative w-full max-w-4xl">
        {/* HUD */}
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-white/95 px-4 py-2.5 shadow-lg">
          <span className="shrink-0 rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-700">
            {t('mergeProgress', { done: completed.length, total: targets.length })}
          </span>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-gray-800">
            {t('mergeHint')}
          </p>
          <span className="shrink-0 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
            {score}{t('scoreSuffix')}
          </span>
          <button
            onClick={() => onClose(allDone ? score : null)}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 보드 */}
        <div
          className="relative w-full select-none overflow-hidden rounded-2xl p-[3%] shadow-2xl"
          style={{ aspectRatio: '1344/768', backgroundImage: 'url(/game5/merge_bg.png)', backgroundSize: 'cover' }}
        >
          {/* 배경 자체의 격자 무늬가 게임 그리드와 겹쳐 읽히지 않도록 눌러준다 */}
          <div className="pointer-events-none absolute inset-0 bg-amber-950/25" />
          <div
            className="relative z-10 grid h-full w-full gap-[1.2%]"
            style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))` }}
          >
            {board.map((tile, i) => (
              <div
                key={i}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(i)}
                onClick={() => (dragFrom === null ? tile && setDragFrom(i) : handleDrop(i))}
                className={`relative flex items-center justify-center rounded-xl border-2 transition-colors ${
                  dragFrom === i
                    ? 'border-teal-300 bg-teal-100/50 shadow-[0_0_0_2px_rgba(20,184,166,0.4)]'
                    : 'border-amber-100/45 bg-amber-50/15 hover:bg-amber-50/30'
                }`}
              >
                {tile && (
                  <div
                    draggable
                    onDragStart={() => setDragFrom(i)}
                    className="flex h-full w-full cursor-grab flex-col items-center justify-center active:cursor-grabbing"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ORB_SRC[tile.level - 1]} alt="" className="h-[62%] w-auto drop-shadow" draggable={false} />
                    <span className="mt-0.5 max-w-full truncate px-1 text-[10px] font-bold text-amber-900 sm:text-xs">
                      {tile.word.keyword}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 정의 공개 카드 */}
          {reveal && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 p-6 backdrop-blur-[2px]">
              <div className="max-w-lg rounded-2xl bg-white p-5 text-center shadow-2xl">
                <div className="mb-2 flex items-center justify-center gap-1.5 text-amber-600">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-bold">{t('mergeComplete')}</span>
                </div>
                <p className="mb-1.5 text-lg font-extrabold text-gray-900">{reveal.keyword}</p>
                <p className="text-sm leading-relaxed text-gray-600">{reveal.description}</p>
                <button
                  onClick={() => setReveal(null)}
                  className="mt-4 w-full rounded-xl bg-teal-500 py-2.5 text-sm font-bold text-white hover:bg-teal-600"
                >
                  {t('mergeContinue')}
                </button>
              </div>
            </div>
          )}

          {/* 종료 화면 */}
          {allDone && !reveal && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-[2px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/game5/merge_orb_high.png" alt="" className="w-20 animate-bounce" draggable={false} />
              <p className="text-3xl font-extrabold text-white drop-shadow">{score}{t('scoreSuffix')}</p>
              <p className="text-sm text-white/90">{t('mergeAllDone', { total: targets.length })}</p>
              <div className="mt-1 flex gap-2">
                <button onClick={handleReplay} className="rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-teal-600">
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
