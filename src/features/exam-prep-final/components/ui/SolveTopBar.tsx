/**
 * @file SolveTopBar.tsx
 * @description 풀이 페이지 상단바 — breadcrumb + 나가기 버튼 (글로벌 헤더 대체)
 * @module features/exam-prep-final/components/ui
 */

'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface SolveTopBarProps {
  courseId: string
  courseTitle: string | null
  /** 현재 회차 라벨 (예: "3주차 02차시 · 유전질환") */
  currentLectureLabel: string
  onExit: () => void
}

export function SolveTopBar({
  courseId,
  courseTitle,
  currentLectureLabel,
  onExit,
}: SolveTopBarProps) {
  const t = useTranslations()

  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 sm:px-6 py-3 dark:border-gray-700 dark:bg-gray-900">
      {/* Mobile: 뒤로 가기(◀) + 현재 회차 라벨만 표시 */}
      <Link
        href={`/studyspace/course/${courseId}/exam-prep`}
        className="flex sm:hidden min-w-0 items-center gap-1 text-sm font-semibold text-gray-900 dark:text-gray-100"
      >
        <ChevronLeft className="h-4 w-4 shrink-0 text-gray-400" />
        <span className="truncate">{currentLectureLabel}</span>
      </Link>

      {/* Desktop: full breadcrumb */}
      <nav className="hidden sm:flex min-w-0 items-center gap-2 text-sm font-medium text-gray-400">
        <Link
          href="/studyspace/home"
          className="transition-colors hover:text-[#6366F1]"
        >
          {t('courseNav.home')}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href={`/studyspace/course/${courseId}`}
          className="truncate transition-colors hover:text-[#6366F1]"
        >
          {courseTitle ?? '...'}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href={`/studyspace/course/${courseId}/exam-prep`}
          className="transition-colors hover:text-[#6366F1]"
        >
          {t('courseNav.examPrep')}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate font-semibold text-gray-900 dark:text-gray-100">
          {currentLectureLabel}
        </span>
      </nav>

      <button
        type="button"
        onClick={onExit}
        className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 sm:px-3.5 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        {t('examPrepFinal.exit')}
      </button>
    </header>
  )
}
