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
      className="exam-hero relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#7C7AEC] via-[#6361E0] to-[#4F4DD3] px-8 py-10 text-left text-white"
    >
      <span className="exam-hero-shimmer" aria-hidden />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center">
          <Image
            src={iconSrc}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 object-contain"
            priority
          />
        </div>
        <div className="flex w-full flex-col items-center gap-3">
          <span className="rounded-full bg-white/25 px-10 py-3 text-2xl font-bold tracking-tight backdrop-blur-sm">
            {title}
          </span>
          <p className="text-sm font-medium text-white/90">{subtitle}</p>
        </div>
      </div>
    </button>
  )
}
