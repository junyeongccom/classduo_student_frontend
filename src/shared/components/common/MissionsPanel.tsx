/**
 * @file MissionsPanel.tsx
 * @description 주간 미션 헤더 버튼 + 드롭다운 패널 (2026-2 성장 시스템) — 조회 시 서버가 보너스 lazy 지급
 * @module shared/components/common
 * @dependencies gamificationService.fetchMyMissions, CustomEvent('xp-gained')
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Flame, Check } from 'lucide-react'
import { useMissions } from '@/shared/hooks/useMissions'

interface MissionsPanelProps {
  courseId: string
}

export function MissionsPanel({ courseId }: MissionsPanelProps) {
  const t = useTranslations('missions')
  const [isOpen, setIsOpen] = useState(false)
  const { weekly, allClear, incorrect, remaining, loading } = useMissions(courseId)
  const panelRef = useRef<HTMLDivElement>(null)

  // 외부 클릭 닫기
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  return (
    <div ref={panelRef} className="relative hidden md:block">
      <button
        type="button"
        id="flame-badge"
        onClick={() => setIsOpen(v => !v)}
        className="relative flex items-center gap-1.5 rounded-xl bg-[#6366F1]/10 px-3.5 py-2.5 text-[#6366F1] transition-colors hover:bg-[#6366F1]/20"
        aria-label={t('buttonLabel')}
      >
        <Flame className="h-5 w-5 fill-current" />
        {remaining > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#6366F1] text-[10px] font-bold text-white">
            {remaining}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 top-[calc(100%+8px)] z-[100] w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-900 ${
            allClear?.completed ? 'animate-mission-allclear' : ''
          }`}
        >
          <div className="mb-1 flex items-baseline justify-between">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-50">{t('title')}</p>
            <p className="text-[11px] text-gray-400">{t('resetInfo')}</p>
          </div>
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{t('subtitle')}</p>

          <ul className="space-y-2.5">
            {weekly.map(m => (
              <li key={m.type} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      m.completed
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-gray-300 text-transparent dark:border-gray-600'
                    }`}
                  >
                    {m.completed && <Check className="animate-mission-check h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className={`truncate text-xs font-medium ${m.completed ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                    {t(`types.${m.type}`)}
                  </span>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-gray-500 dark:text-gray-400">
                  {m.progress}/{m.target}
                  <span className="ml-1.5 font-bold text-emerald-600 dark:text-emerald-400">+{m.bonus_xp}</span>
                </span>
              </li>
            ))}
          </ul>

          {allClear && (
            <div className={`mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold ${
              allClear.completed
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              <span>{t('types.all_clear')}</span>
              <span>+{allClear.bonus_xp} XP</span>
            </div>
          )}

          {incorrect && (
            <div className="mt-2 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-xs dark:bg-amber-900/20">
              <span className={`font-medium ${incorrect.completed ? 'text-gray-400 line-through' : 'text-amber-700 dark:text-amber-300'}`}>
                {t('types.incorrect_review')}
              </span>
              <span className="font-bold text-amber-600 dark:text-amber-400">+{incorrect.bonus_xp}</span>
            </div>
          )}

          {loading && <p className="mt-2 text-center text-[11px] text-gray-400">…</p>}
          <div className="absolute -top-2 right-6 h-0 w-0 border-b-[8px] border-l-[8px] border-r-[8px] border-b-white border-l-transparent border-r-transparent dark:border-b-gray-900" />
        </div>
      )}
    </div>
  )
}
