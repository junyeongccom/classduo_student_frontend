/**
 * @file ExamPrepHeroCard.tsx
 * @description 과목 대시보드 메인 보라 카드 — 시머 + 아케이드 누름 효과
 * @module features/course-dashboard/components/ui
 * @dependencies next/image, exam-hero CSS (globals.css)
 */

'use client'

import Image from 'next/image'

interface ExamPrepHeroCardProps {
  title: string
  subtitle: string
  iconSrc?: string
  onClick: () => void
  ariaLabel?: string
}

export function ExamPrepHeroCard({
  title,
  subtitle,
  iconSrc = '/기말대비학습아이콘.png',
  onClick,
  ariaLabel,
}: ExamPrepHeroCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? title}
      className="exam-hero relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#7C7AEC] via-[#6361E0] to-[#4F4DD3] px-4 py-5 text-left text-white md:px-10 md:py-7"
    >
      <span className="exam-hero-shimmer" aria-hidden />
      <div className="relative z-10 flex flex-col items-center gap-4 md:gap-7">
        <div className="flex h-16 w-16 items-center justify-center md:h-24 md:w-24">
          <Image
            src={iconSrc}
            alt=""
            width={80}
            height={80}
            className="h-12 w-12 object-contain md:h-20 md:w-20"
            priority
          />
        </div>
        <div className="flex w-full flex-col items-center gap-2 md:gap-4">
          <span className="relative isolate whitespace-nowrap rounded-full bg-white/25 px-5 py-2 text-lg font-bold tracking-tight md:px-12 md:py-4 md:text-3xl">
            {title}
          </span>
          <p className="text-xs font-medium text-white/90 md:text-base">{subtitle}</p>
        </div>
      </div>
    </button>
  )
}
