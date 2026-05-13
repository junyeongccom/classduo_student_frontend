/**
 * @file GradeProgressCard.tsx
 * @description 사용자명 + 백엔드 등급 뱃지 + 다음 등급까지 XP + 진행률 바 (컴팩트 버전)
 * @module features/course-dashboard/components/ui
 * @dependencies next/image, domain/grade, RANK_THRESHOLDS
 */

'use client'

import Image from 'next/image'
import { Play } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { resolveGradeTier } from '../../domain/grade'
import { RANK_THRESHOLDS } from '@/features/exam-prep-final/components/result-overlay/utils'

interface GradeProgressCardProps {
  displayName: string
  /** 백엔드 누적 total_xp (master_xp + stamp_xp) */
  xp: number
  /** 백엔드 등급 코드 (F~A+) */
  rankCode: string
  /** 과목명 — 디스클레이머 표시용 (예: "생명과학의 세계") */
  courseTitle?: string
  /** 우측 화살표 버튼 클릭 시 기말 대비 학습 진입 핸들러 */
  onStartExamPrep?: () => void
}

export function GradeProgressCard({
  displayName,
  xp,
  rankCode,
  courseTitle,
  onStartExamPrep,
}: GradeProgressCardProps) {
  const t = useTranslations()
  // 백엔드 RANK_THRESHOLDS 기반 진행률 계산.
  const step = RANK_THRESHOLDS.find((t) => t.from === rankCode)
  const isMax = !step
  const prevTotal = RANK_THRESHOLDS.find((t) => t.to === rankCode)?.total ?? 0
  const nextTotal = step?.total ?? xp
  const span = nextTotal - prevTotal
  const earned = Math.max(0, xp - prevTotal)
  const progressRatio = span > 0 ? Math.min(1, earned / span) : 0
  const xpToNext = isMax ? 0 : Math.max(0, nextTotal - xp)

  // 등급 → 뱃지 / 컬러
  const tier = resolveGradeTier(rankCode)

  return (
    <section className="rounded-2xl bg-white px-8 py-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)] dark:bg-gray-900">
      <header className="mb-3">
        <h2
          className="text-xl font-bold text-gray-900 dark:text-gray-50"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          {t('courseDashboard.expectedGradeTitle', { name: displayName })}
        </h2>
      </header>

      <div className="flex items-center gap-4">
        {/* 등급 뱃지 — 컴팩트 (h-32→h-24) */}
        <div className="flex h-24 w-24 shrink-0 items-center justify-center">
          <Image
            src={tier.badgeSrc}
            alt={t('courseDashboard.rankBadgeAlt', { rank: rankCode })}
            width={96}
            height={96}
            className="h-full w-full object-contain"
          />
        </div>

        {/* 라벨 + 큰 숫자 + 진행률 바 */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* 1행: 현재 XP big number / 다음 등급 임계 (X / Y XP) */}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span
              className="text-3xl font-bold leading-none text-gray-900 dark:text-gray-50 md:text-5xl"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              {xp.toLocaleString()}
            </span>
            <span
              className="text-base font-bold text-gray-400 md:text-xl"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              / {isMax ? '∞' : nextTotal.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-gray-500 md:text-base">XP</span>
          </div>

          {/* 2행: 다음 등급 까지 N XP */}
          <span
            className="text-xs font-medium text-gray-500"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {isMax
              ? t('courseDashboard.maxRankReached')
              : t('courseDashboard.xpToNext', { xp: xpToNext.toLocaleString() })}
          </span>

          {/* progress bar — 너무 길어 보이지 않게 max-width 로 제한 (이슈 13) */}
          <div className="h-2.5 w-full max-w-[260px] overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.round(progressRatio * 100)}%`,
                backgroundColor: tier.color,
              }}
            />
          </div>
        </div>

        {/* 우측 — 기말 대비 학습 시작 버튼 (CTA) */}
        {onStartExamPrep && (
          <button
            type="button"
            onClick={onStartExamPrep}
            aria-label={t('courseDashboard.startExamPrepAria')}
            className="ml-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#6366F1] text-white shadow-md shadow-[#6366F1]/30 transition-all hover:scale-105 hover:bg-[#4F46E5] active:scale-95"
          >
            <Play className="h-6 w-6 translate-x-[1px] fill-current" />
          </button>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-gray-400">
        {t('courseDashboard.gradeDisclaimer', { course: courseTitle ?? '' })}
      </p>
    </section>
  )
}
