/**
 * @file TopHeaderCards.tsx
 * @description 기말 대비 상단 3카드 — D-day, Mastery 진행, 추천 학습
 * @module features/exam-prep-final/components/ui
 * @dependencies lucide-react
 */

'use client'

import { CalendarClock, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ExamPrepData } from '../../types'

interface TopHeaderCardsProps {
  data: ExamPrepData
  onRecommendedClick: () => void
}

export function TopHeaderCards({ data, onRecommendedClick }: TopHeaderCardsProps) {
  const t = useTranslations()
  const masteryPercent =
    data.totalCoreTests > 0
      ? Math.round((data.masteredCount / data.totalCoreTests) * 100)
      : 0
  const formattedExamDate = formatKoreanDate(data.examDate)

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {/* D-day card (보라 그라데이션) */}
      <div className="relative min-h-[200px] overflow-hidden rounded-3xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] px-7 py-7 text-white shadow-md shadow-indigo-500/20">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider opacity-80">
          {t('examPrepFinal.ddayCardTitle')}
        </p>
        <p className="text-7xl font-black tracking-tight leading-none">
          D-{data.ddays}
        </p>
        <p className="mt-4 text-sm opacity-80">{formattedExamDate}</p>
        <CalendarClock className="absolute -right-3 bottom-3 h-28 w-28 opacity-15" />
      </div>

      {/* Mastery progress card */}
      <div className="flex min-h-[200px] flex-col justify-between rounded-3xl border border-gray-200 bg-white px-7 py-7 dark:border-gray-700 dark:bg-gray-900">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t('examPrepFinal.masteryCardTitle')}
          </p>
          <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t('examPrepFinal.masteryReached')}{' '}
            <span className="font-bold">
              {data.masteredCount} / {data.totalCoreTests}
            </span>
          </p>
        </div>
        <div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${masteryPercent}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-400">
            {masteryPercent}
            {t('examPrepFinal.completedSuffix')}
          </p>
        </div>
      </div>

      {/* Recommended card */}
      <div className="flex min-h-[200px] flex-col rounded-3xl border border-gray-200 bg-white px-7 py-7 dark:border-gray-700 dark:bg-gray-900">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {t('examPrepFinal.recommendedTitle')}
        </p>
        {data.recommendedTest && (
          <p className="mt-3 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-50">
            <Zap className="h-5 w-5 shrink-0 fill-[#6366F1] text-[#6366F1]" />
            <span className="truncate">
              {data.recommendedTest.weekNo}주차{' '}
              {String(data.recommendedTest.sessionNo).padStart(2, '0')}차시 ·{' '}
              {data.recommendedTest.lectureTitle}
            </span>
          </p>
        )}
        <button
          type="button"
          onClick={onRecommendedClick}
          className="mt-auto rounded-xl bg-[#6366F1] py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#5558E6]"
        >
          {t('examPrepFinal.recommendedStart')}
        </button>
      </div>
    </div>
  )
}

function formatKoreanDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}
