/**
 * @file MissionsPanel.tsx
 * @description 주간 미션 헤더 버튼(불꽃) + 드롭다운 패널 — 완료 미션은 행이 흔들리고, 클릭하면 보상 수령
 * @module shared/components/common
 * @dependencies shared/hooks/useMissions, shared/hooks/useQuizMissionLabel
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Flame, Check } from 'lucide-react'
import { useMissions, missionRowState } from '@/shared/hooks/useMissions'
import { useQuizMissionLabel } from '@/shared/hooks/useQuizMissionLabel'
import type { MissionItemDto } from '@/shared/services/gamificationService'

interface MissionsPanelProps {
  courseId: string
}

export function MissionsPanel({ courseId }: MissionsPanelProps) {
  const t = useTranslations('missions')
  const [isOpen, setIsOpen] = useState(false)
  const { weekly, allClear, incorrect, remaining, loading, claim, claimingType, quizTargetLecture, reload } = useMissions(courseId)
  const quizLabel = useQuizMissionLabel(courseId, quizTargetLecture)
  const [justClaimed, setJustClaimed] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // 패널 열 때 최신화 — XP 미지급 활동(반복 게임 등)도 진행도에 반영
  useEffect(() => {
    if (isOpen) void reload()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

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

  const handleClaim = async (m: MissionItemDto) => {
    if (missionRowState(m) !== 'claimable' || claimingType) return
    setJustClaimed(m.type)
    await claim(m.type)
    window.setTimeout(() => setJustClaimed(null), 700)
  }

  const label = (m: MissionItemDto) =>
    m.type === 'quiz' ? quizLabel : t(`types.${m.type}`)

  const hasClaimable = [...weekly, allClear, incorrect].some(
    m => m && missionRowState(m) === 'claimable',
  )

  const renderRow = (m: MissionItemDto) => {
    const state = missionRowState(m)
    const cls = [
      'flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 -mx-2 transition-colors',
      state === 'claimable' ? 'animate-mission-wiggle cursor-pointer bg-[#6366F1]/10' : '',
      justClaimed === m.type ? 'animate-mission-claim' : '',
    ].join(' ')
    return (
      <li key={m.type} onClick={() => handleClaim(m)} className={cls}>
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
              state !== 'pending'
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-gray-300 text-transparent dark:border-gray-600'
            }`}
          >
            {state !== 'pending' && <Check className="animate-mission-check h-3 w-3" strokeWidth={3} />}
          </span>
          <span className={`truncate text-xs font-medium ${state === 'claimed' ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
            {label(m)}
          </span>
        </div>
        {state === 'claimable' ? (
          <span className="shrink-0 rounded-full bg-[#6366F1] px-2.5 py-0.5 text-[11px] font-bold text-white shadow">{t('claim')}</span>
        ) : state === 'pending' ? (
          <span className="shrink-0 text-xs font-semibold tabular-nums text-gray-400">
            {m.progress}/{m.target}
          </span>
        ) : null}
      </li>
    )
  }

  return (
    <div ref={panelRef} className="relative hidden md:block">
      <button
        type="button"
        id="flame-badge"
        onClick={() => setIsOpen(v => !v)}
        className={`relative flex items-center gap-1.5 rounded-xl bg-[#6366F1]/10 px-3.5 py-2.5 text-[#6366F1] transition-colors hover:bg-[#6366F1]/20 ${
          hasClaimable && !isOpen ? 'animate-mission-wiggle' : ''
        }`}
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
        <div className="absolute right-0 top-[calc(100%+8px)] z-[100] w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-1 flex items-baseline justify-between">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-50">{t('title')}</p>
            <p className="text-[11px] text-gray-400">{t('resetInfo')}</p>
          </div>
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{t('subtitle')}</p>

          <ul className="space-y-1">
            {weekly.map(renderRow)}
            {allClear && renderRow(allClear)}
            {incorrect && renderRow(incorrect)}
          </ul>

          {loading && <p className="mt-2 text-center text-[11px] text-gray-400">…</p>}
          <div className="absolute -top-2 right-6 h-0 w-0 border-b-[8px] border-l-[8px] border-r-[8px] border-b-white border-l-transparent border-r-transparent dark:border-b-gray-900" />
        </div>
      )}
    </div>
  )
}
