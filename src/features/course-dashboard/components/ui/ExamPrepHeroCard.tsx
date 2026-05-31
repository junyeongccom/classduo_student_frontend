/**
 * @file ExamPrepHeroCard.tsx
 * @description 과목 대시보드 메인 보라 카드 — 시머 + 아케이드 누름 효과.
 *   isLocked 시:
 *     1) 시머 비활성 (광 안 남)
 *     2) 카드 콘텐츠 흐림 + dim 막으로 자물쇠 부각
 *     3) MidTestBox 자물쇠 + X자 4-체인 오버레이 (정적 표시)
 *     4) 호버 시 카드 내부 하단에 안내 메시지 (group-hover fade-in)
 *     5) 클릭 비활성
 * @module features/course-dashboard/components/ui
 * @dependencies next/image, public/midtest/*.png, globals.css mid-* keyframes
 */

'use client'

import Image from 'next/image'

interface ExamPrepHeroCardProps {
  title: string
  subtitle: string
  iconSrc?: string
  onClick: () => void
  ariaLabel?: string
  /** 잠금 상태 — 자물쇠+체인 오버레이 + 클릭 비활성 + 호버 시 lockedTooltip 표시 */
  isLocked?: boolean
  /** 잠금 시 카드 내부 호버 안내 메시지 (예: "6월초부터 이용 가능합니다") */
  lockedTooltip?: string
}

export function ExamPrepHeroCard({
  title,
  subtitle,
  iconSrc = '/기말대비학습아이콘.png',
  onClick,
  ariaLabel,
  isLocked = false,
  lockedTooltip,
}: ExamPrepHeroCardProps) {
  return (
    <button
      type="button"
      onClick={isLocked ? undefined : onClick}
      aria-label={ariaLabel ?? title}
      aria-disabled={isLocked}
      className={`exam-hero group relative mx-auto w-[calc(340.06px*var(--u))] overflow-hidden rounded-[calc(40px*var(--u))] bg-gradient-to-b from-[#8f8df0] to-[#4340bd] px-[calc(20px*var(--u))] py-[calc(16px*var(--u))] text-left text-white md:w-full md:rounded-3xl md:bg-gradient-to-br md:from-[#7C7AEC] md:via-[#6361E0] md:to-[#4F4DD3] md:px-10 md:py-7 ${isLocked ? 'cursor-not-allowed' : ''}`}
    >
      {/* 시머 효과 — 잠금 시 비활성 (광 안 남) */}
      {!isLocked && <span className="exam-hero-shimmer" aria-hidden />}

      {/* 카드 콘텐츠 (아이콘 + 제목 + 부제) — 잠금 시 흐림 */}
      <div className={`relative z-10 flex flex-col items-center gap-[calc(5.88px*var(--u))] md:gap-7 ${isLocked ? 'opacity-30' : ''}`}>
        <div className="flex h-[calc(60px*var(--u))] w-[calc(60px*var(--u))] items-center justify-center md:h-24 md:w-24">
          <Image
            src={iconSrc}
            alt=""
            width={80}
            height={80}
            className="h-[calc(60.27px*var(--u))] w-[calc(49.49px*var(--u))] object-contain md:h-20 md:w-20"
            priority
          />
        </div>
        <div className="flex w-full flex-col items-center gap-[calc(5.88px*var(--u))] md:gap-4">
          <span
            className="relative isolate whitespace-nowrap rounded-full bg-transparent px-[calc(29.4px*var(--u))] py-[calc(9.8px*var(--u))] text-[calc(34.3px*var(--u))] font-bold tracking-tight md:bg-white/25 md:px-12 md:py-4 md:text-3xl"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {title}
          </span>
          <p
            className="whitespace-nowrap text-[calc(14px*var(--u))] font-medium text-white/90 md:text-base"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {subtitle}
          </p>
        </div>
      </div>

      {/* 잠금 시 어두운 막 — 자물쇠 부각용. 자물쇠(z-20) 뒤, 콘텐츠(z-10) 앞. */}
      {isLocked && (
        <div className="pointer-events-none absolute inset-0 z-[15] bg-black/35" aria-hidden />
      )}

      {/* 잠금 오버레이 — 자물쇠 단독. 카드 폭에 맞게 사이즈 키움. */}
      {isLocked && (
        <div
          className="mid-scene pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          data-stage="locked"
          aria-hidden
        >
          <div className="relative flex h-48 w-48 items-center justify-center md:h-72 md:w-72">
            <img
              src="/midtest/자물쇠.png"
              alt=""
              aria-hidden
              draggable={false}
              className="mid-lock w-1/2 object-contain"
            />
          </div>
        </div>
      )}

      {/* 호버 시 카드 내부 하단에 뜨는 안내 메시지 — group-hover 로 fade-in. */}
      {isLocked && lockedTooltip && (
        <div className="pointer-events-none absolute inset-x-4 bottom-3 z-30 flex justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:bottom-5">
          <div className="rounded-lg bg-white/95 px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg backdrop-blur-sm md:text-base">
            {lockedTooltip}
          </div>
        </div>
      )}
    </button>
  )
}
