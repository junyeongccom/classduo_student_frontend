/**
 * @file MissionsDashboardCard.tsx
 * @description 과목 대시보드 주간 미션 카드 — 완료 미션은 행이 흔들리고, 클릭하면 보상 수령 연출과 함께 XP 지급
 * @module features/course-dashboard/components/ui
 * @dependencies shared/hooks/useMissions, features/lecture-study(useLectures — 주차/차시 라벨)
 */
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Flame, Check } from 'lucide-react'
import { useMissions, missionRowState } from '@/shared/hooks/useMissions'
import { useQuizMissionLabel } from '@/shared/hooks/useQuizMissionLabel'
import type { MissionItemDto } from '@/shared/services/gamificationService' 

interface RowVisual {
  state: 'claimable' | 'claimed' | 'pending'
  justClaimed: boolean
}

function rowClass(v: RowVisual, base: string): string {
  const parts = [base]
  if (v.state === 'claimable') parts.push('animate-mission-wiggle cursor-pointer bg-[#6366F1]/10')
  if (v.justClaimed) parts.push('animate-mission-claim')
  return parts.join(' ')
}

/* ─────────────────────────────────────────────────────────────
   Scaled 디자인판 (899.25×370, ScaledCanvas 좌표계 px)
   ───────────────────────────────────────────────────────────── */
export function MissionsDashboardCard({ courseId }: { courseId: string }) {
  const t = useTranslations('missions')
  const { weekly, allClear, incorrect, claim, claimingType, quizTargetLecture } = useMissions(courseId)
  const quizLabel = useQuizMissionLabel(courseId, quizTargetLecture)
  const [justClaimed, setJustClaimed] = useState<string | null>(null)

  const handleClaim = async (m: MissionItemDto) => {
    if (missionRowState(m) !== 'claimable' || claimingType) return
    setJustClaimed(m.type)
    await claim(m.type)
    window.setTimeout(() => setJustClaimed(null), 700)
  }

  const label = (m: MissionItemDto) =>
    m.type === 'quiz' ? quizLabel : t(`types.${m.type}`)

  const renderRow = (m: MissionItemDto) => {
    const v: RowVisual = { state: missionRowState(m), justClaimed: justClaimed === m.type }
    return (
      <li
        key={m.type}
        onClick={() => handleClaim(m)}
        className={rowClass(v, 'flex items-center justify-between gap-[16px] rounded-[14px] px-[16px] py-[10px] -mx-[16px] transition-colors')}
      >
        <span className="flex min-w-0 items-center gap-[16px]">
          <span
            className={`flex shrink-0 items-center justify-center rounded-full border-[3px] ${
              v.state !== 'pending'
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-gray-300 text-transparent'
            }`}
            style={{ width: 36, height: 36 }}
          >
            {v.state !== 'pending' && <Check className="animate-mission-check" style={{ width: 22, height: 22 }} strokeWidth={3.5} />}
          </span>
          <span className={`truncate text-[26px] font-semibold ${v.state === 'claimed' ? 'text-[#ababab] line-through' : 'text-black'}`}>
            {label(m)}
          </span>
        </span>
        {v.state === 'claimable' ? (
          <span className="shrink-0 rounded-full bg-[#6366F1] px-[20px] py-[6px] text-[22px] font-bold text-white shadow-md">
            {t('claim')}
          </span>
        ) : v.state === 'pending' ? (
          <span className="shrink-0 text-[26px] font-semibold tabular-nums text-[#9ca3af]">
            {m.progress}/{m.target}
          </span>
        ) : null}
      </li>
    )
  }

  return (
    <div
      className="flex h-full w-full flex-col rounded-[24px] bg-white px-[44px] py-[30px] shadow-[0_4px_20px_rgba(15,23,42,0.06)]"
      style={{ fontFamily: 'Pretendard, sans-serif' }}
    >
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-[14px]">
          <span className="flex items-center justify-center rounded-[16px] bg-[#6366F1]/10" style={{ width: 56, height: 56 }}>
            <Flame className="fill-[#6366F1] text-[#6366F1]" style={{ width: 32, height: 32 }} strokeWidth={2.2} />
          </span>
          <span className="text-[34px] font-bold text-black">{t('title')}</span>
        </span>
        <span className="text-[22px] font-medium text-[#ababab]">{t('resetInfo')}</span>
      </div>

      <ul className="mt-[18px] flex flex-col gap-[6px]">
        {weekly.map(renderRow)}
      </ul>

      <div className="mt-auto flex items-stretch gap-[16px] pt-[14px]">
        {allClear && (
          <div
            onClick={() => handleClaim(allClear)}
            className={rowClass(
              { state: missionRowState(allClear), justClaimed: justClaimed === allClear.type },
              'flex flex-1 items-center justify-between rounded-[14px] px-[20px] py-[12px] text-[22px] font-bold ' +
                (missionRowState(allClear) === 'claimable' ? '' : missionRowState(allClear) === 'claimed' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'),
            )}
          >
            <span className={missionRowState(allClear) === 'claimable' ? 'text-[#6366F1]' : ''}>{t('types.all_clear')}</span>
            {missionRowState(allClear) === 'claimable'
              ? <span className="rounded-full bg-[#6366F1] px-[16px] py-[4px] text-[20px] font-bold text-white">{t('claim')}</span>
              : missionRowState(allClear) === 'claimed' ? <Check style={{ width: 24, height: 24 }} strokeWidth={3} /> : null}
          </div>
        )}
        {incorrect && (
          <div
            onClick={() => handleClaim(incorrect)}
            className={rowClass(
              { state: missionRowState(incorrect), justClaimed: justClaimed === incorrect.type },
              'flex flex-1 items-center justify-between rounded-[14px] bg-amber-50 px-[20px] py-[12px] text-[22px] font-bold',
            )}
          >
            <span className={missionRowState(incorrect) === 'claimed' ? 'text-gray-400 line-through' : 'text-amber-700'}>
              {t('types.incorrect_review')}
            </span>
            {missionRowState(incorrect) === 'claimable'
              ? <span className="rounded-full bg-amber-500 px-[16px] py-[4px] text-[20px] font-bold text-white">{t('claim')}</span>
              : missionRowState(incorrect) === 'claimed' ? <Check className="text-emerald-600" style={{ width: 24, height: 24 }} strokeWidth={3} /> : null}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   모바일판 — 일반 반응형 카드
   ───────────────────────────────────────────────────────────── */
export function MissionsDashboardCardMobile({ courseId }: { courseId: string }) {
  const t = useTranslations('missions')
  const { weekly, allClear, incorrect, claim, claimingType, quizTargetLecture } = useMissions(courseId)
  const quizLabel = useQuizMissionLabel(courseId, quizTargetLecture)
  const [justClaimed, setJustClaimed] = useState<string | null>(null)

  const handleClaim = async (m: MissionItemDto) => {
    if (missionRowState(m) !== 'claimable' || claimingType) return
    setJustClaimed(m.type)
    await claim(m.type)
    window.setTimeout(() => setJustClaimed(null), 700)
  }

  const label = (m: MissionItemDto) =>
    m.type === 'quiz' ? quizLabel : t(`types.${m.type}`)

  const renderRow = (m: MissionItemDto) => {
    const v: RowVisual = { state: missionRowState(m), justClaimed: justClaimed === m.type }
    return (
      <li
        key={m.type}
        onClick={() => handleClaim(m)}
        className={rowClass(v, 'flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 -mx-2 transition-colors')}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            v.state !== 'pending' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 text-transparent dark:border-gray-600'
          }`}>
            {v.state !== 'pending' && <Check className="animate-mission-check h-3 w-3" strokeWidth={3} />}
          </span>
          <span className={`truncate text-sm font-medium ${v.state === 'claimed' ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
            {label(m)}
          </span>
        </span>
        {v.state === 'claimable' ? (
          <span className="shrink-0 rounded-full bg-[#6366F1] px-2.5 py-0.5 text-xs font-bold text-white shadow">{t('claim')}</span>
        ) : v.state === 'pending' ? (
          <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-400">{m.progress}/{m.target}</span>
        ) : null}
      </li>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.06)] dark:bg-gray-900">
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6366F1]/10">
            <Flame className="h-[18px] w-[18px] fill-[#6366F1] text-[#6366F1]" strokeWidth={2.2} />
          </span>
          <span className="text-base font-bold text-gray-900 dark:text-gray-50">{t('title')}</span>
        </span>
        <span className="text-[11px] text-gray-400">{t('resetInfo')}</span>
      </div>

      <ul className="mt-2.5 space-y-1">
        {weekly.map(renderRow)}
        {allClear && renderRow(allClear)}
        {incorrect && renderRow(incorrect)}
      </ul>
    </div>
  )
}
