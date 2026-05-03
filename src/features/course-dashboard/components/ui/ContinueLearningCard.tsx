/**
 * @file ContinueLearningCard.tsx
 * @description "이어서 학습하기" 카드 — 좌측 보더 강조 + 우측 CTA
 * @module features/course-dashboard/components/ui
 * @dependencies lucide-react
 */

'use client'

import { ArrowRight, Calendar } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

interface ContinueLearningCardProps {
  /** 학습 모드 라벨 (예: "회차별 학습") */
  modeLabel: string
  /** 회차 제목 */
  lectureTitle: string
  /** 회차 날짜 (YYYY-MM-DD) */
  lectureDate: string | null
  onContinue: () => void
}

export function ContinueLearningCard({
  modeLabel,
  lectureTitle,
  lectureDate,
  onContinue,
}: ContinueLearningCardProps) {
  const t = useTranslations()
  const locale = useLocale()

  const formattedDate = formatDate(lectureDate, locale)

  return (
    <div className="mb-8 flex items-center justify-between gap-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      {/* Left accent bar */}
      <div className="flex items-center gap-5">
        <div className="h-14 w-1 shrink-0 rounded-full bg-[#6366F1]" />
        <div>
          <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">
            {t('courseDashboard.continueTitle')} · {modeLabel}
          </p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">
            {lectureTitle}
          </h2>
          {formattedDate && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formattedDate}</span>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#6366F1] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5558E6]"
      >
        {t('courseDashboard.continueAction')}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function formatDate(value: string | null, locale: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  if (locale === 'ko') {
    const y = date.getFullYear()
    const m = date.getMonth() + 1
    const d = date.getDate()
    return `${y}년 ${m}월 ${d}일`
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
