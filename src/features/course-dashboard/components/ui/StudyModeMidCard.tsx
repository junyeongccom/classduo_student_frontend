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
      className="group mx-auto flex h-[calc(121.52px*var(--u))] w-[calc(314.58px*var(--u))] items-center justify-between rounded-[calc(20px*var(--u))] border-0 bg-white px-[calc(19.6px*var(--u))] text-left shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 active:translate-y-0 md:h-auto md:w-full md:rounded-2xl md:border md:border-gray-100 md:px-8 md:py-5 md:hover:border-[#383698]/30 md:hover:shadow-[0_6px_20px_rgba(56,54,152,0.12)] dark:border-gray-800 dark:bg-gray-900"
      style={{ fontFamily: 'Pretendard, sans-serif' }}
    >
      <div className="flex flex-col gap-[calc(4.9px*var(--u))] md:gap-1.5">
        <span className="text-[calc(11.76px*var(--u))] font-semibold uppercase tracking-wide text-[#ababab] md:text-sm md:text-gray-400">
          {eyebrow}
        </span>
        <span className="text-[calc(29.4px*var(--u))] font-bold text-gray-900 md:text-3xl dark:text-gray-50">
          {title}
        </span>
        {description && (
          <span className="mt-1 text-[calc(14.7px*var(--u))] text-gray-500 md:text-base dark:text-gray-400">
            {description}
          </span>
        )}
        {footer && (
          <span className="mt-2 text-[calc(12px*var(--u))] font-medium text-[#383698] md:text-sm">
            {footer}
          </span>
        )}
      </div>
      <ChevronRight className="h-[calc(42.14px*var(--u))] w-[calc(42.14px*var(--u))] shrink-0 text-gray-800 transition-transform group-hover:translate-x-1 group-hover:text-[#383698] md:h-7 md:w-7 md:text-gray-300" />
    </button>
  )
}
