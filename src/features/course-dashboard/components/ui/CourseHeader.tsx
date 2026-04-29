/**
 * @file CourseHeader.tsx
 * @description 과목 대시보드 상단 — 학사 정보 + 과목명 + 현재 주차 / D-day
 * @module features/course-dashboard/components/ui
 */

'use client'

import { useTranslations } from 'next-intl'

interface CourseHeaderProps {
  professorName: string | null
  termLabel: string | null
  courseTitle: string | null
  currentWeek: number | null
  examDday: number | null
}

export function CourseHeader({
  professorName,
  termLabel,
  courseTitle,
  currentWeek,
  examDday,
}: CourseHeaderProps) {
  const t = useTranslations()

  // "교수자명 / 학기" eyebrow
  const eyebrowParts = [professorName, termLabel].filter(Boolean) as string[]
  const eyebrow = eyebrowParts.length > 0 ? eyebrowParts.join(' / ') : null

  return (
    <header className="mb-6 flex items-end justify-between gap-6">
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            {eyebrow}
          </p>
        )}
        <h1 className="truncate text-4xl font-black tracking-tight text-gray-900 dark:text-gray-50 md:text-5xl">
          {courseTitle ?? '...'}
        </h1>
      </div>

      <div className="flex shrink-0 items-end gap-8 pb-2">
        {currentWeek != null && (
          <div className="text-right">
            <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">
              {t('courseDashboard.currentWeek')}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              <span className="text-[#6366F1]">{currentWeek}</span>
              <span className="ml-1 text-base text-gray-500 dark:text-gray-400">
                {t('courseDashboard.weekUnit')}
              </span>
            </p>
          </div>
        )}
        {examDday != null && (
          <div className="text-right">
            <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">
              {t('courseDashboard.examDday')}
            </p>
            <p className="text-2xl font-bold text-[#6366F1]">D-{examDday}</p>
          </div>
        )}
      </div>
    </header>
  )
}
