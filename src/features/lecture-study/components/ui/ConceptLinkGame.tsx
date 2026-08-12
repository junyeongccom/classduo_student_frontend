/**
 * @file ConceptLinkGame.tsx
 * @description 개념 연결 — 별자리 보드에서 용어 노드와 정의 노드를 선으로 이어 맞추는 학습 게임
 * @module features/lecture-study/components/ui
 * @dependencies next-intl, /public/game10 에셋
 *
 * 선 연결(line/zip) 포맷을 학습에 접목: 좌측 용어 노드에서 우측 정의 노드로 선을 그어 짝을 맞춘다.
 * 연결이 맞으면 별자리 선이 남고, 틀리면 선이 튕겨 나간다. 카드매칭(기억)과 달리 양쪽이 항상 보이는
 * "동시 대조" 과제라 정의를 읽고 비교하는 행동이 강제된다.
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface GameWord {
  keyword: string
  description: string
}

interface ConceptLinkGameProps {
  words: GameWord[]
  onClose: (score: number | null) => void
}

const PAIRS = 5

interface NodePos {
  keyword: string
  /** 보드 좌표 % */
  x: number
  y: number
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function ConceptLinkGame({ words, onClose }: ConceptLinkGameProps) {
  const t = useTranslations('lectureStudy.game.play')

  const pairs = useMemo(() => {
    const seen = new Set<string>()
    const uniq = words.filter(w => {
      if (!w.keyword || !w.description || seen.has(w.keyword)) return false
      seen.add(w.keyword)
      return true
    })
    return shuffle(uniq).slice(0, PAIRS)
  }, [words])

  /** 좌측 용어 노드 / 우측 정의 노드 좌표 (정의는 섞어 배치) */
  const { termNodes, defNodes } = useMemo(() => {
    const n = pairs.length
    const gap = n > 0 ? 78 / n : 0
    const termNodes: NodePos[] = pairs.map((p, i) => ({ keyword: p.keyword, x: 15, y: 14 + gap * i + gap / 2 }))
    const defNodes: NodePos[] = shuffle(pairs).map((p, i) => ({ keyword: p.keyword, x: 85, y: 14 + gap * i + gap / 2 }))
    return { termNodes, defNodes }
  }, [pairs])

  const descOf = useCallback((keyword: string) => pairs.find(p => p.keyword === keyword)?.description ?? '', [pairs])

  const [linked, setLinked] = useState<string[]>([])
  const [pickedTerm, setPickedTerm] = useState<string | null>(null)
  const [wrongFlash, setWrongFlash] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }
  useEffect(() => clearTimers, [])

  const done = pairs.length > 0 && linked.length >= pairs.length

  const tryLink = useCallback((defKeyword: string) => {
    if (!pickedTerm || done) return
    setAttempts(a => a + 1)
    if (pickedTerm === defKeyword) {
      setLinked(prev => [...prev, defKeyword])
      setScore(s => s + 100)
      setPickedTerm(null)
    } else {
      setScore(s => Math.max(0, s - 20))
      setWrongFlash(defKeyword)
      const timer = setTimeout(() => {
        setWrongFlash(null)
        setPickedTerm(null)
      }, 520)
      timersRef.current.push(timer)
    }
  }, [pickedTerm, done])

  const handleReplay = useCallback(() => {
    clearTimers()
    setLinked([]); setPickedTerm(null); setScore(0); setAttempts(0)
  }, [])

  const nodeOf = (list: NodePos[], keyword: string) => list.find(n => n.keyword === keyword)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
      <div className="relative w-full max-w-4xl">
        {/* HUD */}
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-white/95 px-4 py-2.5 shadow-lg">
          <span className="shrink-0 rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
            {t('linkProgress', { done: linked.length, total: pairs.length })}
          </span>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-gray-800">
            {pickedTerm ? t('linkPicked', { word: pickedTerm }) : t('linkHint')}
          </p>
          <span className="shrink-0 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
            {score}{t('scoreSuffix')}
          </span>
          <button
            onClick={() => onClose(done ? score : null)}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 보드 */}
        <div
          className="relative w-full select-none overflow-hidden rounded-2xl shadow-2xl"
          style={{ aspectRatio: '1344/768', backgroundImage: 'url(/game10/link_bg.png)', backgroundSize: 'cover' }}
        >
          {/* 연결선 (완성된 짝) */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {linked.map(kw => {
              const a = nodeOf(termNodes, kw)
              const b = nodeOf(defNodes, kw)
              if (!a || !b) return null
              return (
                <line
                  key={kw}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="rgba(103,232,249,0.85)" strokeWidth="0.5" strokeLinecap="round"
                  className="animate-[linkdraw_0.5s_ease-out]"
                />
              )
            })}
          </svg>

          {/* 좌측: 용어 노드 */}
          {termNodes.map(node => {
            const isLinked = linked.includes(node.keyword)
            const isPicked = pickedTerm === node.keyword
            return (
              <button
                key={node.keyword}
                type="button"
                disabled={isLinked}
                onClick={() => setPickedTerm(isPicked ? null : node.keyword)}
                className={`absolute flex w-[26%] items-center gap-1.5 transition-all ${
                  isLinked ? 'opacity-55' : 'hover:scale-105'
                } ${isPicked ? 'scale-110' : ''}`}
                style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/game10/node_term.png" alt="" className="w-[22%] shrink-0" draggable={false} />
                <span className={`min-w-0 flex-1 break-keep rounded-lg px-1.5 py-1 text-left text-[11px] font-extrabold leading-tight sm:text-sm ${
                  isPicked ? 'bg-cyan-400/90 text-slate-900' : 'bg-slate-900/70 text-cyan-100'
                }`}>
                  {node.keyword}
                </span>
              </button>
            )
          })}

          {/* 우측: 정의 노드 */}
          {defNodes.map(node => {
            const isLinked = linked.includes(node.keyword)
            const isWrong = wrongFlash === node.keyword
            return (
              <button
                key={node.keyword}
                type="button"
                disabled={isLinked}
                onClick={() => tryLink(node.keyword)}
                className={`absolute flex w-[30%] items-center gap-1.5 transition-all ${
                  isLinked ? 'opacity-55' : pickedTerm ? 'hover:scale-105' : ''
                } ${isWrong ? 'animate-[linkshake_0.5s_ease-in-out]' : ''}`}
                style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                <span className={`min-w-0 flex-1 break-keep rounded-lg px-1.5 py-1 text-right text-[10px] font-semibold leading-tight sm:text-xs ${
                  isWrong ? 'bg-rose-500/85 text-white' : isLinked ? 'bg-emerald-500/70 text-white' : 'bg-slate-900/70 text-amber-100'
                }`}>
                  <span className="line-clamp-3">{descOf(node.keyword)}</span>
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/game10/node_def.png" alt="" className="w-[18%] shrink-0" draggable={false} />
              </button>
            )
          })}

          {/* 종료 화면 */}
          {done && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/65 backdrop-blur-[2px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/game10/node_term.png" alt="" className="w-16 animate-bounce" draggable={false} />
              <p className="text-3xl font-extrabold text-white drop-shadow">{score}{t('scoreSuffix')}</p>
              <p className="text-sm text-white/90">{t('linkAllDone', { total: pairs.length, attempts })}</p>
              <div className="mt-1 flex gap-2">
                <button onClick={handleReplay} className="rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-600">
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
        @keyframes linkdraw {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes linkshake {
          0%, 100% { transform: translate(-50%, -50%); }
          25% { transform: translate(calc(-50% - 6px), -50%); }
          75% { transform: translate(calc(-50% + 6px), -50%); }
        }
      `}</style>
    </div>
  )
}
