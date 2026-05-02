/**
 * @file GradeProgressCard.tsx
 * @description 사용자명 + 등급 뱃지 + 다음 등급까지 XP + 진행률 바
 * @module features/course-dashboard/components/ui
 * @dependencies next/image, domain/grade
 */

'use client'

import Image from 'next/image'
import { resolveGradeProgress } from '../../domain/grade'

interface GradeProgressCardProps {
  displayName: string
  xp: number
}

export function GradeProgressCard({ displayName, xp }: GradeProgressCardProps) {
  const { tier, xpToNext, progressRatio } = resolveGradeProgress(xp)
  const isMax = !Number.isFinite(tier.max)

  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)] dark:bg-gray-900">
      <header className="mb-4">
        <h2
          className="text-xl font-bold text-gray-900 dark:text-gray-50"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          {displayName} 님의 예상 학점
        </h2>
      </header>

      <div className="flex items-center gap-5">
        {/* 등급 뱃지 — Figma 비율로 키움 */}
        <div className="flex h-24 w-24 shrink-0 items-center justify-center">
          <Image
            src={tier.badgeSrc}
            alt={`${tier.key} 등급 뱃지`}
            width={96}
            height={96}
            className="h-full w-full object-contain"
          />
        </div>

        {/* 라벨 + 큰 숫자 + 진행률 바 */}
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <span
              className="text-base font-medium text-gray-500"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              {isMax ? '최고 등급 도달!' : '다음 등급까지...'}
            </span>
            <span
              className="text-6xl font-extrabold leading-none text-gray-900 dark:text-gray-50"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              {isMax ? xp.toLocaleString() : xpToNext.toLocaleString()}
            </span>
            <span className="text-lg font-bold text-gray-500">XP</span>
          </div>

          {/* progress bar — Figma 두께 */}
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.round(progressRatio * 100)}%`,
                backgroundColor: tier.color,
              }}
            />
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-gray-400">
        실제 생명과학의 세계 학점이 아닙니다. Aplus 서비스에서만 사용되는 등급입니다.
      </p>
    </section>
  )
}
