/**
 * @file ConceptSortGame.tsx
 * @description 개념 분류 — 뒤섞인 정의 조각을 각 용어 시험관으로 분류해 담는 퍼즐 학습 게임
 * @module features/lecture-study/components/ui
 * @dependencies next-intl, /public/game9 에셋
 *
 * Water Sort 포맷을 학습에 접목: 각 시험관이 하나의 용어를 담당하고, 아래 대기열의 정의 조각(설명 문장)을
 * 올바른 용어 시험관에 넣어야 한다. 오배치는 감점 + 조각이 대기열로 되돌아온다 → "정의→용어" 분류 연습.
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface GameWord {
  keyword: string
  description: string
}

interface ConceptSortGameProps {
  words: GameWord[]
  onClose: (score: number | null) => void
}

/** 시험관(=용어) 개수 */
const TUBES = 4
/** 용어당 정의 조각 수 */
const PIECES_PER_TERM = 2

interface Piece {
  id: number
  /** 이 조각이 속한 용어 */
  keyword: string
  /** 화면에 보이는 정의 조각 텍스트 */
  text: string
  placedIn: string | null
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 정의를 앞/뒤 두 조각으로 쪼갠다 (문장 중간의 어절 경계 기준) */
function splitDefinition(desc: string, parts: number): string[] {
  const tokens = desc.split(/\s+/).filter(Boolean)
  if (tokens.length < parts * 2) return [desc]
  const size = Math.ceil(tokens.length / parts)
  const out: string[] = []
  for (let i = 0; i < parts; i++) {
    const seg = tokens.slice(i * size, (i + 1) * size).join(' ')
    if (seg) out.push(seg)
  }
  return out
}

export function ConceptSortGame({ words, onClose }: ConceptSortGameProps) {
  const t = useTranslations('lectureStudy.game.play')

  const terms = useMemo(() => {
    const seen = new Set<string>()
    const uniq = words.filter(w => {
      if (!w.keyword || !w.description || seen.has(w.keyword)) return false
      seen.add(w.keyword)
      return true
    })
    return shuffle(uniq).slice(0, TUBES)
  }, [words])

  const [pieces, setPieces] = useState<Piece[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [wrongTube, setWrongTube] = useState<string | null>(null)
  const [phase, setPhase] = useState<'play' | 'finished'>('play')
  const seededRef = useRef(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  // 조각 생성 — 각 용어의 정의를 조각으로 쪼개 섞는다
  useEffect(() => {
    if (seededRef.current || terms.length === 0) return
    seededRef.current = true
    let id = 0
    const all: Piece[] = []
    for (const term of terms) {
      for (const seg of splitDefinition(term.description, PIECES_PER_TERM)) {
        id += 1
        all.push({ id, keyword: term.keyword, text: seg, placedIn: null })
      }
    }
    setPieces(shuffle(all))
    return clearTimers
  }, [terms])

  const queue = pieces.filter(p => p.placedIn === null)

  const dropInto = useCallback((keyword: string) => {
    if (phase !== 'play' || selected === null) return
    const piece = pieces.find(p => p.id === selected)
    setSelected(null)
    if (!piece) return

    if (piece.keyword === keyword) {
      setScore(s => s + 60)
      setPieces(prev => prev.map(p => (p.id === piece.id ? { ...p, placedIn: keyword } : p)))
    } else {
      // 오배치 — 감점하고 조각은 대기열에 그대로 남는다
      setScore(s => Math.max(0, s - 20))
      setWrongTube(keyword)
      const timer = setTimeout(() => setWrongTube(null), 550)
      timersRef.current.push(timer)
    }
  }, [phase, selected, pieces])

  // 모든 조각 배치 완료 → 종료
  useEffect(() => {
    if (pieces.length > 0 && queue.length === 0 && phase === 'play') {
      setScore(s => s + 100)   // 완주 보너스
      setPhase('finished')
    }
  }, [queue.length, pieces.length, phase])

  const handleReplay = useCallback(() => {
    clearTimers()
    setPieces(prev => shuffle(prev.map(p => ({ ...p, placedIn: null }))))
    setScore(0)
    setSelected(null)
    setPhase('play')
  }, [])

  const placedCount = pieces.length - queue.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
      <div className="relative w-full max-w-4xl">
        {/* HUD */}
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-white/95 px-4 py-2.5 shadow-lg">
          <span className="shrink-0 rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">
            {t('sortProgress', { done: placedCount, total: pieces.length })}
          </span>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-gray-800">
            {t('sortHint')}
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
          className="relative flex w-full select-none flex-col overflow-hidden rounded-2xl p-[2.5%] shadow-2xl"
          style={{ aspectRatio: '1344/768', backgroundImage: 'url(/game9/sort_bg.png)', backgroundSize: 'cover' }}
        >
          {/* 시험관 (용어별) — 보드 높이의 60% 로 제한해 아래 조각 트레이 자리를 남긴다 */}
          <div className="flex h-[60%] shrink-0 items-end justify-center gap-[3%] pb-[1.5%]">
            {terms.map(term => {
              const inTube = pieces.filter(p => p.placedIn === term.keyword)
              const isWrong = wrongTube === term.keyword
              const full = inTube.length >= PIECES_PER_TERM
              return (
                <button
                  key={term.keyword}
                  type="button"
                  onClick={() => dropInto(term.keyword)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropInto(term.keyword)}
                  className={`relative flex h-full w-[21%] cursor-pointer flex-col items-center justify-end rounded-xl transition-all ${
                    isWrong ? 'animate-[tubeshake_0.5s_ease-in-out]' : ''
                  } ${selected !== null ? 'ring-2 ring-violet-300/70' : ''} ${full ? 'opacity-95' : ''}`}
                >
                  {/* 시험관 이미지 + 채워진 조각 */}
                  <div className="relative flex h-[78%] w-full items-end justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/game9/tube_empty.png" alt="" className="h-full w-auto" draggable={false} />
                    <div className="absolute inset-x-[18%] bottom-[6%] flex flex-col-reverse gap-[3px]">
                      {inTube.map((p, i) => (
                        <div
                          key={p.id}
                          className="rounded-sm bg-violet-400/85 px-1 py-[3px] text-center text-[8px] font-bold leading-tight text-white shadow-sm sm:text-[10px]"
                          style={{ opacity: 0.9 - i * 0.1 }}
                          title={p.text}
                        >
                          <span className="line-clamp-2">{p.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 용어 라벨 — 텍스트 칩 (라벨 PNG 는 세로가 길어 시험관을 밀어낸다) */}
                  <div className="relative mt-1.5 w-full">
                    <span className="block break-keep rounded-lg border border-amber-300/80 bg-amber-50/95 px-1 py-1 text-center text-[10px] font-extrabold leading-tight text-amber-900 shadow-sm sm:text-xs">
                      {term.keyword}
                    </span>
                    {full && (
                      <span className="absolute -right-1 -top-1.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">✓</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* 정의 조각 대기열 */}
          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl bg-white/85 p-[1.4%] backdrop-blur-sm">
            <div className="flex flex-wrap content-start justify-center gap-1.5">
              {queue.slice(0, 8).map(p => (
                <button
                  key={p.id}
                  type="button"
                  draggable
                  onDragStart={() => setSelected(p.id)}
                  onClick={() => setSelected(selected === p.id ? null : p.id)}
                  className={`max-w-[31%] cursor-grab rounded-lg border-2 px-2 py-1 text-left text-[10px] font-semibold leading-tight transition-all active:cursor-grabbing sm:text-xs ${
                    selected === p.id
                      ? 'border-violet-500 bg-violet-100 text-violet-900 shadow-md scale-105'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-violet-300'
                  }`}
                  title={p.text}
                >
                  <span className="line-clamp-2">{p.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 종료 화면 */}
          {phase === 'finished' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-[2px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/game9/tube_empty.png" alt="" className="h-20 w-auto animate-bounce" draggable={false} />
              <p className="text-3xl font-extrabold text-white drop-shadow">{score}{t('scoreSuffix')}</p>
              <p className="text-sm text-white/90">{t('sortAllDone', { total: terms.length })}</p>
              <div className="mt-1 flex gap-2">
                <button onClick={handleReplay} className="rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-violet-600">
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
        @keyframes tubeshake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}
