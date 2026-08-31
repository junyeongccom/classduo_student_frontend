/**
 * @file XpToastHost.tsx
 * @description XP 획득 연출 호스트 — 'xp-gained' CustomEvent 수신 → "+N XP" 플로팅 배지 + 헤더 갱신 트리거
 * @module shared/components/common
 * @dependencies window CustomEvent('xp-gained'), 'exam-prep-rewards-refresh'
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'

interface XpToast {
  id: number
  xp: number
}

const TOAST_LIFETIME_MS = 2200

/**
 * studyspace layout에 1회 마운트.
 * 발화: window.dispatchEvent(new CustomEvent('xp-gained', { detail: { xp: 30 } }))
 * 수신 즉시 'exam-prep-rewards-refresh'를 재발행해 상단 XP 바가 차오르게 한다(기존 갱신 채널 재사용).
 */
export function XpToastHost() {
  const [toasts, setToasts] = useState<XpToast[]>([])
  const nextId = useRef(1)
  const reduceMotion = useRef(false)

  useEffect(() => {
    try {
      reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch { /* noop */ }

    const handler = (e: Event) => {
      const xp = Number((e as CustomEvent).detail?.xp ?? 0)
      if (!Number.isFinite(xp) || xp <= 0) return
      const id = nextId.current++
      setToasts(prev => [...prev.slice(-2), { id, xp }])
      // 헤더 XP 바 갱신 (기존 채널 — 진행바 transition이 카운트업 연출을 담당)
      window.dispatchEvent(new Event('exam-prep-rewards-refresh'))
      window.setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, TOAST_LIFETIME_MS)
    }
    window.addEventListener('xp-gained', handler)
    return () => window.removeEventListener('xp-gained', handler)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-6 top-16 z-[110] flex flex-col items-end gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-1.5 rounded-full bg-gray-900/90 px-4 py-2 text-white shadow-xl backdrop-blur-sm dark:bg-white/90 dark:text-gray-900 ${
            reduceMotion.current ? '' : 'animate-xp-toast'
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-400 dark:text-amber-500" />
          <span className="text-sm font-bold tabular-nums">+{t.xp} XP</span>
        </div>
      ))}
    </div>
  )
}
