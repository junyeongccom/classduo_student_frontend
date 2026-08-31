/**
 * @file MissionsDashboardCard.tsx
 * @description 과목 대시보드 주간 미션 카드 — 완료 미션은 행이 흔들리고, 클릭하면 보상 수령 연출과 함께 XP 지급
 * @module features/course-dashboard/components/ui
 * @dependencies shared/hooks/useMissions, features/lecture-study(useLectures — 주차/차시 라벨)
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Flame, Check, ChevronRight, Sparkles } from 'lucide-react'
import { useMissions, missionRowState } from '@/shared/hooks/useMissions'
import { useMissionLabels } from '@/shared/hooks/useQuizMissionLabel'
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
  const router = useRouter()
  const { weekly, allClear, claim, claimingType, quizTargetLecture } = useMissions(courseId)
  const { ws, quizLabel, gamesLabel } = useMissionLabels(courseId, quizTargetLecture)
  const [justClaimed, setJustClaimed] = useState<string | null>(null)

  const goToTarget = (tab: 'quiz' | 'game') => {
    if (!quizTargetLecture) return
    router.push(`/studyspace/course/${courseId}/lecture/${quizTargetLecture.lecture_id}?tab=${tab}`)
  }

  const handleRowClick = async (m: MissionItemDto) => {
    const state = missionRowState(m)
    if (state === 'claimable') {
      if (claimingType) return
      setJustClaimed(m.type)
      await claim(m.type)
      window.setTimeout(() => setJustClaimed(null), 700)
      return
    }
    // 진행 중인 목표형 미션은 바로가기
    if (state === 'pending' && m.type === 'quiz') goToTarget('quiz')
    if (state === 'pending' && m.type === 'games') goToTarget('game')
  }

  const label = (m: MissionItemDto) =>
    m.type === 'quiz' ? quizLabel : m.type === 'games' ? gamesLabel : t(`types.${m.type}`)

  const renderRow = (m: MissionItemDto) => {
    const v: RowVisual = { state: missionRowState(m), justClaimed: justClaimed === m.type }
    const hasShortcut = v.state === 'pending' && (m.type === 'quiz' || m.type === 'games') && !!quizTargetLecture
    return (
      <li
        key={m.type}
        onClick={() => handleRowClick(m)}
        className={rowClass(v, `flex items-center justify-between gap-[16px] rounded-[14px] px-[16px] py-[10px] -mx-[16px] transition-colors ${hasShortcut ? 'cursor-pointer hover:bg-gray-50' : ''}`)}
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
          <span className="flex shrink-0 items-center gap-[12px]">
            <span className="text-[26px] font-semibold tabular-nums text-[#9ca3af]">
              {m.progress}/{m.target}
            </span>
            {hasShortcut && (
              <span className="flex items-center gap-[2px] rounded-full border border-[#6366F1]/40 px-[14px] py-[4px] text-[20px] font-bold text-[#6366F1]">
                {t('go')}
                <ChevronRight style={{ width: 20, height: 20 }} strokeWidth={2.5} />
              </span>
            )}
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
            onClick={() => handleRowClick(allClear)}
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

      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   모바일판 — 일반 반응형 카드
   ───────────────────────────────────────────────────────────── */
export function MissionsDashboardCardMobile({ courseId }: { courseId: string }) {
  const t = useTranslations('missions')
  const router = useRouter()
  const { weekly, allClear, claim, claimingType, quizTargetLecture } = useMissions(courseId)
  const { quizLabel, gamesLabel } = useMissionLabels(courseId, quizTargetLecture)
  const [justClaimed, setJustClaimed] = useState<string | null>(null)

  const handleRowClick = async (m: MissionItemDto) => {
    const state = missionRowState(m)
    if (state === 'claimable') {
      if (claimingType) return
      setJustClaimed(m.type)
      await claim(m.type)
      window.setTimeout(() => setJustClaimed(null), 700)
      return
    }
    if (state === 'pending' && quizTargetLecture && (m.type === 'quiz' || m.type === 'games')) {
      router.push(`/studyspace/course/${courseId}/lecture/${quizTargetLecture.lecture_id}?tab=${m.type === 'quiz' ? 'quiz' : 'game'}`)
    }
  }

  const label = (m: MissionItemDto) =>
    m.type === 'quiz' ? quizLabel : m.type === 'games' ? gamesLabel : t(`types.${m.type}`)

  const renderRow = (m: MissionItemDto) => {
    const v: RowVisual = { state: missionRowState(m), justClaimed: justClaimed === m.type }
    return (
      <li
        key={m.type}
        onClick={() => handleRowClick(m)}
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
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="text-sm font-semibold tabular-nums text-gray-400">{m.progress}/{m.target}</span>
            {(m.type === 'quiz' || m.type === 'games') && quizTargetLecture && (
              <ChevronRight className="h-4 w-4 text-[#6366F1]" strokeWidth={2.5} />
            )}
          </span>
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
      </ul>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   히든 미션 박스 — 오답 정리 (주간 미션과 분리, 앰버 톤)
   ───────────────────────────────────────────────────────────── */
export function HiddenMissionCard({ courseId }: { courseId: string }) {
  const t = useTranslations('missions')
  const { incorrect, claim, claimingType } = useMissions(courseId)
  const [justClaimed, setJustClaimed] = useState(false)
  if (!incorrect) return null
  const state = missionRowState(incorrect)

  const handleClick = async () => {
    if (state !== 'claimable' || claimingType) return
    setJustClaimed(true)
    await claim(incorrect.type)
    window.setTimeout(() => setJustClaimed(false), 700)
  }

  return (
    <div
      onClick={handleClick}
      className={`flex h-full w-full items-center justify-between rounded-[20px] bg-gradient-to-r from-amber-50 to-orange-50 px-[36px] shadow-[0_4px_20px_rgba(15,23,42,0.06)] ${
        state === 'claimable' ? 'animate-mission-wiggle cursor-pointer ring-2 ring-amber-400' : ''
      } ${justClaimed ? 'animate-mission-claim' : ''}`}
      style={{ fontFamily: 'Pretendard, sans-serif' }}
    >
      <span className="flex min-w-0 items-center gap-[16px]">
        <Sparkles className="shrink-0 text-amber-500" style={{ width: 30, height: 30 }} />
        <span className="text-[22px] font-bold text-amber-600">{t('hiddenTitle')}</span>
        <span className={`truncate text-[24px] font-semibold ${state === 'claimed' ? 'text-gray-400 line-through' : 'text-amber-800'}`}>
          {t('types.incorrect_review')}
        </span>
      </span>
      {state === 'claimable' ? (
        <span className="shrink-0 rounded-full bg-amber-500 px-[20px] py-[6px] text-[22px] font-bold text-white shadow-md">{t('claim')}</span>
      ) : state === 'claimed' ? (
        <Check className="shrink-0 text-emerald-600" style={{ width: 28, height: 28 }} strokeWidth={3} />
      ) : (
        <span className="shrink-0 text-[22px] font-semibold text-amber-400">{t('hiddenSubtitle')}</span>
      )}
    </div>
  )
}

export function HiddenMissionCardMobile({ courseId }: { courseId: string }) {
  const t = useTranslations('missions')
  const { incorrect, claim, claimingType } = useMissions(courseId)
  const [justClaimed, setJustClaimed] = useState(false)
  if (!incorrect) return null
  const state = missionRowState(incorrect)

  const handleClick = async () => {
    if (state !== 'claimable' || claimingType) return
    setJustClaimed(true)
    await claim(incorrect.type)
    window.setTimeout(() => setJustClaimed(false), 700)
  }

  return (
    <div
      onClick={handleClick}
      className={`flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-[0_4px_20px_rgba(15,23,42,0.06)] dark:from-amber-900/20 dark:to-orange-900/20 ${
        state === 'claimable' ? 'animate-mission-wiggle cursor-pointer ring-2 ring-amber-400' : ''
      } ${justClaimed ? 'animate-mission-claim' : ''}`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
        <span className="text-xs font-bold text-amber-600">{t('hiddenTitle')}</span>
        <span className={`truncate text-sm font-semibold ${state === 'claimed' ? 'text-gray-400 line-through' : 'text-amber-800 dark:text-amber-200'}`}>
          {t('types.incorrect_review')}
        </span>
      </span>
      {state === 'claimable' ? (
        <span className="shrink-0 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-white shadow">{t('claim')}</span>
      ) : state === 'claimed' ? (
        <Check className="h-5 w-5 shrink-0 text-emerald-600" strokeWidth={3} />
      ) : null}
    </div>
  )
}
