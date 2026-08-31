/**
 * @file MissionsDashboardCard.tsx
 * @description 과목 대시보드 주간 미션 카드 — 캘린더 아래 배치 (scaled 디자인판 + 모바일판)
 * @module features/course-dashboard/components/ui
 * @dependencies shared/hooks/useMissions, next-intl
 */
'use client'

import { useTranslations } from 'next-intl'
import { Flame, Check } from 'lucide-react'
import { useMissions } from '@/shared/hooks/useMissions'

/* ─────────────────────────────────────────────────────────────
   Scaled 디자인판 (899.25×370, ScaledCanvas 좌표계 px) — 캘린더 카드와 톤 통일
   ───────────────────────────────────────────────────────────── */
export function MissionsDashboardCard({ courseId }: { courseId: string }) {
  const t = useTranslations('missions')
  const { weekly, allClear, incorrect } = useMissions(courseId)

  return (
    <div
      className={`flex h-full w-full flex-col rounded-[24px] bg-white px-[44px] py-[32px] shadow-[0_4px_20px_rgba(15,23,42,0.06)] ${
        allClear?.completed ? 'animate-mission-allclear' : ''
      }`}
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

      <ul className="mt-[24px] flex flex-col gap-[18px]">
        {weekly.map(m => (
          <li key={m.type} className="flex items-center justify-between gap-[16px]">
            <span className="flex min-w-0 items-center gap-[16px]">
              <span
                className={`flex shrink-0 items-center justify-center rounded-full border-[3px] ${
                  m.completed
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-gray-300 text-transparent'
                }`}
                style={{ width: 36, height: 36 }}
              >
                {m.completed && <Check className="animate-mission-check" style={{ width: 22, height: 22 }} strokeWidth={3.5} />}
              </span>
              <span className={`truncate text-[26px] font-semibold ${m.completed ? 'text-[#ababab] line-through' : 'text-black'}`}>
                {t(`types.${m.type}`)}
              </span>
            </span>
            <span className="shrink-0 text-[26px] font-semibold tabular-nums text-[#6b7280]">
              {m.progress}/{m.target}
              <span className="ml-[12px] font-bold text-emerald-600">+{m.bonus_xp}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex items-center gap-[16px] pt-[20px]">
        {allClear && (
          <span className={`flex flex-1 items-center justify-between rounded-[14px] px-[20px] py-[12px] text-[22px] font-bold ${
            allClear.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'
          }`}>
            <span>{t('types.all_clear')}</span>
            <span>+{allClear.bonus_xp} XP</span>
          </span>
        )}
        {incorrect && (
          <span className="flex flex-1 items-center justify-between rounded-[14px] bg-amber-50 px-[20px] py-[12px] text-[22px] font-bold">
            <span className={incorrect.completed ? 'text-gray-400 line-through' : 'text-amber-700'}>
              {t('types.incorrect_review')}
            </span>
            <span className="text-amber-600">+{incorrect.bonus_xp}</span>
          </span>
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
  const { weekly, allClear, incorrect } = useMissions(courseId)

  return (
    <div className={`rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.06)] dark:bg-gray-900 ${
      allClear?.completed ? 'animate-mission-allclear' : ''
    }`}>
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6366F1]/10">
            <Flame className="h-[18px] w-[18px] fill-[#6366F1] text-[#6366F1]" strokeWidth={2.2} />
          </span>
          <span className="text-base font-bold text-gray-900 dark:text-gray-50">{t('title')}</span>
        </span>
        <span className="text-[11px] text-gray-400">{t('resetInfo')}</span>
      </div>

      <ul className="mt-3 space-y-2.5">
        {weekly.map(m => (
          <li key={m.type} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                m.completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 text-transparent dark:border-gray-600'
              }`}>
                {m.completed && <Check className="animate-mission-check h-3 w-3" strokeWidth={3} />}
              </span>
              <span className={`truncate text-sm font-medium ${m.completed ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                {t(`types.${m.type}`)}
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-500 dark:text-gray-400">
              {m.progress}/{m.target}
              <span className="ml-1.5 font-bold text-emerald-600 dark:text-emerald-400">+{m.bonus_xp}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-col gap-2">
        {allClear && (
          <span className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold ${
            allClear.completed
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          }`}>
            <span>{t('types.all_clear')}</span>
            <span>+{allClear.bonus_xp} XP</span>
          </span>
        )}
        {incorrect && (
          <span className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold dark:bg-amber-900/20">
            <span className={incorrect.completed ? 'text-gray-400 line-through' : 'text-amber-700 dark:text-amber-300'}>
              {t('types.incorrect_review')}
            </span>
            <span className="text-amber-600 dark:text-amber-400">+{incorrect.bonus_xp}</span>
          </span>
        )}
      </div>
    </div>
  )
}
