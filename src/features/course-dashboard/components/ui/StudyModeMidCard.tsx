/**
 * @file StudyModeMidCard.tsx
 * @description 회차별/대화형 학습 공용 중간 카드 — 좌측 텍스트 + 우측 화살표
 * @module features/course-dashboard/components/ui
 * @dependencies lucide-react
 */

'use client'

import { ChevronRight } from 'lucide-react'

interface StudyModeMidCardProps {
  eyebrow: string
  title: string
  description?: string
  footer?: string
  onClick: () => void
  ariaLabel?: string
}

export function StudyModeMidCard({
  eyebrow,
  title,
  description,
  footer,
  onClick,
  ariaLabel,
}: StudyModeMidCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? title}
      className="group flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-white px-8 py-5 text-left shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#383698]/30 hover:shadow-[0_6px_20px_rgba(56,54,152,0.12)] active:translate-y-0 dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          {eyebrow}
        </span>
        <span className="text-3xl font-bold text-gray-900 dark:text-gray-50">
          {title}
        </span>
        {description && (
          <span className="mt-1 text-base text-gray-500 dark:text-gray-400">
            {description}
          </span>
        )}
        {footer && (
          <span className="mt-2 text-sm font-medium text-[#383698]">
            {footer}
          </span>
        )}
      </div>
      <ChevronRight className="h-7 w-7 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-[#383698]" />
    </button>
  )
}
